import { createBooking } from "@/lib/booking/engine";
import { jsonError, jsonOk } from "@/lib/booking/auth";

type Body = {
  quoteId?: string;
  guest?: { name?: string; email?: string; phone?: string; country?: string };
  requests?: string;
  idempotencyKey?: string;
  channel?: string;
};

/** Booking channels a client may declare. Anything else falls back to website. */
const ALLOWED_CHANNELS = new Set(["website", "whatsapp"]);

/** POST /api/booking/create — creates a pending reservation + payment hold. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid request body.");
  }

  if (!body.quoteId || !body.guest) {
    return jsonError("VALIDATION_ERROR", "quoteId and guest details are required.");
  }

  const channel = ALLOWED_CHANNELS.has(String(body.channel ?? ""))
    ? String(body.channel)
    : "website";

  const result = await createBooking({
    quoteId: String(body.quoteId),
    guest: {
      name: String(body.guest.name ?? ""),
      email: String(body.guest.email ?? ""),
      phone: String(body.guest.phone ?? ""),
      country: body.guest.country ? String(body.guest.country) : undefined,
    },
    requests: body.requests ? String(body.requests) : undefined,
    bookingSource: channel as "website" | "whatsapp",
    // WhatsApp reservations are confirmed by staff in chat, so the room stays
    // held longer than the 30-minute online-payment window.
    holdMinutes: channel === "whatsapp" ? 120 : 30,
    idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : undefined,
  });

  if (!result.ok) return jsonError(result.error, result.message, result.error === "ROOM_UNAVAILABLE" ? 409 : 400);
  return jsonOk(result.data, 201);
}
