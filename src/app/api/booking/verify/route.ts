import { verifyTransaction } from "@/lib/booking/paystack";
import {
  verifyAndConfirmPayment,
  getReservationByReference,
  serverPaymentByGatewayRef,
} from "@/lib/booking/engine";
import { jsonError, jsonOk } from "@/lib/booking/auth";
import type { Reservation } from "@/lib/booking/types";

/**
 * POST /api/booking/verify
 * Body: { reference } — either the Paystack transaction reference
 * ("<BKS-...>-P<hex>") or the Banky reservation reference ("BKS-...").
 *
 * The browser's payment result is NEVER trusted: this route re-verifies the
 * transaction with Paystack, checks amount & currency, then confirms the
 * reservation. Idempotent — safe to call multiple times.
 */
export async function POST(req: Request) {
  let body: { reference?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid request body.");
  }
  if (!body.reference) return jsonError("VALIDATION_ERROR", "Payment reference is required.");

  const input = String(body.reference).trim();

  // Resolve the reservation either way.
  let reservation: Reservation | null;
  let paystackRef: string | null;
  if (input.includes("-P")) {
    // Paystack reference: "<BKS-...>-P<hex>"
    paystackRef = input;
    reservation = await getReservationByReference(input.split("-P")[0]);
  } else {
    // Banky reference: resolve the latest pending/processing payment intent.
    reservation = await getReservationByReference(input.toUpperCase());
    paystackRef = reservation ? await serverPaymentByGatewayRef(reservation.id) : null;
  }
  if (!reservation) return jsonError("RESERVATION_NOT_FOUND", "Reservation not found for this payment.", 404);

  // If already confirmed in Firestore (e.g. from webhook, previous verification, or revisit), return immediately!
  if (reservation.status === "confirmed" && reservation.paymentStatus === "successful") {
    return jsonOk({
      status: reservation.status,
      paymentStatus: reservation.paymentStatus,
      reference: reservation.reference,
      amountPaid: reservation.pricing.amountPaid,
      balanceDue: reservation.pricing.balanceDue,
      reservation: {
        reference: reservation.reference,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        guestPhone: reservation.guestPhone,
        roomTypeName: reservation.roomTypeName,
        assignedRoomNumber: reservation.assignedRoomNumber,
        ratePlanName: reservation.ratePlanName,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        nights: reservation.nights,
        adults: reservation.adults,
        children: reservation.children,
        status: reservation.status,
        paymentStatus: reservation.paymentStatus,
        pricing: reservation.pricing,
        rooms: reservation.rooms ?? [],
        cancellationPolicy: reservation.cancellationPolicy,
        cancellationDeadline: reservation.cancellationDeadline,
        requests: reservation.requests,
        createdAt: reservation.createdAt,
      },
    });
  }

  if (!paystackRef) {
    return jsonError(
      "PAYMENT_PENDING",
      "No pending payment found for this reference. If you completed payment, wait a moment and try again.",
      202,
    );
  }

  try {
    const v = await verifyTransaction(paystackRef);

    if (v.status === "failed" || v.status === "abandoned") {
      return jsonError("PAYMENT_FAILED", "The payment was not completed. You can try again from your booking.", 402);
    }
    if (v.status !== "success") {
      return jsonError("PAYMENT_PENDING", "The payment is still processing. This page will update shortly.", 202);
    }
    if (v.currency !== "NGN") {
      return jsonError("PAYMENT_FAILED", "Unexpected payment currency.", 400);
    }

    const result = await verifyAndConfirmPayment({
      reservationId: reservation.id,
      paystackReference: v.reference,
      amountPaid: v.amount,
      channel: v.channel,
      paidAt: v.paidAt,
    });
    if (!result.ok) return jsonError(result.error, result.message, 400);

    const updatedRes = await getReservationByReference(reservation.reference);

    const effectivePaid = updatedRes ? updatedRes.pricing.amountPaid : (v.amount > 0 ? v.amount : reservation.pricing.grandTotal);
    const effectiveBalance = updatedRes ? updatedRes.pricing.balanceDue : 0;

    return jsonOk({
      status: result.data.status,
      paymentStatus: result.data.paymentStatus,
      reference: reservation.reference,
      amountPaid: effectivePaid,
      balanceDue: effectiveBalance,
      reservation: updatedRes
        ? {
            reference: updatedRes.reference,
            guestName: updatedRes.guestName,
            guestEmail: updatedRes.guestEmail,
            guestPhone: updatedRes.guestPhone,
            roomTypeName: updatedRes.roomTypeName,
            assignedRoomNumber: updatedRes.assignedRoomNumber,
            ratePlanName: updatedRes.ratePlanName,
            checkIn: updatedRes.checkIn,
            checkOut: updatedRes.checkOut,
            nights: updatedRes.nights,
            adults: updatedRes.adults,
            children: updatedRes.children,
            status: updatedRes.status,
            paymentStatus: updatedRes.paymentStatus,
            pricing: updatedRes.pricing,
            rooms: updatedRes.rooms ?? [],
            cancellationPolicy: updatedRes.cancellationPolicy,
            cancellationDeadline: updatedRes.cancellationDeadline,
            requests: updatedRes.requests,
            createdAt: updatedRes.createdAt,
          }
        : undefined,
    });
  } catch (e) {
    console.error("verify failed:", e);
    return jsonError("PAYMENT_FAILED", "Payment verification failed. Please contact support with your reference.", 502);
  }
}
