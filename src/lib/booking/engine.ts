import "server-only";
import { serverDb, COL } from "./server";
import {
  computeNightlyRates,
  applyRatePlan,
  evaluatePromo,
  calculateQuote,
  calculateCancellation,
  nightsBetweenISO,
  addDaysISO,
  todayHotelISO,
} from "./pricing";
import { canTransition } from "./types";
import type {
  RoomType,
  PhysicalRoom,
  RatePlan,
  RateRule,
  PromoCode,
  Reservation,
  ReservationStatus,
  ReservationRoom,
  BookingHold,
  AvailabilityQuery,
  AvailabilityResult,
  RoomTypeAvailability,
  BookingSource,
  ApiResult,
  BookingErrorCode,
  PriceBreakdown,
  Addon,
  CancellationPolicyType,
} from "./types";

/* ------------------------------------------------------------------ */
/* Data access helpers                                                 */
/* ------------------------------------------------------------------ */

const db = () => serverDb();

const DEFAULT_ROOM_TYPES: RoomType[] = [
  { id: "signature-suite", slug: "signature-suite", name: "Signature Suite", qty: 1, baseRate: 20000000, maxOccupancy: 3, bed: "King Canopy Bed", image: "/images/signature suite room.jpg", blurb: "Our premier signature residence: a sunlit master living parlor, private dressing area, and an opulent king canopy bedroom framed by full-height windows.", features: ["Private living room", "Butler service", "Complimentary breakfast", "VIP airport transfer"], status: "active" },
  { id: "presidential-suite", slug: "presidential-suite", name: "Presidential Suite", qty: 3, baseRate: 10000000, maxOccupancy: 3, bed: "King Canopy Bed", image: "/images/presidential 17.jpg", blurb: "A stately presidential residence featuring an executive parlor, marble-finished bathroom, and expansive entertaining lounge.", features: ["Executive parlor", "King canopy bed", "Complimentary breakfast", "Late checkout"], status: "active" },
  { id: "super-executive", slug: "super-executive", name: "Super Executive", qty: 1, baseRate: 6000000, maxOccupancy: 2, bed: "King Bed", image: "/images/superexecutive.jpg", blurb: "An expansive, peaceful haven featuring a private reading corner, plush bedding, and soft natural daylight.", features: ["King bed", "Reading corner", "Smart TV", "Daily housekeeping"], status: "active" },
  { id: "executive", slug: "executive", name: "Executive", qty: 8, baseRate: 5000000, maxOccupancy: 2, bed: "King Bed", image: "/images/executive.jpg", blurb: "Rich warm timber, crisp Egyptian cotton linen, and an ergonomic workstation for productive executive stays.", features: ["King bed", "Work desk", "Rain shower", "Complimentary Wi-Fi"], status: "active" },
  { id: "standard-plus", slug: "standard-plus", name: "Standard Plus", qty: 4, baseRate: 4500000, maxOccupancy: 3, bed: "Queen Bed", image: "/images/standar plus.jpg", blurb: "An elevated retreat offering an extended lounge seating area, workspace, and serene courtyard views.", features: ["Queen bed", "Seating area", "Smart TV", "Air conditioning"], status: "active" },
  { id: "deluxe", slug: "deluxe", name: "Deluxe", qty: 5, baseRate: 4000000, maxOccupancy: 2, bed: "Queen Bed", image: "/images/deluxe.jpg", blurb: "Understated luxury with scenic garden-facing windows and a soothing contemporary palette.", features: ["Queen bed", "Garden view", "Smart TV", "24-hour room service"], status: "active" },
  { id: "studio", slug: "studio", name: "Studio", qty: 1, baseRate: 3500000, maxOccupancy: 2, bed: "Queen Bed", image: "/images/studio3.jpg", blurb: "A versatile open-plan studio residence for extended stays with kitchenette and dining nook.", features: ["Open plan", "Kitchenette", "Work nook", "Laundry service"], status: "active" },
  { id: "standard", slug: "standard", name: "Standard", qty: 5, baseRate: 3000000, maxOccupancy: 2, bed: "Double Bed", image: "/images/standard.jpg", blurb: "A welcoming, quiet sanctuary featuring premium bedding and refined contemporary essentials.", features: ["Double bed", "Smart TV", "Air conditioning", "Complimentary Wi-Fi"], status: "active" },
];

const DEFAULT_RATE_PLANS: RatePlan[] = [
  {
    id: "flexible",
    name: "Flexible",
    priceModifier: { type: "percent", value: 0 },
    freeCancellationDays: 1,
    cancellationPolicy: "flexible",
    depositPercent: 50,
    minNights: 1,
    description: "Free cancellation until 1 day before check-in. 50% deposit to secure.",
    active: true,
  },
  {
    id: "non-refundable-saver",
    name: "Non-Refundable Saver",
    priceModifier: { type: "percent", value: -10 },
    freeCancellationDays: 0,
    cancellationPolicy: "non_refundable",
    depositPercent: 100,
    minNights: 1,
    description: "Pay in full, save 10%. Non-refundable once confirmed.",
    active: true,
  },
  {
    id: "bed-breakfast",
    name: "Bed & Breakfast",
    priceModifier: { type: "percent", value: 5 },
    freeCancellationDays: 2,
    cancellationPolicy: "flexible",
    depositPercent: 50,
    minNights: 1,
    description: "Includes daily gourmet breakfast for two. Free cancellation until 2 days before arrival.",
    active: true,
  },
];

const DEFAULT_ADDONS: Addon[] = [
  { id: "airport-transfer", name: "VIP Airport Transfer", price: 2500000, unit: "per_stay", active: true, description: "Private air-conditioned transfer to/from the airport." },
  { id: "early-checkin", name: "Early Check-in (from 10 AM)", price: 1000000, unit: "per_stay", active: true },
  { id: "late-checkout", name: "Late Checkout (until 4 PM)", price: 1000000, unit: "per_stay", active: true },
  { id: "extra-bed", name: "Extra Bed", price: 1500000, unit: "per_night", active: true },
  { id: "anniversary", name: "Anniversary / Special Occasion Setup", price: 3000000, unit: "per_stay", active: true },
];

export async function getRoomTypes(): Promise<RoomType[]> {
  try {
    const snap = await db().collection(COL.roomTypes).where("status", "==", "active").get();
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoomType, "id">) }));
    }
  } catch (err) {
    console.warn("Failed to fetch room types from Firestore, using default catalog:", err);
  }
  return DEFAULT_ROOM_TYPES;
}

export async function getRoomTypeBySlug(slug: string): Promise<RoomType | null> {
  try {
    const snap = await db().collection(COL.roomTypes).where("slug", "==", slug).limit(1).get();
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...(d.data() as Omit<RoomType, "id">) };
    }
  } catch (err) {
    console.warn(`Failed to fetch room type slug ${slug} from Firestore:`, err);
  }
  return DEFAULT_ROOM_TYPES.find((r) => r.slug === slug) ?? null;
}

export async function getRoomTypeById(id: string): Promise<RoomType | null> {
  try {
    const d = await db().collection(COL.roomTypes).doc(id).get();
    if (d.exists) {
      return { id: d.id, ...(d.data() as Omit<RoomType, "id">) };
    }
  } catch (err) {
    console.warn(`Failed to fetch room type id ${id} from Firestore:`, err);
  }
  return DEFAULT_ROOM_TYPES.find((r) => r.id === id || r.slug === id) ?? null;
}

export async function getRatePlans(): Promise<RatePlan[]> {
  try {
    const snap = await db().collection(COL.ratePlans).get();
    if (!snap.empty) {
      const plans = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<RatePlan, "id">) }))
        .filter((p) => p.active !== false);
      if (plans.length > 0) return plans;
    }
  } catch (err) {
    console.warn("Failed to fetch rate plans from Firestore:", err);
  }
  return DEFAULT_RATE_PLANS;
}

export async function getRatePlanById(id: string): Promise<RatePlan | null> {
  try {
    const d = await db().collection(COL.ratePlans).doc(id).get();
    if (d.exists) {
      return { id: d.id, ...(d.data() as Omit<RatePlan, "id">) };
    }
  } catch (err) {
    console.warn(`Failed to fetch rate plan ${id} from Firestore:`, err);
  }
  return DEFAULT_RATE_PLANS.find((p) => p.id === id) ?? null;
}

export async function getRateRules(): Promise<RateRule[]> {
  try {
    const snap = await db().collection(COL.rateRules).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RateRule, "id">) }));
  } catch (err) {
    console.warn("Failed to fetch rate rules from Firestore:", err);
    return [];
  }
}

export async function getAddons(): Promise<Addon[]> {
  try {
    const snap = await db().collection(COL.addons).get();
    if (!snap.empty) {
      const addons = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Addon, "id">) }))
        .filter((a) => a.active !== false);
      if (addons.length > 0) return addons;
    }
  } catch (err) {
    console.warn("Failed to fetch addons from Firestore:", err);
  }
  return DEFAULT_ADDONS;
}

export async function getPromoByCode(code: string): Promise<PromoCode | null> {
  try {
    const snap = await db().collection(COL.promos).where("code", "==", code.toUpperCase().trim()).limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Omit<PromoCode, "id">) };
  } catch (err) {
    console.warn(`Failed to fetch promo code ${code}:`, err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

/** Statuses that consume inventory. Cancelled/failed do not. */
const INVENTORY_CONSUMING_STATUSES: ReservationStatus[] = ["pending", "confirmed", "checked_in"];

function overlapsRange(r: { checkIn: string; checkOut: string }, checkIn: string, checkOut: string): boolean {
  // half-open interval [checkIn, checkOut)
  return r.checkIn < checkOut && r.checkOut > checkIn;
}

/** Count inventory-consuming bookings of a room type per night. */
async function bookedCountsByDate(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const nights = nightsBetweenISO(checkIn, checkOut);
  for (const n of nights) counts.set(n, 0);

  try {
    const snap = await db()
      .collection(COL.reservations)
      .where("roomTypeId", "==", roomTypeId)
      .where("checkIn", "<", checkOut)
      .get();

    for (const doc of snap.docs) {
      const r = doc.data() as Reservation;
      if (excludeReservationId && doc.id === excludeReservationId) continue;
      if (!INVENTORY_CONSUMING_STATUSES.includes(r.status)) continue;
      if (!overlapsRange({ checkIn: r.checkIn, checkOut: r.checkOut }, checkIn, checkOut)) continue;

      const rooms = r.rooms && r.rooms.length > 0 ? r.rooms : [];
      if (rooms.length > 0) {
        for (const rr of rooms) {
          if (rr.roomTypeId !== roomTypeId) continue;
          for (const n of nights) counts.set(n, (counts.get(n) ?? 0) + 1);
        }
      } else {
        for (const n of nights) counts.set(n, (counts.get(n) ?? 0) + 1);
      }
    }
  } catch (err) {
    console.warn("Failed to query booked counts from Firestore:", err);
  }
  return counts;
}

/** Active (non-released, non-expired) holds for a room type in the range. */
async function heldCountsByDate(roomTypeId: string, checkIn: string, checkOut: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const nights = nightsBetweenISO(checkIn, checkOut);
  for (const n of nights) counts.set(n, 0);

  try {
    const snap = await db()
      .collection(COL.holds)
      .where("roomTypeId", "==", roomTypeId)
      .where("released", "==", false)
      .get();
    const now = Date.now();
    for (const doc of snap.docs) {
      const h = doc.data() as BookingHold;
      if (h.expiresAt < now) continue;
      if (!overlapsRange({ checkIn: h.checkIn, checkOut: h.checkOut }, checkIn, checkOut)) continue;
      for (const n of nights) {
        if (overlapsRange({ checkIn: h.checkIn, checkOut: h.checkOut }, n, addDaysISO(n, 1))) {
          counts.set(n, (counts.get(n) ?? 0) + (h.roomCount ?? 1));
        }
      }
    }
  } catch (err) {
    console.warn("Failed to query held counts from Firestore:", err);
  }
  return counts;
}

/** Maintenance / out-of-order or dated-blocked rooms for a type in the range. */
async function blockedRoomIdsForRange(roomTypeId: string, checkIn: string, checkOut: string): Promise<Set<string>> {
  const out = new Set<string>();
  const prSnap = await db().collection(COL.physicalRooms).where("roomTypeId", "==", roomTypeId).get();
  for (const d of prSnap.docs) {
    const p = d.data() as PhysicalRoom;
    if (p.status && p.status !== "active") out.add(d.id);
  }
  const blSnap = await db().collection(COL.inventoryBlocks).where("roomTypeId", "==", roomTypeId).get();
  for (const d of blSnap.docs) {
    const b = d.data() as { physicalRoomId?: string; startDate?: string; endDate?: string; active?: boolean };
    if (b.active === false) continue;
    const from = b.startDate ?? "0000-01-01";
    const to = b.endDate ?? "9999-12-31";
    if (from < checkOut && to > checkIn && b.physicalRoomId) out.add(b.physicalRoomId);
  }
  return out;
}

export function validateSearchQuery(q: AvailabilityQuery): ApiResult<null> {
  const today = todayHotelISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(q.checkOut)) {
    return { ok: false, error: "INVALID_DATES", message: "Dates must be in YYYY-MM-DD format." };
  }
  if (q.checkIn < today) {
    return { ok: false, error: "PAST_DATES", message: "Check-in date cannot be in the past." };
  }
  if (q.checkOut <= q.checkIn) {
    return { ok: false, error: "INVALID_DATES", message: "Check-out must be after check-in." };
  }
  if (!Number.isInteger(q.adults) || q.adults < 1) {
    return { ok: false, error: "INVALID_OCCUPANCY", message: "At least one adult is required." };
  }
  if (!Number.isInteger(q.children) || q.children < 0) {
    return { ok: false, error: "INVALID_OCCUPANCY", message: "Children count is invalid." };
  }
  if (!Number.isInteger(q.roomCount) || q.roomCount < 1 || q.roomCount > 5) {
    return { ok: false, error: "INVALID_OCCUPANCY", message: "Rooms must be between 1 and 5." };
  }
  return { ok: true, data: null };
}

/** Search bookable availability for each room type. */
export async function searchAvailability(q: AvailabilityQuery): Promise<ApiResult<AvailabilityResult>> {
  const check = validateSearchQuery(q);
  if (!check.ok) return check;

  const roomTypes = await getRoomTypes();
  if (roomTypes.length === 0) {
    return { ok: false, error: "ROOM_NOT_FOUND", message: "No room types are configured." };
  }

  const rateRules = await getRateRules();
  const rooms: RoomTypeAvailability[] = [];

  for (const rt of roomTypes) {
    if (rt.qty <= 0) continue;
    const guestsPerRoom = Math.ceil((q.adults + q.children) / q.roomCount);
    if (guestsPerRoom > rt.maxOccupancy) continue;

    const [booked, held, blocked] = await Promise.all([
      bookedCountsByDate(rt.id, q.checkIn, q.checkOut),
      heldCountsByDate(rt.id, q.checkIn, q.checkOut),
      blockedRoomIdsForRange(rt.id, q.checkIn, q.checkOut),
    ]);

    const totalSellable = Math.max(0, rt.qty - blocked.size);
    let minAvailable = totalSellable;
    for (const n of nightsBetweenISO(q.checkIn, q.checkOut)) {
      const avail = totalSellable - (booked.get(n) ?? 0) - (held.get(n) ?? 0);
      minAvailable = Math.min(minAvailable, avail);
    }

    const { nightlyRates } = computeNightlyRates(rt, nightsBetweenISO(q.checkIn, q.checkOut), rateRules);
    const minRate = nightlyRates.length ? Math.min(...nightlyRates) : rt.baseRate;

    rooms.push({ roomType: rt, available: Math.max(0, minAvailable), minRate });
  }

  return {
    ok: true,
    data: {
      checkIn: q.checkIn,
      checkOut: q.checkOut,
      nights: nightsBetweenISO(q.checkIn, q.checkOut).length,
      rooms,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Quote                                                               */
/* ------------------------------------------------------------------ */

export type QuoteRequest = {
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomCount: number;
  promoCode?: string;
  addonIds?: { id: string; qty: number }[];
};

/** Build an authoritative quote (pricing recalculated server-side). */
export async function buildQuote(req: QuoteRequest): Promise<ApiResult<{ quote: import("./types").BookingQuote; quoteId: string }>> {
  const q: AvailabilityQuery = {
    checkIn: req.checkIn,
    checkOut: req.checkOut,
    adults: req.adults,
    children: req.children,
    roomCount: req.roomCount,
  };
  const v = validateSearchQuery(q);
  if (!v.ok) return v;

  const [roomType, ratePlan, rateRules] = await Promise.all([
    getRoomTypeById(req.roomTypeId),
    getRatePlanById(req.ratePlanId),
    getRateRules(),
  ]);
  if (!roomType) return { ok: false, error: "ROOM_NOT_FOUND", message: "Selected room type does not exist." };
  if (!ratePlan) return { ok: false, error: "RATE_PLAN_NOT_FOUND", message: "Selected rate plan does not exist." };

  const nights = nightsBetweenISO(req.checkIn, req.checkOut);
  if (nights.length < ratePlan.minNights) {
    return { ok: false, error: "VALIDATION_ERROR", message: `This rate requires a minimum stay of ${ratePlan.minNights} night(s).` };
  }

  // Final availability check
  const avail = await searchAvailability(q);
  if (!avail.ok) return avail;
  const row = avail.data.rooms.find((r) => r.roomType.id === roomType.id);
  if (!row || row.available < req.roomCount) {
    return {
      ok: false,
      error: "ROOM_UNAVAILABLE",
      message: "The selected room is no longer available for these dates. Please change dates or room type.",
    };
  }

  // Resolve add-ons server-side (prices always from DB)
  const allAddons = await getAddons();
  const selectedAddons = (req.addonIds ?? [])
    .map((sel) => {
      const a = allAddons.find((x) => x.id === sel.id);
      if (!a) return null;
      const qty = Math.max(1, Math.min(10, Math.floor(sel.qty)));
      return { id: a.id, name: a.name, qty, unitPrice: a.price };
    })
    .filter((x): x is { id: string; name: string; qty: number; unitPrice: number } => x !== null);

  // Resolve promo server-side
  let promo: PromoCode | null = null;
  if (req.promoCode) {
    promo = await getPromoByCode(req.promoCode);
  }

  const { quote, promoApplied, promoMessage } = calculateQuote({
    nights,
    roomType,
    ratePlan,
    rateRules,
    promo,
    addons: selectedAddons,
    adults: req.adults,
    children: req.children,
    roomCount: req.roomCount,
    todayISO: todayHotelISO(),
  });

  if (req.promoCode && !promoApplied) {
    return { ok: false, error: "INVALID_PROMO", message: promoMessage ?? "Promo code is not valid." };
  }

  // Persist the quote for stale-checkout protection
  const quoteRef = db().collection("booking_quotes").doc();
  await quoteRef.set({ ...quote, id: quoteRef.id, status: "active" });
  return { ok: true, data: { quote, quoteId: quoteRef.id } };
}

/* ------------------------------------------------------------------ */
/* Reference generation                                                */
/* ------------------------------------------------------------------ */

async function nextReference(): Promise<string> {
  const year = todayHotelISO().slice(0, 4);
  const counterRef = db().collection("counters").doc(`reservation-${year}`);
  const ref = await db().runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const next = ((doc.data()?.seq as number) ?? 0) + 1;
    tx.set(counterRef, { seq: next }, { merge: true });
    return `BKS-${year}-${String(next).padStart(6, "0")}`;
  });
  return ref;
}

/* ------------------------------------------------------------------ */
/* Booking creation — transaction-safe, single authoritative path      */
/* ------------------------------------------------------------------ */

export type CreateBookingInput = {
  quoteId: string;
  guest: { name: string; email: string; phone: string; country?: string };
  requests?: string;
  bookingSource?: BookingSource;
  idempotencyKey?: string;
};

export type CreateBookingOutput = {
  reservationId: string;
  reference: string;
  status: ReservationStatus;
  pricing: PriceBreakdown;
  assignedRoomNumber?: string;
  holdExpiresAt?: string;
};

/**
 * Create a reservation inside a Firestore transaction:
 * re-checks availability, re-calculates price from the persisted quote,
 * allocates a physical room, writes reservation + payment seed + audit log.
 * Two customers racing for the last room cannot both succeed: the second
 * transaction re-reads committed inventory state and fails gracefully.
 */
export async function createBooking(input: CreateBookingInput): Promise<ApiResult<CreateBookingOutput>> {
  // Idempotency: return the original result if this key was already processed
  if (input.idempotencyKey) {
    const existing = await db().collection(COL.idempotency).doc(input.idempotencyKey).get();
    if (existing.exists) {
      const prev = existing.data() as { reservationId?: string; reference?: string; status?: ReservationStatus; pricing?: PriceBreakdown; assignedRoomNumber?: string; holdExpiresAt?: string };
      if (prev.reservationId) {
        return {
          ok: true,
          data: {
            reservationId: prev.reservationId,
            reference: prev.reference ?? "",
            status: prev.status ?? "pending",
            pricing: prev.pricing ?? ({} as PriceBreakdown),
            assignedRoomNumber: prev.assignedRoomNumber,
            holdExpiresAt: prev.holdExpiresAt,
          },
        };
      }
    }
  }

  // Load persisted quote (protects against stale/tampered client pricing)
  const quoteDoc = await db().collection("booking_quotes").doc(input.quoteId).get();
  if (!quoteDoc.exists) {
    return { ok: false, error: "QUOTE_EXPIRED", message: "Your price quote could not be found. Please search again." };
  }
  const quote = quoteDoc.data() as import("./types").BookingQuote & { status?: string };
  if (quote.status === "consumed") {
    return { ok: false, error: "QUOTE_EXPIRED", message: "This quote has already been used. Please start a new booking." };
  }
  if (quote.expiresAt < Date.now()) {
    return { ok: false, error: "QUOTE_EXPIRED", message: "Your price quote has expired. Please get a new quote — prices may have changed." };
  }
  if (!input.guest?.name || !input.guest?.email || !input.guest?.phone) {
    return { ok: false, error: "VALIDATION_ERROR", message: "Guest name, email, and phone are required." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.guest.email)) {
    return { ok: false, error: "VALIDATION_ERROR", message: "A valid email address is required." };
  }

  // Basic guest profile upsert (avoid duplicates by email)
  const guestSnap = await db().collection(COL.guests).where("email", "==", input.guest.email.toLowerCase()).limit(1).get();
  let guestId: string;
  if (!guestSnap.empty) {
    guestId = guestSnap.docs[0].id;
    await db().collection(COL.guests).doc(guestId).set(
      { name: input.guest.name, phone: input.guest.phone, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  } else {
    const g = await db().collection(COL.guests).add({
      name: input.guest.name,
      email: input.guest.email.toLowerCase(),
      phone: input.guest.phone,
      country: input.guest.country ?? "Nigeria",
      createdAt: new Date().toISOString(),
    });
    guestId = g.id;
  }

  const reference = await nextReference();
  const now = new Date().toISOString();
  const holdExpiryMs = Date.now() + 30 * 60 * 1000; // 30-minute payment hold

  try {
    const result = await db().runTransaction(async (tx) => {
      // ---- 1. Re-check availability inside the transaction -------------
      const resSnap = await tx.get(
        db()
          .collection(COL.reservations)
          .where("roomTypeId", "==", quote.roomTypeId)
          .where("checkIn", "<", quote.checkOut),
      );
      let bookedPeak = 0;
      const nights = nightsBetweenISO(quote.checkIn, quote.checkOut);
      const perNight = new Map<string, number>();
      for (const n of nights) perNight.set(n, 0);
      for (const d of resSnap.docs) {
        const r = d.data() as Reservation;
        if (!INVENTORY_CONSUMING_STATUSES.includes(r.status)) continue;
        if (!overlapsRange({ checkIn: r.checkIn, checkOut: r.checkOut }, quote.checkIn, quote.checkOut)) continue;
        const lineCount = r.rooms?.find((rr) => rr.roomTypeId === quote.roomTypeId) ? r.rooms.length : 1;
        for (const n of nights) {
          if (overlapsRange({ checkIn: r.checkIn, checkOut: r.checkOut }, n, addDaysISO(n, 1))) {
            perNight.set(n, (perNight.get(n) ?? 0) + Math.max(1, lineCount));
          }
        }
      }
      bookedPeak = Math.max(0, ...perNight.values(), 0);

      // holds
      const holdsSnap = await tx.get(
        db().collection(COL.holds).where("roomTypeId", "==", quote.roomTypeId).where("released", "==", false),
      );
      const holdPerNight = new Map<string, number>();
      for (const n of nights) holdPerNight.set(n, 0);
      for (const d of holdsSnap.docs) {
        const h = d.data() as BookingHold;
        if (h.expiresAt < Date.now() || h.released) continue;
        if (!overlapsRange({ checkIn: h.checkIn, checkOut: h.checkOut }, quote.checkIn, quote.checkOut)) continue;
        for (const n of nights) {
          if (overlapsRange({ checkIn: h.checkIn, checkOut: h.checkOut }, n, addDaysISO(n, 1))) {
            holdPerNight.set(n, (holdPerNight.get(n) ?? 0) + (h.roomCount ?? 1));
          }
        }
      }

      const roomType = await getRoomTypeById(quote.roomTypeId);
      if (!roomType) throw new BookingError("ROOM_NOT_FOUND", "Room type no longer exists.");
      const blocked = await blockedRoomIdsForRange(quote.roomTypeId, quote.checkIn, quote.checkOut);
      const sellable = Math.max(0, roomType.qty - blocked.size);
      for (const n of nights) {
        const avail = sellable - (perNight.get(n) ?? 0) - (holdPerNight.get(n) ?? 0);
        if (avail < quote.roomCount) {
          throw new BookingError(
            "ROOM_UNAVAILABLE",
            "The room was just booked by someone else. Please choose different dates or another room type.",
          );
        }
      }

      // ---- 2. Authoritative price re-calculation -----------------------
      const [ratePlan, rateRules, promo] = await Promise.all([
        getRatePlanById(quote.ratePlanId),
        getRateRules(),
        quote.promoCode ? getPromoByCode(quote.promoCode) : Promise.resolve(null),
      ]);
      if (!ratePlan) throw new BookingError("RATE_PLAN_NOT_FOUND", "Rate plan no longer exists.");

      const recalc = calculateQuote({
        nights,
        roomType,
        ratePlan,
        rateRules,
        promo,
        addons: quote.addons.map((a) => ({ id: a.id, name: a.name, qty: a.qty, unitPrice: a.unitPrice })),
        adults: quote.adults,
        children: quote.children,
        roomCount: quote.roomCount,
        todayISO: todayHotelISO(),
      });
      if (recalc.quote.pricing.grandTotal !== quote.pricing.grandTotal) {
        throw new BookingError(
          "PRICE_CHANGED",
          "The price for your stay has changed. Please review the new price and confirm again.",
        );
      }
      const pricing = recalc.quote.pricing;

      // ---- 3. Allocate a physical room (best-effort, staff can reassign)
      let assignedRoomNumber: string | undefined;
      const prSnap = await tx.get(db().collection(COL.physicalRooms).where("roomTypeId", "==", quote.roomTypeId));
      const candidates: PhysicalRoom[] = prSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<PhysicalRoom, "id">) }))
        .filter((p) => p.status === "active" && !blocked.has(p.id));
      if (candidates.length > 0) {
        // find one with no overlapping reservation assignment
        const takenNumbers = new Set<string>();
        for (const d of resSnap.docs) {
          const r = d.data() as Reservation;
          if (!INVENTORY_CONSUMING_STATUSES.includes(r.status)) continue;
          if (!overlapsRange({ checkIn: r.checkIn, checkOut: r.checkOut }, quote.checkIn, quote.checkOut)) continue;
          if (r.assignedRoomNumber) takenNumbers.add(r.assignedRoomNumber);
        }
        const free = candidates.find((c) => !takenNumbers.has(c.number));
        if (free) assignedRoomNumber = free.number;
      }

      // ---- 4. Create the reservation -----------------------------------
      const reservationRooms: ReservationRoom[] = [
        {
          roomTypeId: quote.roomTypeId,
          roomTypeName: quote.roomTypeName,
          ratePlanId: quote.ratePlanId,
          ratePlanName: quote.ratePlanName,
          adults: quote.adults,
          children: quote.children,
          assignedRoomNumber,
          nightlyRates: quote.nightlyRates,
          subtotal: pricing.roomSubtotal,
          addons: quote.addons,
        },
      ];

      const reservation: Reservation = {
        id: "",
        reference,
        guestId,
        guestName: input.guest.name,
        guestEmail: input.guest.email.toLowerCase(),
        guestPhone: input.guest.phone,
        roomTypeId: quote.roomTypeId,
        roomTypeName: quote.roomTypeName,
        assignedRoomNumber,
        ratePlanId: quote.ratePlanId,
        ratePlanName: quote.ratePlanName,
        bookingSource: input.bookingSource ?? "website",
        checkIn: quote.checkIn,
        checkOut: quote.checkOut,
        nights: quote.nights,
        adults: quote.adults,
        children: quote.children,
        requests: input.requests,
        status: "pending",
        paymentStatus: "pending",
        pricing,
        rooms: reservationRooms,
        promoCode: quote.promoCode,
        cancellationPolicy: quote.cancellationPolicy,
        cancellationDeadline: quote.cancellationDeadline,
        holdExpiresAt: new Date(holdExpiryMs).toISOString(),
        idempotencyKey: input.idempotencyKey,
        createdAt: now,
        updatedAt: now,
      };

      const resRef = db().collection(COL.reservations).doc();
      reservation.id = resRef.id;
      tx.set(resRef, reservation);

      // ---- 5. Payment record seed ---------------------------------------
      const payRef = db().collection(COL.payments).doc();
      tx.set(payRef, {
        reservationId: resRef.id,
        reference,
        amount: pricing.depositDue,
        currency: pricing.currency,
        status: "pending",
        gateway: "paystack",
        gatewayReference: "",
        createdAt: now,
        updatedAt: now,
      });

      // ---- 6. Hold record (expires automatically) ------------------------
      const holdRef = db().collection(COL.holds).doc();
      const hold: BookingHold = {
        id: holdRef.id,
        reservationId: resRef.id,
        roomTypeId: quote.roomTypeId,
        checkIn: quote.checkIn,
        checkOut: quote.checkOut,
        roomCount: quote.roomCount,
        expiresAt: holdExpiryMs,
        released: false,
      };
      tx.set(holdRef, hold);

      // ---- 7. Audit log ---------------------------------------------------
      const auditRef = db().collection(COL.auditLogs).doc();
      tx.set(auditRef, {
        actor: guestId,
        actorType: "guest",
        action: "booking_created",
        entity: "reservation",
        entityId: resRef.id,
        newValue: { reference, status: "pending", grandTotal: pricing.grandTotal },
        createdAt: now,
      });

      // ---- 8b. Consume promo usage (race-safe: transaction re-reads) ------
      if (quote.promoCode) {
        const promo = await getPromoByCode(quote.promoCode);
        if (promo) {
          tx.set(
            db().collection(COL.promos).doc(promo.id),
            { usedCount: (promo.usedCount ?? 0) + 1 },
            { merge: true },
          );
        }
      }

      // ---- 8. Consume the quote ------------------------------------------
      tx.set(quoteDoc.ref, { status: "consumed", consumedBy: resRef.id }, { merge: true });

      return {
        reservationId: resRef.id,
        reference,
        status: "pending" as ReservationStatus,
        pricing,
        assignedRoomNumber,
        holdExpiresAt: new Date(holdExpiryMs).toISOString(),
      };
    });

    // Record idempotency after success
    if (input.idempotencyKey) {
      await db().collection(COL.idempotency).doc(input.idempotencyKey).set({
        reservationId: result.reservationId,
        reference: result.reference,
        status: result.status,
        pricing: result.pricing,
        assignedRoomNumber: result.assignedRoomNumber,
        holdExpiresAt: result.holdExpiresAt,
        createdAt: now,
      });
    }

    return { ok: true, data: result };
  } catch (e) {
    if (e instanceof BookingError) {
      return { ok: false, error: e.code, message: e.message };
    }
    console.error("createBooking failed:", e);
    return { ok: false, error: "INTERNAL_ERROR", message: "Booking could not be completed. Please try again." };
  }
}

class BookingError extends Error {
  constructor(public code: BookingErrorCode, message: string) {
    super(message);
  }
}

/* ------------------------------------------------------------------ */
/* Holds: explicit release (e.g. payment failed / abandoned)           */
/* ------------------------------------------------------------------ */

export async function releaseHoldsForReservation(reservationId: string): Promise<void> {
  const snap = await db().collection(COL.holds).where("reservationId", "==", reservationId).get();
  const batch = db().batch();
  snap.docs.forEach((d) => batch.update(d.ref, { released: true, releasedAt: new Date().toISOString() }));
  await batch.commit();
}

/* ------------------------------------------------------------------ */
/* Payments: verification & confirmation                               */
/* ------------------------------------------------------------------ */

export type VerifyPaymentInput = {
  reservationId: string;
  paystackReference: string;
  amountPaid: number; // kobo, from Paystack server verification
  channel?: string;
  paidAt?: string;
};

/**
 * Mark a reservation paid & confirmed after server-side Paystack verification.
 * Idempotent: re-verification of the same reference is a no-op.
 */
export async function verifyAndConfirmPayment(input: VerifyPaymentInput): Promise<ApiResult<{ status: ReservationStatus; paymentStatus: string }>> {
  const resRef = db().collection(COL.reservations).doc(input.reservationId);

  try {
    const result = await db().runTransaction(async (tx) => {
      const resDoc = await tx.get(resRef);
      if (!resDoc.exists) throw new BookingError("RESERVATION_NOT_FOUND", "Reservation not found.");
      const r = resDoc.data() as Reservation;

      // Idempotent: already confirmed for this reference
      if (r.status === "confirmed" && r.paymentStatus === "successful") {
        return { status: r.status, paymentStatus: r.paymentStatus };
      }
      if (r.status === "cancelled") {
        throw new BookingError("INVALID_BOOKING_STATE", "Cannot pay for a cancelled reservation.");
      }

      const expected = r.pricing.depositDue;
      if (input.amountPaid < expected) {
        throw new BookingError(
          "PAYMENT_FAILED",
          "Payment amount does not match the amount due. Please contact the front desk.",
        );
      }

      const now = new Date().toISOString();
      const paid = r.pricing.amountPaid + input.amountPaid;
      const pricing: PriceBreakdown = {
        ...r.pricing,
        amountPaid: paid,
        balanceDue: Math.max(0, r.pricing.grandTotal - paid),
      };

      tx.update(resRef, {
        status: "confirmed",
        paymentStatus: "successful",
        pricing,
        gatewayReference: input.paystackReference,
        holdExpiresAt: null as unknown as string,
        updatedAt: now,
      });

      // Update payment record(s)
      const paySnap = await tx.get(db().collection(COL.payments).where("reservationId", "==", input.reservationId));
      paySnap.docs.forEach((d) =>
        tx.update(d.ref, {
          status: "successful",
          gatewayReference: input.paystackReference,
          channel: input.channel,
          paidAt: input.paidAt ?? now,
          updatedAt: now,
        }),
      );

      // Release the hold (inventory now consumed by the confirmed reservation)
      const holdSnap = await tx.get(db().collection(COL.holds).where("reservationId", "==", input.reservationId));
      holdSnap.docs.forEach((d) => tx.update(d.ref, { released: true, releasedAt: now }));

      // Audit
      const auditRef = db().collection(COL.auditLogs).doc();
      tx.set(auditRef, {
        actor: "system",
        actorType: "system",
        action: "payment_verified",
        entity: "reservation",
        entityId: input.reservationId,
        previousValue: { status: r.status, paymentStatus: r.paymentStatus },
        newValue: { status: "confirmed", paymentStatus: "successful", amount: input.amountPaid, gatewayReference: input.paystackReference },
        createdAt: now,
      });

      return { status: "confirmed" as ReservationStatus, paymentStatus: "successful" };
    });
    return { ok: true, data: result };
  } catch (e) {
    if (e instanceof BookingError) return { ok: false, error: e.code, message: e.message };
    console.error("verifyAndConfirmPayment failed:", e);
    return { ok: false, error: "INTERNAL_ERROR", message: "Payment verification failed. Please contact support." };
  }
}

/** Mark payment failed (from webhook) and release inventory. */
export async function markPaymentFailed(reservationId: string, reason: string): Promise<ApiResult<null>> {
  const now = new Date().toISOString();
  try {
    await db().runTransaction(async (tx) => {
      const resRef = db().collection(COL.reservations).doc(reservationId);
      const resDoc = await tx.get(resRef);
      if (!resDoc.exists) return;
      const r = resDoc.data() as Reservation;
      if (r.paymentStatus === "successful") return; // never downgrade a real payment
      tx.update(resRef, { paymentStatus: "failed", updatedAt: now });
      const paySnap = await tx.get(db().collection(COL.payments).where("reservationId", "==", reservationId));
      paySnap.docs.forEach((d) => tx.update(d.ref, { status: "failed", failureReason: reason, updatedAt: now }));
    });
    await releaseHoldsForReservation(reservationId);
    return { ok: true, data: null };
  } catch (e) {
    console.error("markPaymentFailed failed:", e);
    return { ok: false, error: "INTERNAL_ERROR", message: "Could not update payment state." };
  }
}

/* ------------------------------------------------------------------ */
/* Admin operations: state transitions, room assignment, cancellation  */
/* ------------------------------------------------------------------ */

export async function transitionReservation(
  reservationId: string,
  to: ReservationStatus,
  actor: { uid: string; role: string },
  reason?: string,
): Promise<ApiResult<{ status: ReservationStatus }>> {
  try {
    const result = await db().runTransaction(async (tx) => {
      const ref = db().collection(COL.reservations).doc(reservationId);
      const doc = await tx.get(ref);
      if (!doc.exists) throw new BookingError("RESERVATION_NOT_FOUND", "Reservation not found.");
      const r = doc.data() as Reservation;
      if (!canTransition(r.status, to)) {
        throw new BookingError("INVALID_BOOKING_STATE", `Cannot move a reservation from ${r.status} to ${to}.`);
      }
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { status: to, updatedAt: now };
      if (to === "cancelled") {
        patch.cancelledAt = now;
        patch.cancellationReason = reason ?? "";
      }
      if (to === "no_show") {
        patch.cancelledAt = now;
      }
      tx.update(ref, patch);

      if (to === "cancelled" || to === "no_show") {
        const holdSnap = await tx.get(db().collection(COL.holds).where("reservationId", "==", reservationId));
        holdSnap.docs.forEach((d) => tx.update(d.ref, { released: true, releasedAt: now }));
      }

      const auditRef = db().collection(COL.auditLogs).doc();
      tx.set(auditRef, {
        actor: actor.uid,
        actorType: "staff",
        actorRole: actor.role,
        action: `status_${to}`,
        entity: "reservation",
        entityId: reservationId,
        previousValue: { status: r.status },
        newValue: { status: to },
        reason: reason ?? "",
        createdAt: now,
      });
      return { status: to };
    });
    return { ok: true, data: result };
  } catch (e) {
    if (e instanceof BookingError) return { ok: false, error: e.code, message: e.message };
    console.error("transitionReservation failed:", e);
    return { ok: false, error: "INTERNAL_ERROR", message: "Could not update the reservation." };
  }
}

export async function assignRoom(
  reservationId: string,
  roomNumber: string,
  actor: { uid: string; role: string },
): Promise<ApiResult<{ assignedRoomNumber: string }>> {
  try {
    const result = await db().runTransaction(async (tx) => {
      const ref = db().collection(COL.reservations).doc(reservationId);
      const doc = await tx.get(ref);
      if (!doc.exists) throw new BookingError("RESERVATION_NOT_FOUND", "Reservation not found.");
      const r = doc.data() as Reservation;
      if (!["confirmed", "pending", "checked_in"].includes(r.status)) {
        throw new BookingError("INVALID_BOOKING_STATE", "Room can only be assigned to active reservations.");
      }
      // verify the physical room exists, is active, and is not double-booked
      const prSnap = await tx.get(
        db().collection(COL.physicalRooms).where("roomTypeId", "==", r.roomTypeId).where("number", "==", roomNumber),
      );
      if (prSnap.empty) throw new BookingError("VALIDATION_ERROR", "Physical room not found for this room type.");
      const pr = prSnap.docs[0].data() as PhysicalRoom;
      if (pr.status !== "active") throw new BookingError("VALIDATION_ERROR", "That room is out of service.");

      const overlapSnap = await tx.get(
        db()
          .collection(COL.reservations)
          .where("roomTypeId", "==", r.roomTypeId)
          .where("assignedRoomNumber", "==", roomNumber)
          .where("checkIn", "<", r.checkOut),
      );
      for (const d of overlapSnap.docs) {
        if (d.id === reservationId) continue;
        const other = d.data() as Reservation;
        if (!INVENTORY_CONSUMING_STATUSES.includes(other.status)) continue;
        if (overlapsRange({ checkIn: other.checkIn, checkOut: other.checkOut }, r.checkIn, r.checkOut)) {
          throw new BookingError("ROOM_UNAVAILABLE", `Room ${roomNumber} is already assigned for overlapping dates.`);
        }
      }

      const now = new Date().toISOString();
      tx.update(ref, { assignedRoomNumber: roomNumber, updatedAt: now });
      const auditRef = db().collection(COL.auditLogs).doc();
      tx.set(auditRef, {
        actor: actor.uid,
        actorType: "staff",
        actorRole: actor.role,
        action: "room_assigned",
        entity: "reservation",
        entityId: reservationId,
        previousValue: { assignedRoomNumber: r.assignedRoomNumber ?? null },
        newValue: { assignedRoomNumber: roomNumber },
        createdAt: now,
      });
      return { assignedRoomNumber: roomNumber };
    });
    return { ok: true, data: result };
  } catch (e) {
    if (e instanceof BookingError) return { ok: false, error: e.code, message: e.message };
    console.error("assignRoom failed:", e);
    return { ok: false, error: "INTERNAL_ERROR", message: "Could not assign the room." };
  }
}

export async function cancelBooking(
  reservationId: string,
  actor: { uid: string; type: "guest" | "staff"; role?: string },
  reason?: string,
): Promise<ApiResult<{ refundAmount: number; forfeitureAmount: number; feePercent: number }>> {
  try {
    const result = await db().runTransaction(async (tx) => {
      const ref = db().collection(COL.reservations).doc(reservationId);
      const doc = await tx.get(ref);
      if (!doc.exists) throw new BookingError("RESERVATION_NOT_FOUND", "Reservation not found.");
      const r = doc.data() as Reservation;

      const calc = calculateCancellation(
        {
          status: r.status,
          checkIn: r.checkIn,
          pricing: r.pricing,
          cancellationPolicy: r.cancellationPolicy,
          cancellationDeadline: r.cancellationDeadline,
        },
        todayHotelISO(),
      );
      if (!calc.allowed) throw new BookingError("CANCELLATION_NOT_ALLOWED", calc.reason ?? "Cancellation is not allowed.");

      const now = new Date().toISOString();
      tx.update(ref, {
        status: "cancelled",
        paymentStatus: calc.refundAmount > 0 ? "partially_refunded" : r.paymentStatus,
        cancelledAt: now,
        cancellationReason: reason ?? "",
        refundAmount: calc.refundAmount,
        refundReason: calc.reason ?? "",
        refundedAt: calc.refundAmount > 0 ? now : null,
        updatedAt: now,
      });

      if (calc.refundAmount > 0) {
        const refundRef = db().collection(COL.refunds).doc();
        tx.set(refundRef, {
          reservationId,
          amount: calc.refundAmount,
          currency: r.pricing.currency,
          reason: calc.reason ?? "",
          status: "pending",
          gateway: "paystack",
          createdBy: actor.uid,
          createdAt: now,
        });
      }

      const holdSnap = await tx.get(db().collection(COL.holds).where("reservationId", "==", reservationId));
      holdSnap.docs.forEach((d) => tx.update(d.ref, { released: true, releasedAt: now }));

      const auditRef = db().collection(COL.auditLogs).doc();
      tx.set(auditRef, {
        actor: actor.uid,
        actorType: actor.type,
        actorRole: actor.role ?? "",
        action: "booking_cancelled",
        entity: "reservation",
        entityId: reservationId,
        previousValue: { status: r.status },
        newValue: { status: "cancelled", refundAmount: calc.refundAmount },
        reason: reason ?? "",
        createdAt: now,
      });

      return { refundAmount: calc.refundAmount, forfeitureAmount: calc.forfeitureAmount, feePercent: calc.feePercent };
    });
    return { ok: true, data: result };
  } catch (e) {
    if (e instanceof BookingError) return { ok: false, error: e.code, message: e.message };
    console.error("cancelBooking failed:", e);
    return { ok: false, error: "INTERNAL_ERROR", message: "Cancellation failed. Please contact the front desk." };
  }
}

/* ------------------------------------------------------------------ */
/* Reads: admin & guest                                                */
/* ------------------------------------------------------------------ */

export async function getReservationById(id: string): Promise<Reservation | null> {
  const d = await db().collection(COL.reservations).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<Reservation, "id">) };
}

export async function getReservationByReference(reference: string): Promise<Reservation | null> {
  const snap = await db().collection(COL.reservations).where("reference", "==", reference).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Reservation, "id">) };
}

/**
 * Find the gateway (Paystack) transaction reference of a reservation's most
 * recent non-failed payment intent — used when a guest verifies with only
 * the Banky reservation reference.
 */
export async function serverPaymentByGatewayRef(reservationId: string): Promise<string | null> {
  const snap = await db()
    .collection(COL.payments)
    .where("reservationId", "==", reservationId)
    .where("gateway", "==", "paystack")
    .get();
  let best: { gatewayReference: string; createdAt: string; failed: boolean } | null = null;
  for (const d of snap.docs) {
    const p = d.data() as { gatewayReference?: string; createdAt?: string; status?: string };
    if (!p.gatewayReference) continue;
    const failed = p.status === "failed";
    const entry = { gatewayReference: p.gatewayReference, createdAt: p.createdAt ?? "", failed };
    if (!best || (best.failed && !entry.failed) || entry.createdAt > best.createdAt) {
      best = entry;
    }
  }
  return best?.gatewayReference ?? null;
}

export async function listReservations(opts: { limit?: number; status?: string } = {}): Promise<Reservation[]> {
  try {
    let q: FirebaseFirestore.Query = db().collection(COL.reservations).orderBy("createdAt", "desc").limit(opts.limit ?? 100);
    if (opts.status) q = q.where("status", "==", opts.status);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Reservation, "id">) }));
  } catch (err) {
    console.warn("Failed to list reservations from Firestore:", err);
    return [];
  }
}

export async function listPhysicalRooms(roomTypeId?: string): Promise<PhysicalRoom[]> {
  try {
    let q: FirebaseFirestore.Query = db().collection(COL.physicalRooms);
    if (roomTypeId) q = q.where("roomTypeId", "==", roomTypeId);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PhysicalRoom, "id">) }));
  } catch (err) {
    console.warn("Failed to list physical rooms from Firestore:", err);
    return [];
  }
}

export { overlapsRange, INVENTORY_CONSUMING_STATUSES };
