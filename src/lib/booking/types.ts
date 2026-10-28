/**
 * Booking domain types — single source of truth for the reservation lifecycle.
 * Shared between server services and UI. No `any`.
 */

/* ------------------------------------------------------------------ */
/* Room inventory                                                      */
/* ------------------------------------------------------------------ */

export type RoomStatus = "active" | "out_of_order" | "maintenance";

/** A room *type* (category) — e.g. "Executive". Physical rooms belong to one. */
export type RoomType = {
  id: string;
  slug: string;
  name: string;
  /** Number of physical rooms of this type in inventory. */
  qty: number;
  /** Authoritative base nightly rate in kobo (NGN minor units). */
  baseRate: number;
  maxOccupancy: number;
  bed?: string;
  image: string;
  images?: string[];
  blurb?: string;
  features?: string[];
  status: RoomStatus;
};

/** A physical room unit — e.g. "Executive — Room 104". */
export type PhysicalRoom = {
  id: string;
  roomTypeId: string;
  number: string;
  floor?: number;
  status: RoomStatus;
  housekeeping?: "clean" | "dirty" | "inspected";
};

/* ------------------------------------------------------------------ */
/* Rate plans & pricing                                                */
/* ------------------------------------------------------------------ */

export type CancellationPolicyType = "flexible" | "non_refundable" | "deposit_forfeit";

export type RatePlan = {
  id: string;
  name: string;
  /** Multiplier or absolute override handled by pricing engine. */
  priceModifier: { type: "percent" | "absolute"; value: number };
  /** days before check-in after which free cancellation is no longer allowed */
  freeCancellationDays: number;
  cancellationPolicy: CancellationPolicyType;
  /** Whole-booking deposit required at booking time (0–100, 100 = full payment). */
  depositPercent: number;
  minNights: number;
  description?: string;
  active: boolean;
};

export type RateRule = {
  id: string;
  roomTypeId?: string; // undefined = applies to all types
  kind: "seasonal" | "weekend";
  /** Percentage adjustment on the base rate, e.g. 10 = +10%. */
  adjustmentPercent: number;
  /** ISO date (YYYY-MM-DD) */
  startDate: string;
  endDate: string;
  /** 0 = Sunday … 6 = Saturday (weekend rules only) */
  daysOfWeek?: number[];
  name: string;
  active?: boolean;
};

export type PromoCode = {
  id: string;
  code: string;
  active: boolean;
  discountType: "percent" | "fixed";
  /** percent (0–100) or fixed amount in kobo */
  value: number;
  maxDiscount?: number; // kobo cap for percent promos
  minBookingAmount?: number; // kobo
  validFrom: string; // ISO date
  validTo: string; // ISO date (inclusive)
  usageLimit?: number;
  usedCount: number;
  roomTypeIds?: string[]; // undefined = all
  name?: string;
};

/** Bookable extras (breakfast, transfer, early check-in …). */
export type Addon = {
  id: string;
  name: string;
  description?: string;
  /** unit price in kobo */
  price: number;
  /** pricing basis for display */
  unit?: "per_stay" | "per_night" | "per_person";
  active: boolean;
};

/* ------------------------------------------------------------------ */
/* Reservation lifecycle                                               */
/* ------------------------------------------------------------------ */

export const RESERVATION_STATUSES = [
  "inquiry",
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
  "completed",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Allowed transitions of the reservation state machine. */
export const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  inquiry: ["pending", "cancelled"],
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out"],
  checked_out: ["completed"],
  cancelled: [],
  no_show: [],
  completed: [],
};

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return RESERVATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "successful",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type BookingSource =
  | "website"
  | "whatsapp"
  | "admin"
  | "front_desk"
  | "phone"
  | "walk_in"
  | "corporate"
  | "ota"
  | "manual";

/** A per-room line item of a reservation (supports multi-room bookings). */
export type ReservationRoom = {
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: string;
  ratePlanName: string;
  adults: number;
  children: number;
  assignedRoomNumber?: string;
  nightlyRates: number[]; // kobo per night, length = nights
  subtotal: number; // kobo
  addons: { id: string; name: string; qty: number; unitPrice: number; total: number }[];
};

/** Snapshot of pricing stored at booking time (historical price preservation). */
export type PriceBreakdown = {
  roomSubtotal: number;
  addonTotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceCharge: number;
  grandTotal: number;
  depositDue: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
};

export type Reservation = {
  id: string;
  reference: string; // BKS-2026-000123
  guestId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomTypeId: string;
  roomTypeName: string;
  assignedRoomNumber?: string;
  ratePlanId: string;
  ratePlanName: string;
  bookingSource: BookingSource;
  checkIn: string; // YYYY-MM-DD (hotel timezone)
  checkOut: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children: number;
  roomCount?: number;
  requests?: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  pricing: PriceBreakdown;
  rooms: ReservationRoom[];
  promoCode?: string;
  cancellationPolicy: CancellationPolicyType;
  cancellationDeadline?: string; // ISO date after which fees apply
  cancellationFee?: number;
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount?: number;
  holdExpiresAt?: string; // pending payment hold expiry (epoch ms ISO)
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
};

/** Temporary inventory hold while payment is being processed. */
export type BookingHold = {
  id: string;
  reservationId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  roomCount: number;
  expiresAt: number; // epoch ms
  released: boolean;
};

/* ------------------------------------------------------------------ */
/* Availability & quotes                                               */
/* ------------------------------------------------------------------ */

export type AvailabilityQuery = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomCount: number;
};

export type RoomTypeAvailability = {
  roomType: RoomType;
  available: number; // bookable physical rooms for every night in range
  minRate: number; // lowest nightly rate (kobo) for the range
};

export type AvailabilityResult = {
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: RoomTypeAvailability[];
};

export type BookingQuote = {
  checkIn: string;
  checkOut: string;
  nights: number;
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: string;
  ratePlanName: string;
  nightlyRates: number[];
  adults: number;
  children: number;
  roomCount: number;
  addons: { id: string; name: string; qty: number; unitPrice: number; total: number }[];
  pricing: PriceBreakdown;
  promoCode?: string;
  promoValid?: boolean;
  promoMessage?: string;
  cancellationPolicy: CancellationPolicyType;
  cancellationDeadline?: string;
  createdAt: string;
  expiresAt: number; // epoch ms
};

/* ------------------------------------------------------------------ */
/* Calendar Inventory & Availability                                  */
/* ------------------------------------------------------------------ */

export type DayInventoryStatus = "available" | "limited" | "sold_out" | "past";

export type DayInventory = {
  date: string; // YYYY-MM-DD
  status: DayInventoryStatus;
  availableRooms: number;
  totalRooms: number;
  minRate?: number; // kobo
  hasEligibleRoom: boolean;
};

export type CalendarAvailabilityQuery = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  adults?: number;
  children?: number;
  roomCount?: number;
  roomTypeId?: string;
};

export type CalendarAvailabilityResult = {
  startDate: string;
  endDate: string;
  today: string;
  days: Record<string, DayInventory>;
};

/* ------------------------------------------------------------------ */
/* API envelopes                                                       */
/* ------------------------------------------------------------------ */

export type BookingErrorCode =
  | "INVALID_DATES"
  | "PAST_DATES"
  | "BOOKING_NOTICE"
  | "INVALID_OCCUPANCY"
  | "ROOM_UNAVAILABLE"
  | "ROOM_NOT_FOUND"
  | "RATE_PLAN_NOT_FOUND"
  | "INVALID_PROMO"
  | "QUOTE_EXPIRED"
  | "PRICE_CHANGED"
  | "PAYMENT_FAILED"
  | "PAYMENT_PENDING"
  | "RESERVATION_NOT_FOUND"
  | "CANCELLATION_NOT_ALLOWED"
  | "INVALID_BOOKING_STATE"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export type ApiError = { ok: false; error: BookingErrorCode; message: string; details?: unknown };
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiResult<T> = ApiSuccess<T> | ApiError;
