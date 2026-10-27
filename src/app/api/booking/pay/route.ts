import { initiatePayment } from "@/lib/booking/paystack";
import { getReservationById, isRoomAvailable, refreshHoldForReservation } from "@/lib/booking/engine";
import { serverDb, COL } from "@/lib/booking/server";
import { jsonError, jsonOk } from "@/lib/booking/auth";
import { isPaystackActive } from "@/lib/settings/payment";

/**
 * POST /api/booking/pay
 * Body: { reservationId }
 * Returns a Paystack authorization URL for the reservation's deposit.
 * The amount is taken from the reservation record — never from the client.
 */
export async function POST(req: Request) {
  // Master site-wide check: is Paystack enabled by hotel administration?
  const paystackActive = await isPaystackActive();
  if (!paystackActive) {
    return jsonError(
      "PAYSTACK_DISABLED",
      "Online Paystack payment is currently paused across the hotel. Please complete your reservation via Direct Bank Transfer or settle at the front desk.",
      403
    );
  }

  let body: { reservationId?: string; origin?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid request body.");
  }
  if (!body.reservationId) return jsonError("VALIDATION_ERROR", "reservationId is required.");

  const reservation = await getReservationById(String(body.reservationId));
  if (!reservation) return jsonError("RESERVATION_NOT_FOUND", "Reservation not found.", 404);
  if (reservation.paymentStatus === "successful") {
    return jsonError("INVALID_BOOKING_STATE", "This reservation is already paid.", 409);
  }
  if (reservation.status === "cancelled") {
    return jsonError("INVALID_BOOKING_STATE", "This reservation was cancelled.", 409);
  }

  // Pre-payment capacity verification:
  // If the initial 30-minute hold has expired, check whether the room is still available.
  const isHoldExpired =
    !reservation.holdExpiresAt || new Date(reservation.holdExpiresAt).getTime() < Date.now();

  if (isHoldExpired) {
    const requiredRooms = reservation.roomCount || (reservation.rooms ? reservation.rooms.length : 1);
    const stillAvailable = await isRoomAvailable(
      reservation.roomTypeId,
      reservation.checkIn,
      reservation.checkOut,
      requiredRooms,
      reservation.id,
    );

    if (!stillAvailable) {
      return jsonError(
        "ROOM_UNAVAILABLE",
        "Your 30-minute reservation hold has expired and this room category is now fully booked for your dates. Please choose different dates or select another room type.",
        409,
      );
    }

    // Still available: refresh the hold for 20 minutes to safeguard the guest during checkout
    await refreshHoldForReservation(reservation.id, 20 * 60 * 1000);
  }

  const amount = reservation.pricing.grandTotal || reservation.pricing.depositDue;
  if (amount <= 0) return jsonError("VALIDATION_ERROR", "Nothing to pay for this reservation.");

  const origin = body.origin || new URL(req.url).origin;
  const reference = `${reservation.reference}-P${Date.now().toString(36).toUpperCase()}`;

  try {
    const init = await initiatePayment({
      email: reservation.guestEmail,
      amountKobo: amount,
      reference,
      callbackUrl: `${origin}/booking/confirmation?ref=${encodeURIComponent(reservation.reference)}`,
      metadata: {
        reservationId: reservation.id,
        reference: reservation.reference,
        guestName: reservation.guestName,
      },
    });

    // Record the intended transaction (idempotency / reconciliation)
    await serverDb()
      .collection(COL.payments)
      .add({
        reservationId: reservation.id,
        reference: reservation.reference,
        gateway: "paystack",
        gatewayReference: reference,
        amount,
        currency: reservation.pricing.currency,
        status: "processing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    return jsonOk({ authorizationUrl: init.authorizationUrl, reference, amount });
  } catch (e) {
    console.error("pay init failed:", e);
    return jsonError("PAYMENT_FAILED", e instanceof Error ? e.message : "Could not start the payment. Please try again.", 502);
  }
}
