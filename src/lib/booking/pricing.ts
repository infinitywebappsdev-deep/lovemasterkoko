import type {
  RoomType,
  RatePlan,
  RateRule,
  PromoCode,
  PriceBreakdown,
  BookingQuote,
  ReservationStatus,
} from "./types";

/* ------------------------------------------------------------------ */
/* Currency: all amounts are integers in kobo (NGN minor units).       */
/* No floating point arithmetic on money anywhere in this file.        */
/* ------------------------------------------------------------------ */

export const TAX_CONFIG = {
  /** Nigerian VAT */
  vatPercent: 7.5,
  /** Hospitality service charge on room subtotal */
  serviceChargePercent: 5,
} as const;

/** Integer-safe rounding (kobo). */
export function roundKobo(v: number): number {
  return Math.round(v);
}

/**
 * Authoritative nightly rates for a room type over a date range.
 * Applies active rate rules (seasonal / weekend) on top of the base rate.
 * Returns one integer kobo rate per night plus the names of applied rules.
 */
export function computeNightlyRates(
  roomType: RoomType,
  nights: string[], // ISO dates (YYYY-MM-DD), one per night
  rateRules: RateRule[] = [],
): { nightlyRates: number[]; appliedRules: string[] } {
  const applicable = rateRules.filter(
    (r) => r.active !== false && (!r.roomTypeId || r.roomTypeId === roomType.id),
  );
  const nightly: number[] = [];
  const applied = new Set<string>();
  for (const date of nights) {
    let rate = roomType.baseRate;
    for (const rule of applicable) {
      if (date >= rule.startDate && date <= rule.endDate) {
        if (rule.kind === "weekend") {
          const dow = new Date(date + "T12:00:00Z").getUTCDay();
          if (rule.daysOfWeek && rule.daysOfWeek.includes(dow)) {
            rate = Math.round(rate * (1 + rule.adjustmentPercent / 100));
            applied.add(rule.name);
          }
        } else {
          rate = Math.round(rate * (1 + rule.adjustmentPercent / 100));
          applied.add(rule.name);
        }
      }
    }
    nightly.push(rate);
  }
  return { nightlyRates: nightly, appliedRules: [...applied] };
}

/** Apply a rate plan's price modifier to a nightly rate (integer kobo). */
export function applyRatePlan(rate: number, plan: RatePlan): number {
  if (plan.priceModifier.type === "percent") {
    return Math.round(rate * (1 + plan.priceModifier.value / 100));
  }
  return Math.max(0, rate + plan.priceModifier.value);
}

/**
 * Server-side promo validation. Returns the discount in kobo (0 if invalid)
 * plus a machine-readable status and human message.
 */
export function evaluatePromo(
  promo: PromoCode | null | undefined,
  params: {
    todayISO: string;
    roomSubtotal: number; // kobo, before discount
    roomTypeId: string;
    nights: number;
  },
): { valid: boolean; discount: number; reason?: string } {
  if (!promo) return { valid: false, discount: 0, reason: "Promo code not found." };
  if (promo.active === false) return { valid: false, discount: 0, reason: "This promo code is no longer active." };
  if (params.todayISO < promo.validFrom) return { valid: false, discount: 0, reason: "This promo code is not active yet." };
  if (params.todayISO > promo.validTo) return { valid: false, discount: 0, reason: "This promo code has expired." };
  if (promo.usageLimit !== undefined && promo.usedCount >= promo.usageLimit) {
    return { valid: false, discount: 0, reason: "This promo code has reached its usage limit." };
  }
  if (promo.roomTypeIds && promo.roomTypeIds.length > 0 && !promo.roomTypeIds.includes(params.roomTypeId)) {
    return { valid: false, discount: 0, reason: "This promo code does not apply to the selected room." };
  }
  if (promo.minBookingAmount !== undefined && params.roomSubtotal < promo.minBookingAmount) {
    return { valid: false, discount: 0, reason: "Booking does not meet the minimum amount for this promo." };
  }

  let discount: number;
  if (promo.discountType === "percent") {
    discount = Math.round((params.roomSubtotal * promo.value) / 100);
    if (promo.maxDiscount !== undefined) discount = Math.min(discount, promo.maxDiscount);
  } else {
    discount = Math.min(promo.value, params.roomSubtotal);
  }
  return { valid: true, discount, reason: "Promo applied." };
}

/* ------------------------------------------------------------------ */
/* The authoritative quote builder                                     */
/* ------------------------------------------------------------------ */

export type QuoteInput = {
  nights: string[]; // ISO dates, length = nights
  roomType: RoomType;
  ratePlan: RatePlan;
  rateRules?: RateRule[];
  promo?: PromoCode | null;
  addons?: { id: string; name: string; qty: number; unitPrice: number }[];
  adults: number;
  children: number;
  roomCount: number;
  todayISO: string;
  currency?: string;
};

export type QuoteOutput = {
  quote: BookingQuote;
  promoApplied: boolean;
  promoMessage?: string;
};

/**
 * CalculateBookingQuote — single authoritative pricing path used by BOTH
 * the quote API and the final booking transaction. The booking engine
 * re-runs this inside the transaction; client figures are never trusted.
 */
export function calculateQuote(input: QuoteInput): QuoteOutput {
  const { nights, roomType, ratePlan, rateRules = [], promo = null, adults, children, roomCount } = input;

  // 1. Nightly rates with rules, then rate-plan modifier, per room
  const base = computeNightlyRates(roomType, nights, rateRules);
  const nightlyPerRoom = base.nightlyRates.map((r) => applyRatePlan(r, ratePlan));

  // 2. Room subtotal = sum(nightly) × rooms
  const roomSubtotal = nightlyPerRoom.reduce((a, b) => a + b, 0) * roomCount;

  // 3. Add-ons
  const addons = (input.addons ?? []).map((a) => ({
    ...a,
    total: Math.round(a.unitPrice * a.qty),
  }));
  const addonTotal = addons.reduce((a, b) => a + b.total, 0);

  // 4. Promo discount (server-validated)
  const promoEval = evaluatePromo(promo, {
    todayISO: input.todayISO,
    roomSubtotal,
    roomTypeId: roomType.id,
    nights: nights.length,
  });
  const discountTotal = promoEval.valid ? promoEval.discount : 0;

  // 5. Tax & service charge
  const taxable = roomSubtotal + addonTotal - discountTotal;
  const serviceCharge = Math.round((taxable * TAX_CONFIG.serviceChargePercent) / 100);
  const vat = Math.round((taxable * TAX_CONFIG.vatPercent) / 100);
  const taxTotal = vat;

  // 6. Totals (integer kobo) — Full payment upfront, remove deposit due and balance split
  const grandTotal = Math.max(0, taxable + serviceCharge + taxTotal);
  const depositDue = grandTotal;

  const currency = input.currency ?? "NGN";
  const pricing: PriceBreakdown = {
    roomSubtotal,
    addonTotal,
    discountTotal,
    taxTotal,
    serviceCharge,
    grandTotal,
    depositDue,
    amountPaid: 0,
    balanceDue: 0,
    currency,
  };

  // 7. Cancellation deadline (hotel timezone date math)
  const cancellationDeadline = addDaysISO(input.nights[0], -ratePlan.freeCancellationDays);

  const quote: BookingQuote = {
    checkIn: nights[0],
    checkOut: addDaysISO(nights[nights.length - 1], 1),
    nights: nights.length,
    roomTypeId: roomType.id,
    roomTypeName: roomType.name,
    ratePlanId: ratePlan.id,
    ratePlanName: ratePlan.name,
    nightlyRates: nightlyPerRoom,
    adults,
    children,
    roomCount,
    addons,
    pricing,
    promoCode: promoEval.valid && promo ? promo.code : undefined,
    promoValid: promoEval.valid,
    promoMessage: promoEval.reason,
    cancellationPolicy: ratePlan.cancellationPolicy,
    cancellationDeadline,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  };

  return { quote, promoApplied: promoEval.valid, promoMessage: promoEval.reason };
}

/* ------------------------------------------------------------------ */
/* Cancellation & refund calculation (server-side only)                */
/* ------------------------------------------------------------------ */

export type CancellationResult = {
  allowed: boolean;
  reason?: string;
  refundAmount: number; // kobo
  forfeitureAmount: number; // kobo
  feePercent: number;
};

/**
 * Calculate the refund for a cancellation per policy.
 * - flexible: full refund before deadline; 50% fee after; no refund after check-in.
 * - non_refundable: no refund once confirmed.
 * - deposit_forfeit: deposit kept, balance never charged.
 */
export function calculateCancellation(
  reservation: {
    status: ReservationStatus;
    checkIn: string;
    pricing: PriceBreakdown;
    cancellationPolicy: "flexible" | "non_refundable" | "deposit_forfeit";
    cancellationDeadline?: string;
  },
  todayISO: string,
): CancellationResult {
  const paid = reservation.pricing.amountPaid;

  if (reservation.status === "cancelled") {
    return { allowed: false, reason: "Reservation is already cancelled.", refundAmount: 0, forfeitureAmount: 0, feePercent: 0 };
  }
  if (reservation.status === "checked_in" || reservation.status === "checked_out" || reservation.status === "completed") {
    return { allowed: false, reason: "Checked-in or completed stays cannot be cancelled.", refundAmount: 0, forfeitureAmount: 0, feePercent: 0 };
  }

  switch (reservation.cancellationPolicy) {
    case "non_refundable": {
      return {
        allowed: true,
        refundAmount: 0,
        forfeitureAmount: paid,
        feePercent: 100,
        reason: "This rate is non-refundable; no refund is issued on cancellation.",
      };
    }
    case "deposit_forfeit": {
      const deposit = reservation.pricing.depositDue;
      const refund = Math.max(0, paid - deposit);
      return {
        allowed: true,
        refundAmount: refund,
        forfeitureAmount: paid - refund,
        feePercent: paid > 0 ? Math.round(((paid - refund) / paid) * 100) : 0,
        reason: "Deposit is retained on cancellation.",
      };
    }
    case "flexible":
    default: {
      const deadline = reservation.cancellationDeadline;
      if (deadline && todayISO > deadline) {
        const refund = Math.round(paid * 0.5);
        return {
          allowed: true,
          refundAmount: refund,
          forfeitureAmount: paid - refund,
          feePercent: 50,
          reason: "Free cancellation window has passed; a 50% late-cancellation fee applies.",
        };
      }
      return {
        allowed: true,
        refundAmount: paid,
        forfeitureAmount: 0,
        feePercent: 0,
        reason: "Free cancellation.",
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Date helpers (hotel-timezone-safe, pure date math)                  */
/* ------------------------------------------------------------------ */

export function nightsBetweenISO(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let d = new Date(checkIn + "T12:00:00Z");
  const end = new Date(checkOut + "T12:00:00Z");
  while (d < end) {
    out.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() + 86_400_000);
  }
  return out;
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayHotelISO(): string {
  // Africa/Lagos = UTC+1 (no DST) — convert current instant to Lagos date.
  const lagos = new Date(Date.now() + 60 * 60 * 1000);
  return lagos.toISOString().slice(0, 10);
}
