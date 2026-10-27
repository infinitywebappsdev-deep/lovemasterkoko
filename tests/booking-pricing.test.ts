import { describe, test } from "node:test";
import assert from "node:assert/strict";

const expect = (actual: any) => ({
  toBe: (expected: any) => assert.strictEqual(actual, expected),
  toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
  toHaveLength: (len: number) => assert.strictEqual(actual?.length, len),
});
import {
  computeNightlyRates,
  applyRatePlan,
  evaluatePromo,
  calculateQuote,
  calculateCancellation,
  nightsBetweenISO,
  addDaysISO,
  TAX_CONFIG,
} from "../src/lib/booking/pricing";
import { canTransition, RESERVATION_TRANSITIONS } from "../src/lib/booking/types";
import type { RoomType, RatePlan, RateRule, PromoCode } from "../src/lib/booking/types";

const execRoom: RoomType = {
  id: "executive",
  slug: "executive",
  name: "Executive",
  qty: 8,
  baseRate: 5_000_000, // ₦50,000 in kobo
  maxOccupancy: 2,
  bed: "King Bed",
  image: "/images/executive.jpg",
  status: "active",
};

const flexiblePlan: RatePlan = {
  id: "flexible",
  name: "Flexible",
  priceModifier: { type: "percent", value: 0 },
  freeCancellationDays: 1,
  cancellationPolicy: "flexible",
  depositPercent: 50,
  minNights: 1,
  active: true,
};

const nights3 = ["2026-10-10", "2026-10-11", "2026-10-12"];

describe("date helpers", () => {
  test("nightsBetweenISO returns one entry per night", () => {
    expect(nightsBetweenISO("2026-10-10", "2026-10-13")).toEqual(nights3);
  });
  test("zero nights for same-day checkout", () => {
    expect(nightsBetweenISO("2026-10-10", "2026-10-10")).toEqual([]);
  });
  test("addDaysISO crosses month boundaries", () => {
    expect(addDaysISO("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysISO("2026-10-10", -1)).toBe("2026-10-09");
  });
});

describe("nightly rate computation", () => {
  test("base rate without rules", () => {
    const { nightlyRates, appliedRules } = computeNightlyRates(execRoom, nights3, []);
    expect(nightlyRates).toEqual([5_000_000, 5_000_000, 5_000_000]);
    expect(appliedRules).toEqual([]);
  });

  test("seasonal rule raises specific nights only", () => {
    const rules: RateRule[] = [
      { id: "r1", kind: "seasonal", adjustmentPercent: 20, startDate: "2026-10-11", endDate: "2026-10-11", name: "Peak", active: true },
    ];
    const { nightlyRates, appliedRules } = computeNightlyRates(execRoom, nights3, rules);
    expect(nightlyRates).toEqual([5_000_000, 6_000_000, 5_000_000]);
    expect(appliedRules).toEqual(["Peak"]);
  });

  test("weekend rule applies only to configured weekdays", () => {
    // 2026-10-10 is a Saturday (dow 6), 10-11 Sunday, 10-12 Monday
    const rules: RateRule[] = [
      { id: "r2", kind: "weekend", adjustmentPercent: 10, startDate: "2026-01-01", endDate: "2030-12-31", daysOfWeek: [5, 6], name: "Weekend", active: true },
    ];
    const { nightlyRates } = computeNightlyRates(execRoom, nights3, rules);
    expect(nightlyRates[0]).toBe(5_500_000); // Saturday +10%
    expect(nightlyRates[1]).toBe(5_000_000); // Sunday untouched
    expect(nightlyRates[2]).toBe(5_000_000); // Monday untouched
  });

  test("room-type-scoped rules do not leak to other types", () => {
    const rules: RateRule[] = [
      { id: "r3", roomTypeId: "deluxe", kind: "seasonal", adjustmentPercent: 50, startDate: "2026-01-01", endDate: "2030-12-31", name: "Deluxe only", active: true },
    ];
    const { nightlyRates } = computeNightlyRates(execRoom, nights3, rules);
    expect(nightlyRates).toEqual([5_000_000, 5_000_000, 5_000_000]);
  });
});

describe("rate plans", () => {
  test("percent modifier", () => {
    const plan: RatePlan = { ...flexiblePlan, priceModifier: { type: "percent", value: -10 } };
    expect(applyRatePlan(5_000_000, plan)).toBe(4_500_000);
  });
  test("absolute modifier", () => {
    const plan: RatePlan = { ...flexiblePlan, priceModifier: { type: "absolute", value: 250_000 } };
    expect(applyRatePlan(5_000_000, plan)).toBe(5_250_000);
  });
});

describe("promo validation (server-side)", () => {
  const base = { todayISO: "2026-10-01", roomSubtotal: 15_000_000, roomTypeId: "executive", nights: 3 };

  test("valid percent promo", () => {
    const promo: PromoCode = { id: "p1", code: "WELCOME10", active: true, discountType: "percent", value: 10, validFrom: "2026-01-01", validTo: "2026-12-31", usedCount: 0 };
    const r = evaluatePromo(promo, base);
    expect(r.valid).toBe(true);
    expect(r.discount).toBe(1_500_000);
  });

  test("expired promo rejected", () => {
    const promo: PromoCode = { id: "p1", code: "OLD", active: true, discountType: "percent", value: 10, validFrom: "2025-01-01", validTo: "2025-12-31", usedCount: 0 };
    expect(evaluatePromo(promo, base).valid).toBe(false);
  });

  test("usage limit enforced", () => {
    const promo: PromoCode = { id: "p1", code: "LIMITED", active: true, discountType: "fixed", value: 500_000, validFrom: "2026-01-01", validTo: "2026-12-31", usedCount: 5, usageLimit: 5 };
    expect(evaluatePromo(promo, base).valid).toBe(false);
  });

  test("min booking amount enforced", () => {
    const promo: PromoCode = { id: "p1", code: "BIG", active: true, discountType: "fixed", value: 500_000, validFrom: "2026-01-01", validTo: "2026-12-31", usedCount: 0, minBookingAmount: 20_000_000 };
    expect(evaluatePromo(promo, base).valid).toBe(false);
  });

  test("max discount cap respected", () => {
    const promo: PromoCode = { id: "p1", code: "CAPPED", active: true, discountType: "percent", value: 50, maxDiscount: 1_000_000, validFrom: "2026-01-01", validTo: "2026-12-31", usedCount: 0 };
    const r = evaluatePromo(promo, base);
    expect(r.valid).toBe(true);
    expect(r.discount).toBe(1_000_000);
  });

  test("room type restriction enforced", () => {
    const promo: PromoCode = { id: "p1", code: "DELUXE", active: true, discountType: "percent", value: 10, validFrom: "2026-01-01", validTo: "2026-12-31", usedCount: 0, roomTypeIds: ["deluxe"] };
    expect(evaluatePromo(promo, base).valid).toBe(false);
  });
});

describe("authoritative quote", () => {
  test("full breakdown with tax, service charge and deposit", () => {
    const { quote } = calculateQuote({
      nights: nights3,
      roomType: execRoom,
      ratePlan: flexiblePlan,
      rateRules: [],
      adults: 2,
      children: 0,
      roomCount: 1,
      todayISO: "2026-10-01",
    });
    // subtotal 3 × 50,000 = ₦150,000
    expect(quote.pricing.roomSubtotal).toBe(15_000_000);
    expect(quote.pricing.serviceCharge).toBe(Math.round(15_000_000 * TAX_CONFIG.serviceChargePercent / 100));
    expect(quote.pricing.taxTotal).toBe(Math.round(15_000_000 * TAX_CONFIG.vatPercent / 100));
    expect(quote.pricing.grandTotal).toBe(
      15_000_000 + Math.round(15_000_000 * 0.05) + Math.round(15_000_000 * 0.075),
    );
    // 50% deposit
    expect(quote.pricing.depositDue).toBe(Math.round(quote.pricing.grandTotal / 2));
    expect(quote.pricing.balanceDue).toBe(quote.pricing.grandTotal - quote.pricing.depositDue);
    expect(quote.nightlyRates).toHaveLength(3);
  });

  test("multi-room multiplies subtotal", () => {
    const { quote } = calculateQuote({
      nights: nights3, roomType: execRoom, ratePlan: flexiblePlan,
      adults: 4, children: 0, roomCount: 2, todayISO: "2026-10-01",
    });
    expect(quote.pricing.roomSubtotal).toBe(30_000_000);
  });

  test("promo reduces taxable base", () => {
    const promo: PromoCode = { id: "p1", code: "TEN", active: true, discountType: "percent", value: 10, validFrom: "2026-01-01", validTo: "2026-12-31", usedCount: 0 };
    const { quote } = calculateQuote({
      nights: nights3, roomType: execRoom, ratePlan: flexiblePlan, promo,
      adults: 2, children: 0, roomCount: 1, todayISO: "2026-10-01",
    });
    const taxable = 15_000_000 - 1_500_000;
    expect(quote.pricing.grandTotal).toBe(taxable + Math.round(taxable * 0.05) + Math.round(taxable * 0.075));
  });

  test("cancellation deadline derived from policy", () => {
    const { quote } = calculateQuote({
      nights: ["2026-10-10"], roomType: execRoom, ratePlan: flexiblePlan,
      adults: 1, children: 0, roomCount: 1, todayISO: "2026-10-01",
    });
    expect(quote.cancellationDeadline).toBe("2026-10-09");
  });
});

describe("cancellation & refund calculation", () => {
  const paidFull = { roomSubtotal: 15_000_000, addonTotal: 0, discountTotal: 0, taxTotal: 1_125_000, serviceCharge: 750_000, grandTotal: 16_875_000, depositDue: 8_437_500, amountPaid: 16_875_000, balanceDue: 0, currency: "NGN" };

  test("free cancellation before deadline → full refund", () => {
    const r = calculateCancellation({ status: "confirmed", checkIn: "2026-10-10", pricing: paidFull, cancellationPolicy: "flexible", cancellationDeadline: "2026-10-09" }, "2026-10-05");
    expect(r.allowed).toBe(true);
    expect(r.refundAmount).toBe(16_875_000);
    expect(r.feePercent).toBe(0);
  });

  test("late cancellation → 50% fee", () => {
    const r = calculateCancellation({ status: "confirmed", checkIn: "2026-10-10", pricing: paidFull, cancellationPolicy: "flexible", cancellationDeadline: "2026-10-09" }, "2026-10-10");
    expect(r.allowed).toBe(true);
    expect(r.refundAmount).toBe(Math.round(16_875_000 * 0.5));
    expect(r.feePercent).toBe(50);
  });

  test("non-refundable rate → no refund", () => {
    const r = calculateCancellation({ status: "confirmed", checkIn: "2026-10-10", pricing: paidFull, cancellationPolicy: "non_refundable" }, "2026-09-01");
    expect(r.allowed).toBe(true);
    expect(r.refundAmount).toBe(0);
  });

  test("checked-in reservations cannot be cancelled", () => {
    const r = calculateCancellation({ status: "checked_in", checkIn: "2026-10-10", pricing: paidFull, cancellationPolicy: "flexible", cancellationDeadline: "2026-10-09" }, "2026-10-10");
    expect(r.allowed).toBe(false);
  });

  test("already-cancelled reservation is rejected", () => {
    const r = calculateCancellation({ status: "cancelled", checkIn: "2026-10-10", pricing: paidFull, cancellationPolicy: "flexible" }, "2026-10-01");
    expect(r.allowed).toBe(false);
  });

  test("deposit_forfeit keeps only the deposit", () => {
    const pricing = { ...paidFull, amountPaid: 8_437_500 };
    const r = calculateCancellation({ status: "confirmed", checkIn: "2026-10-10", pricing, cancellationPolicy: "deposit_forfeit" }, "2026-10-01");
    expect(r.allowed).toBe(true);
    expect(r.refundAmount).toBe(0);
    expect(r.forfeitureAmount).toBe(8_437_500);
  });
});

describe("reservation state machine", () => {
  test("happy path transitions allowed", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "checked_in")).toBe(true);
    expect(canTransition("checked_in", "checked_out")).toBe(true);
    expect(canTransition("checked_out", "completed")).toBe(true);
  });

  test("illegal transitions blocked", () => {
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("completed", "checked_in")).toBe(false);
    expect(canTransition("checked_out", "pending")).toBe(false);
    expect(canTransition("inquiry", "checked_in")).toBe(false);
  });

  test("cancellation possible from pending & confirmed only", () => {
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("checked_in", "cancelled")).toBe(false);
  });

  test("terminal states have no exits", () => {
    for (const s of ["cancelled", "no_show", "completed"] as const) {
      expect(RESERVATION_TRANSITIONS[s]).toEqual([]);
    }
  });
});
