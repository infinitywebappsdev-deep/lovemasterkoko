import { getReservationByReference } from "@/lib/booking/engine";
import { jsonError, jsonOk } from "@/lib/booking/auth";
import type { Reservation } from "@/lib/booking/types";

/**
 * GET /api/booking/reservation?ref=BKS-2026-000001
 * Data-minimized guest lookup: requires the full reference (capability),
 * returns only non-sensitive fields. Staff APIs provide full access.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref");
  if (!ref) return jsonError("VALIDATION_ERROR", "Reservation reference is required.");

  const r = await getReservationByReference(ref.trim().toUpperCase());
  if (!r) return jsonError("RESERVATION_NOT_FOUND", "No reservation found with that reference.", 404);

  const pub: Partial<Reservation> = {
    reference: r.reference,
    guestName: r.guestName,
    guestEmail: r.guestEmail,
    guestPhone: r.guestPhone,
    roomTypeName: r.roomTypeName,
    assignedRoomNumber: r.assignedRoomNumber,
    ratePlanName: r.ratePlanName,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    nights: r.nights,
    adults: r.adults,
    children: r.children,
    status: r.status,
    paymentStatus: r.paymentStatus,
    pricing: r.pricing,
    rooms: r.rooms ?? [],
    cancellationPolicy: r.cancellationPolicy,
    cancellationDeadline: r.cancellationDeadline,
    requests: r.requests,
    createdAt: r.createdAt,
  };
  return jsonOk(pub);
}
