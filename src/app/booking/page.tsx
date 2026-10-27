"use client";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  Lock,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Search,
  BedDouble,
  User,
  Check,
  FileDown,
  Building2,
  Copy,
  Info,
  MessageCircle,
} from "lucide-react";
import { naira, HOTEL, whatsappLink } from "@/lib/hotel";
import type { AvailabilityResult, BookingQuote, BookingErrorCode } from "@/lib/booking/types";
import { BookingCalendarDatePicker } from "@/components/booking/BookingCalendarDatePicker";
import { usePaymentSettings } from "@/lib/settings/usePaymentSettings";

/* ------------------------------------------------------------------ */
/* Typed API client                                                    */
/* ------------------------------------------------------------------ */

async function api<T>(url: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: BookingErrorCode; message: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      method: body !== undefined ? "POST" : "GET",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const json = await res.json();
    if (json.ok) return json as { ok: true; data: T };
    return json as { ok: false; error: BookingErrorCode; message: string };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { ok: false, error: "INTERNAL_ERROR" as BookingErrorCode, message: "Request timed out. Please try again." };
    }
    return { ok: false, error: "INTERNAL_ERROR" as BookingErrorCode, message: err?.message || "Network request failed. Please check your connection." };
  }
}

type SearchParams = { checkIn: string; checkOut: string; adults: number; children: number; roomCount: number };

type RatePlanSummary = {
  id: string;
  name: string;
  description: string;
  priceModifier: { type: "percent" | "absolute"; value: number };
  cancellationPolicy: string;
  freeCancellationDays: number;
  depositPercent: number;
  minNights: number;
};

const STEPS = ["Dates", "Room", "Details", "Pay"] as const;

function BookingFlow() {
  const sp = useSearchParams();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Search
  const today = new Date().toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState(sp.get("checkIn") ?? "");
  const [checkOut, setCheckOut] = useState(sp.get("checkOut") ?? "");
  const [adults, setAdults] = useState(sp.get("adults") ? Math.max(1, parseInt(sp.get("adults")!, 10)) : 2);
  const [children, setChildren] = useState(sp.get("children") ? Math.max(0, parseInt(sp.get("children")!, 10)) : 0);
  const [roomCount, setRoomCount] = useState(sp.get("rooms") ? Math.max(1, parseInt(sp.get("rooms")!, 10)) : 1);
  const [promoInput, setPromoInput] = useState("");
  const [search, setSearch] = useState<AvailabilityResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [ratePlans, setRatePlans] = useState<RatePlanSummary[]>([]);
  const [ratePlanId, setRatePlanId] = useState("flexible");
  const [maxStepReached, setMaxStepReached] = useState(0);

  // Quote
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [addonSelection, setAddonSelection] = useState<Record<string, number>>({});
  const [addons, setAddons] = useState<{ id: string; name: string; price: number; unit?: string; description?: string }[]>([]);

  // Guest
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");

  // Booking
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // Global payment settings (real-time from Firestore)
  const { paystackEnabled, settings: paymentSettings } = usePaymentSettings();

  // Keep track of highest unlocked step for progress bar navigation
  useEffect(() => {
    setMaxStepReached((prev) => Math.max(prev, step));
  }, [step]);

  const canJumpTo = useCallback(
    (targetStep: number) => {
      if (targetStep === step) return false;
      // Users can always jump back to completed earlier steps
      if (targetStep < step) return true;
      // Users can also jump forward if they previously unlocked that step and data is present
      if (targetStep === 1 && search !== null) return true;
      if (targetStep === 2 && quote !== null) return true;
      if (targetStep === 3 && quote !== null && reference !== null) return true;
      return false;
    },
    [step, search, quote, reference],
  );

  const jumpToStep = useCallback(
    (targetStep: number) => {
      if (!canJumpTo(targetStep)) return;
      setError(null);
      setStep(targetStep);

      // Smooth scroll back to form container so user sees the step content
      if (typeof window !== "undefined") {
        const container = document.getElementById("booking-flow-container");
        if (container) {
          const rect = container.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - 145;
          window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
        }
      }
    },
    [canJumpTo],
  );

  useEffect(() => {
    api<{ addons: typeof addons }>("/api/booking/addons")
      .then((r) => {
        if (r.ok) setAddons(r.data.addons);
      })
      .catch(() => {});
    api<{ ratePlans: RatePlanSummary[] }>("/api/booking/rate-plans")
      .then((r) => {
        if (r.ok && r.data.ratePlans.length > 0) setRatePlans(r.data.ratePlans);
      })
      .catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    setSearching(true);
    setError(null);
    try {
      const res = await api<AvailabilityResult>("/api/booking/search", {
        checkIn,
        checkOut,
        adults,
        children,
        roomCount,
      });
      if (!res.ok) {
        setError(res.message);
        setSearch(null);
        return;
      }
      setSearch(res.data);
      setQuote(null);
      setQuoteId(null);
      if (res.data.rooms.every((r) => r.available <= 0)) {
        setError("No rooms are available for these dates. Please try different dates.");
      } else {
        setStep(1);
        setMaxStepReached((prev) => Math.max(prev, 1));
        if (typeof window !== "undefined") {
          const container = document.getElementById("booking-flow-container");
          if (container) {
            const rect = container.getBoundingClientRect();
            const targetY = window.pageYOffset + rect.top - 145;
            window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [checkIn, checkOut, adults, children, roomCount]);

  // Auto-run search when directed from header reservation widget with valid dates
  useEffect(() => {
    if (sp.get("autosearch") === "true" && checkIn && checkOut && !search && !searching) {
      runSearch();
    }
  }, [sp, checkIn, checkOut, search, searching, runSearch]);

  const selectRoom = useCallback(
    async (roomTypeId: string) => {
      setBusy(true);
      setError(null);
      try {
        const addonIds = Object.entries(addonSelection)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => ({ id, qty }));
        const res = await api<{ quote: BookingQuote; quoteId: string }>("/api/booking/quote", {
          roomTypeId,
          ratePlanId: ratePlanId || "flexible",
          checkIn,
          checkOut,
          adults,
          children,
          roomCount,
          promoCode: promoInput || undefined,
          addonIds,
        });
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setQuote(res.data.quote);
        setQuoteId(res.data.quoteId);
        setStep(2);
        setMaxStepReached((prev) => Math.max(prev, 2));
        if (typeof window !== "undefined") {
          const container = document.getElementById("booking-flow-container");
          if (container) {
            const rect = container.getBoundingClientRect();
            const targetY = window.pageYOffset + rect.top - 145;
            window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to calculate room pricing. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [addonSelection, checkIn, checkOut, adults, children, roomCount, promoInput, ratePlanId],
  );

  const refreshQuote = useCallback(
    async (withPromo?: string) => {
      if (!quote) return;
      setBusy(true);
      setError(null);
      try {
        const addonIds = Object.entries(addonSelection)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => ({ id, qty }));
        const res = await api<{ quote: BookingQuote; quoteId: string }>("/api/booking/quote", {
          roomTypeId: quote.roomTypeId,
          ratePlanId: quote.ratePlanId || ratePlanId || "flexible",
          checkIn,
          checkOut,
          adults,
          children,
          roomCount,
          promoCode: withPromo || undefined,
          addonIds,
        });
        if (res.ok) {
          setQuote(res.data.quote);
          setQuoteId(res.data.quoteId);
        } else {
          setError(res.message);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to refresh pricing.");
      } finally {
        setBusy(false);
      }
    },
    [quote, addonSelection, checkIn, checkOut, adults, children, roomCount, ratePlanId],
  );

  const createBooking = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      setError("Please provide your name, email address, and phone number.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // If quoteId was lost but quote data exists, re-acquire active quote
      let activeQuoteId = quoteId;
      if (!activeQuoteId && quote) {
        const qRes = await api<{ quote: BookingQuote; quoteId: string }>("/api/booking/quote", {
          roomTypeId: quote.roomTypeId,
          ratePlanId: quote.ratePlanId || ratePlanId || "flexible",
          checkIn,
          checkOut,
          adults,
          children,
          roomCount,
          promoCode: promoInput || undefined,
        });
        if (qRes.ok) {
          activeQuoteId = qRes.data.quoteId;
          setQuote(qRes.data.quote);
          setQuoteId(qRes.data.quoteId);
        } else {
          setError(qRes.message || "Failed to secure room pricing. Please select a room again.");
          setStep(1);
          return;
        }
      }

      if (!activeQuoteId) {
        setError("Your booking session has expired. Please choose a room to continue.");
        setStep(1);
        return;
      }

      // Safe cross-platform UUID fallback
      const idempotencyKey =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      const res = await api<{ reservationId: string; reference: string; pricing: BookingQuote["pricing"] }>(
        "/api/booking/create",
        {
          quoteId: activeQuoteId,
          guest: { name: trimmedName, email: trimmedEmail, phone: trimmedPhone },
          requests: requests.trim() || undefined,
          idempotencyKey,
        },
      );

      if (!res.ok) {
        setError(res.message);
        if (res.error === "ROOM_UNAVAILABLE" || res.error === "QUOTE_EXPIRED") {
          setStep(1);
          setQuote(null);
          setQuoteId(null);
        }
        return;
      }

      setReservationId(res.data.reservationId);
      setReference(res.data.reference);
      setStep(3);
      setMaxStepReached((prev) => Math.max(prev, 3));

      // Smooth scroll to top of booking flow container
      if (typeof window !== "undefined") {
        const container = document.getElementById("booking-flow-container");
        if (container) {
          const rect = container.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - 145;
          window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
        }
      }
    } catch (err: any) {
      console.error("Booking creation error:", err);
      setError(err?.message || "Failed to create reservation. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [quoteId, quote, name, email, phone, requests, ratePlanId, checkIn, checkOut, adults, children, roomCount, promoInput]);

  const payNow = useCallback(async () => {
    if (!reservationId) return;
    setBusy(true);
    setError(null);
    const res = await api<{ authorizationUrl: string; reference: string }>("/api/booking/pay", {
      reservationId,
      origin: window.location.origin,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    // Remember the exact Paystack reference so "verify now" can re-check it
    // after the redirect back from Paystack.
    try {
      window.localStorage.setItem("banky-ps-ref-" + reference, res.data.reference);
    } catch {
      /* storage unavailable — verify falls back to the BKS reference */
    }
    window.location.assign(res.data.authorizationUrl);
  }, [reservationId, reference]);

  const checkPayment = useCallback(async () => {
    if (!reference) return;
    setCheckingPayment(true);
    setError(null);
    // Prefer the exact Paystack reference if we saved one; the API also
    // accepts the BKS reservation reference directly.
    let psRef: string | null = null;
    try {
      psRef = window.localStorage.getItem("banky-ps-ref-" + reference);
    } catch {
      psRef = null;
    }
    const res = await api<{ status: string; paymentStatus: string }>("/api/booking/verify", {
      reference: psRef ?? reference,
    });
    setCheckingPayment(false);
    if (res.ok) {
      setConfirmed(true);
    } else {
      setError(res.message);
    }
  }, [reference]);

  const canSearch = checkIn && checkOut && checkOut > checkIn;

  /* ---------------------------------------------------------------- */
  /* Confirmation view                                                 */
  /* ---------------------------------------------------------------- */
  if (confirmed && reference) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="font-display text-3xl text-stone-900 dark:text-white mb-3">Payment Verified — Booking Confirmed</h2>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-2">
          Your reservation reference is <strong className="text-[var(--accent)]">{reference}</strong>
        </p>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-8">
          A confirmation has been sent to {email}. Present your reference at the front desk on arrival.
        </p>
        <div className="glass p-6 rounded-2xl text-left text-sm space-y-2 border border-[#ece6dd] mb-6">
          {quote && (
            <>
              <div className="flex justify-between"><span className="text-stone-600 dark:text-stone-300">Room</span><span className="font-medium">{quote.roomTypeName}</span></div>
              <div className="flex justify-between"><span className="text-stone-600 dark:text-stone-300">Dates</span><span className="font-medium">{quote.checkIn} → {quote.checkOut}</span></div>
              <div className="flex justify-between"><span className="text-stone-600 dark:text-stone-300">Guests</span><span className="font-medium">{quote.adults + quote.children}</span></div>
              <div className="flex justify-between border-t border-[#ece6dd] pt-2"><span className="text-stone-600 dark:text-stone-300">Total</span><span className="font-semibold text-[var(--accent)]">{naira(quote.pricing.grandTotal / 100)}</span></div>
            </>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/booking/confirmation?ref=${encodeURIComponent(reference)}`}
            className="btn-gold w-full sm:w-auto px-6 py-3 text-xs font-medium inline-flex items-center justify-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            <span>View &amp; Generate PDF Itinerary</span>
          </Link>
          <Link
            href="/"
            className="btn-outline-white w-full sm:w-auto px-6 py-3 text-xs font-medium inline-flex items-center justify-center gap-2"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Wizard                                                            */
  /* ---------------------------------------------------------------- */
  const STEP_CONFIG = [
    { id: 0, label: "Dates", shortDesc: "Stay & Guests", icon: Calendar },
    { id: 1, label: "Room", shortDesc: "Select Suite", icon: BedDouble },
    { id: 2, label: "Details", shortDesc: "Guest Info", icon: User },
    { id: 3, label: "Pay", shortDesc: "Payment & Confirm", icon: CreditCard },
  ] as const;

  const progressPercentage = Math.round(((step + 1) / STEP_CONFIG.length) * 100);

  return (
    <div id="booking-flow-container" className="space-y-6 sm:space-y-8">
      {/* ── Modern Minimalist Stepper ── */}
      <nav
        aria-label="Booking steps"
        className="rounded-2xl bg-white dark:bg-[#1a1815] border border-stone-200/90 dark:border-stone-800/90 p-4 sm:p-5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2">
          {STEP_CONFIG.map((item, idx) => {
            const isCurrent = idx === step;
            const isCompleted = idx < step;
            const isClickable = canJumpTo(idx);

            return (
              <div key={item.id} className="flex-1 flex items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && jumpToStep(idx)}
                  className={`group flex items-center gap-3 text-left transition-all ${
                    isClickable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 transition-all ${
                      isCurrent
                        ? "bg-[var(--accent)] text-white shadow-sm ring-4 ring-[var(--accent)]/15 font-bold"
                        : isCompleted
                        ? "bg-emerald-600 text-white font-bold"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-400 border border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4 stroke-[2.5]" /> : idx + 1}
                  </div>
                  <div className="hidden md:block min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs uppercase font-condensed tracking-wider font-semibold block transition-colors ${
                          isCurrent
                            ? "text-stone-900 dark:text-white"
                            : isClickable
                            ? "text-stone-700 dark:text-stone-300 group-hover:text-[var(--accent)]"
                            : "text-stone-400 dark:text-stone-500"
                        }`}
                      >
                        {item.label}
                      </span>
                      {isClickable && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          ↩
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 block truncate">
                      {item.shortDesc}
                    </span>
                  </div>
                </button>
                {idx < STEP_CONFIG.length - 1 && (
                  <div
                    className={`hidden sm:block flex-1 h-[2px] mx-3 lg:mx-6 rounded-full transition-colors ${
                      idx < step ? "bg-emerald-500" : "bg-stone-100 dark:bg-stone-800"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile current step indicator */}
        <div className="md:hidden mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-400">Step {step + 1} of 4:</span>
            <strong className="text-stone-900 dark:text-white font-semibold">
              {STEP_CONFIG[step].label} — {STEP_CONFIG[step].shortDesc}
            </strong>
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => jumpToStep(step - 1)}
              className="text-[var(--accent)] font-medium inline-flex items-center gap-1 hover:underline text-xs"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
          )}
        </div>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {error && (
            <div role="alert" className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">{error}</p>
            </div>
          )}

        {/* ── STEP 0: STAY DATES & OCCUPANCY ── */}
        {step === 0 && (
          <section
            className="bg-white dark:bg-[#1a1815] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-7"
            aria-label="Search availability"
          >
            <div>
              <span className="text-[11px] font-condensed uppercase tracking-wider text-[var(--accent)] font-semibold block mb-1">
                Step 01
              </span>
              <h3 className="font-display text-2xl text-stone-900 dark:text-white font-normal">
                Stay Dates &amp; Guests
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Choose your arrival and departure dates. The calendar reflects real-time room inventory.
              </p>
            </div>

            {/* Real-time Inventory Calendar Date Picker */}
            <BookingCalendarDatePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onSelectDates={(inDate, outDate) => {
                setCheckIn(inDate);
                setCheckOut(outDate);
                if (error) setError(null);
              }}
              adults={adults}
              childrenCount={children}
              roomCount={roomCount}
              minNights={1}
            />

            {/* Occupancy & Preferences */}
            <div className="pt-6 border-t border-stone-100 dark:border-stone-800">
              <span className="text-xs font-condensed uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block mb-4">
                Guests &amp; Room Configuration
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200/60 dark:border-stone-800">
                  <label htmlFor="adults" className="text-[11px] font-condensed uppercase tracking-wider text-stone-500 block mb-1">
                    Adults
                  </label>
                  <select
                    id="adults"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-semibold text-stone-900 dark:text-white outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map((a) => (
                      <option key={a} value={a} className="text-stone-900">
                        {a} {a === 1 ? "Adult" : "Adults"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200/60 dark:border-stone-800">
                  <label htmlFor="children" className="text-[11px] font-condensed uppercase tracking-wider text-stone-500 block mb-1">
                    Children
                  </label>
                  <select
                    id="children"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-semibold text-stone-900 dark:text-white outline-none cursor-pointer"
                  >
                    {[0, 1, 2, 3].map((c) => (
                      <option key={c} value={c} className="text-stone-900">
                        {c} {c === 1 ? "Child" : "Children"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200/60 dark:border-stone-800">
                  <label htmlFor="rooms" className="text-[11px] font-condensed uppercase tracking-wider text-stone-500 block mb-1">
                    Rooms
                  </label>
                  <select
                    id="rooms"
                    value={roomCount}
                    onChange={(e) => setRoomCount(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-semibold text-stone-900 dark:text-white outline-none cursor-pointer"
                  >
                    {[1, 2, 3].map((r) => (
                      <option key={r} value={r} className="text-stone-900">
                        {r} Room{r > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200/60 dark:border-stone-800">
                  <label htmlFor="promo" className="text-[11px] font-condensed uppercase tracking-wider text-stone-500 block mb-1">
                    Promo Code
                  </label>
                  <input
                    id="promo"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="e.g. VIP10"
                    className="w-full bg-transparent text-sm font-semibold text-stone-900 dark:text-white uppercase placeholder:normal-case placeholder:font-normal placeholder:text-stone-400 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={runSearch}
              disabled={!canSearch || searching}
              className="btn-gold w-full min-h-[52px] text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>{searching ? "Checking live suite availability…" : "Find Available Suites"}</span>
            </button>
          </section>
        )}

        {/* ── STEP 1: SUITE SELECTION ── */}
        {step === 1 && search && (
          <section className="space-y-5" aria-label="Select a suite">
            <div className="flex items-center justify-between pb-1">
              <div>
                <span className="text-[11px] font-condensed uppercase tracking-wider text-[var(--accent)] font-semibold block mb-0.5">
                  Step 02
                </span>
                <h3 className="font-display text-2xl text-stone-900 dark:text-white font-normal">
                  Available Suites
                </h3>
              </div>
              <button
                type="button"
                onClick={() => jumpToStep(0)}
                className="text-xs font-condensed uppercase tracking-wider text-stone-500 hover:text-[var(--accent)] inline-flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change dates
              </button>
            </div>

            {search.rooms.length === 0 && (
              <div className="bg-white dark:bg-[#1a1815] p-12 text-center rounded-2xl border border-stone-200 dark:border-stone-800">
                <Calendar className="h-10 w-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                <h4 className="font-display text-lg text-stone-800 dark:text-stone-200 mb-1">
                  No Suites Available for These Dates
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mb-5">
                  All rooms are currently reserved for the selected period. Please try choosing alternative dates.
                </p>
                <button
                  type="button"
                  onClick={() => jumpToStep(0)}
                  className="btn-gold px-6 py-2.5 text-xs font-medium"
                >
                  Modify Search
                </button>
              </div>
            )}

            {search.rooms.map((r) => (
              <div
                key={r.roomType.id}
                className={`bg-white dark:bg-[#1a1815] rounded-2xl border transition-all duration-200 p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center ${
                  r.available > 0
                    ? "border-stone-200/90 dark:border-stone-800 shadow-xs hover:border-[var(--accent)]/60"
                    : "border-stone-200/50 dark:border-stone-800/50 opacity-60"
                }`}
              >
                <div className="relative w-full sm:w-44 h-44 sm:h-36 shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900">
                  <Image
                    src={r.roomType.image}
                    alt={r.roomType.name}
                    fill
                    referrerPolicy="no-referrer"
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <h4 className="font-display text-xl text-stone-900 dark:text-white font-medium">
                        {r.roomType.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-1">
                        <span>Up to {r.roomType.maxOccupancy} Guests</span>
                        <span aria-hidden="true">·</span>
                        <span>{r.available > 0 ? `${r.available} left` : "Sold out"}</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="font-display text-xl font-bold text-stone-900 dark:text-white">
                        {naira(r.minRate / 100)}
                      </span>
                      <span className="text-xs text-stone-400 block">per night</span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 line-clamp-2 leading-relaxed">
                    {r.roomType.blurb}
                  </p>

                  <div className="pt-4 mt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-stone-400 hidden sm:inline">
                      Complimentary Breakfast · High-Speed WiFi · 24/7 Concierge
                    </span>

                    <button
                      type="button"
                      disabled={r.available <= 0 || busy}
                      onClick={() => selectRoom(r.roomType.id)}
                      className="btn-gold px-6 py-2.5 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 ml-auto cursor-pointer shadow-xs"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      <span>Select Suite</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── STEP 2: GUEST DETAILS & REVIEW ── */}
        {step === 2 && quote && (
          <section className="space-y-6" aria-label="Guest details">
            <div className="bg-white dark:bg-[#1a1815] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-6">
              <div>
                <span className="text-[11px] font-condensed uppercase tracking-wider text-[var(--accent)] font-semibold block mb-1">
                  Step 03
                </span>
                <h3 className="font-display text-2xl text-stone-900 dark:text-white font-normal">
                  Guest Information
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Please provide your contact details for booking confirmation and front-desk check-in.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="fullname" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1.5">
                    Full Name *
                  </label>
                  <input
                    id="fullname"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chief Adeleke Johnson"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/60 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 outline-none focus:border-stone-600 focus:bg-white dark:focus:bg-stone-900"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1.5">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guest@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/60 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 outline-none focus:border-stone-600 focus:bg-white dark:focus:bg-stone-900"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1.5">
                    Phone / WhatsApp *
                  </label>
                  <input
                    id="phone"
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/60 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 outline-none focus:border-stone-600 focus:bg-white dark:focus:bg-stone-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="requests" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1.5">
                    Special Requests (optional)
                  </label>
                  <textarea
                    id="requests"
                    rows={2}
                    value={requests}
                    onChange={(e) => setRequests(e.target.value)}
                    placeholder="High floor, quiet wing, anniversary setup, late check-in notice…"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/60 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 outline-none resize-none focus:border-stone-600 focus:bg-white dark:focus:bg-stone-900"
                  />
                </div>
              </div>

              {/* Optional Enhancements */}
              {addons.length > 0 && (
                <div className="pt-5 border-t border-stone-100 dark:border-stone-800 space-y-3">
                  <span className="text-xs font-condensed uppercase tracking-wider text-stone-500 font-semibold block">
                    Enhance Your Stay
                  </span>
                  <div className="space-y-2">
                    {addons.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-stone-900 dark:text-white block">
                            {a.name}
                          </span>
                          <span className="text-stone-500">
                            {naira(a.price / 100)}{" "}
                            {a.unit === "per_night" ? "per night" : a.unit === "per_person" ? "per person" : ""}
                          </span>
                        </div>

                        <select
                          aria-label={`Quantity for ${a.name}`}
                          value={addonSelection[a.id] ?? 0}
                          onChange={(e) => {
                            const qty = Number(e.target.value);
                            setAddonSelection((s) => ({ ...s, [a.id]: qty }));
                          }}
                          className="px-2 py-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          {[0, 1, 2, 3].map((n) => (
                            <option key={n} value={n}>
                              {n === 0 ? "None" : `${n}×`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => refreshQuote()}
                    className="text-xs text-[var(--accent)] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
                  >
                    {busy ? "Updating pricing…" : "Recalculate summary with selected extras"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => jumpToStep(1)}
                className="px-5 py-3 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Rooms
              </button>
              <button
                type="button"
                onClick={createBooking}
                disabled={!name || !email || !phone || busy}
                className="btn-gold flex-1 min-h-[50px] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>{busy ? "Securing suite hold…" : "Continue to Payment"}</span>
              </button>
            </div>
          </section>
        )}

        {/* ── STEP 3: PAYMENT & CONFIRMATION ── */}
        {step === 3 && reference && quote && (
          <section className="space-y-6" aria-label="Payment and confirmation">
            <div className="bg-white dark:bg-[#1a1815] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-6">
              <div>
                <span className="text-[11px] font-condensed uppercase tracking-wider text-[var(--accent)] font-semibold block mb-1">
                  Step 04
                </span>
                <h3 className="font-display text-2xl text-stone-900 dark:text-white font-normal">
                  Complete Reservation
                </h3>
                <div className="mt-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Room held for 30 minutes · Booking Reference: <strong className="font-mono">{reference}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase font-condensed tracking-wider text-stone-500 block">
                    Total Payable
                  </span>
                  <span className="font-display text-2xl font-bold text-stone-900 dark:text-white">
                    {naira(quote.pricing.grandTotal / 100)}
                  </span>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <span>{quote.nights} night{quote.nights > 1 ? "s" : ""} · {quote.roomTypeName}</span>
                  <span className="block text-emerald-600 dark:text-emerald-400 font-medium">All taxes &amp; fees included</span>
                </div>
              </div>

              {/* PAYMENT OPTION 1: PAYSTACK ONLINE */}
              {paystackEnabled ? (
                <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1a1815] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[var(--accent)]" />
                      <span>Pay Online via Paystack</span>
                    </span>
                    <span className="text-[10px] uppercase font-condensed tracking-wider font-semibold text-emerald-700 dark:text-emerald-300">
                      Cards · USSD · Bank Transfer
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Instant automatic confirmation. Pay securely with debit/credit card, USSD, or direct bank transfer.
                  </p>

                  <button
                    type="button"
                    onClick={payNow}
                    disabled={busy}
                    className="btn-gold w-full min-h-[50px] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    <span>Pay {naira(quote.pricing.grandTotal / 100)} via Paystack</span>
                  </button>

                  <button
                    type="button"
                    onClick={checkPayment}
                    disabled={checkingPayment}
                    className="w-full text-center py-1 text-xs text-stone-500 hover:text-[var(--accent)] transition-colors cursor-pointer"
                  >
                    {checkingPayment ? "Verifying with Paystack…" : "Already made payment? Verify now"}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Online Card Checkout Paused</strong>
                    <span>
                      {paymentSettings.noticeMessage ||
                        "Online card payments are temporarily offline. WhatsApp concierge and Direct Bank Transfer are active."}
                    </span>
                  </div>
                </div>
              )}

              {/* PAYMENT OPTION 2: INSTANT WHATSAPP CONFIRMATION */}
              <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    <span>Instant WhatsApp Concierge</span>
                  </span>
                  <span className="text-[10px] uppercase font-condensed tracking-wider font-semibold text-emerald-800 dark:text-emerald-300">
                    Direct Front Desk
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Message our 24/7 front desk team with your booking reference <strong>{reference}</strong> to confirm your suite instantly.
                </p>

                <a
                  href={whatsappLink(
                    [
                      `Hello ${HOTEL.name}, I would like to confirm my room reservation:`,
                      `• Reference: ${reference}`,
                      `• Guest: ${name}`,
                      `• Phone: ${phone}`,
                      `• Email: ${email}`,
                      `• Room: ${quote.roomTypeName}`,
                      `• Dates: ${quote.checkIn} to ${quote.checkOut} (${quote.nights} night${quote.nights > 1 ? "s" : ""})`,
                      `• Guests: ${quote.adults} Adult(s)${quote.children > 0 ? `, ${quote.children} Child(ren)` : ""}`,
                      `• Total: ${naira(quote.pricing.grandTotal / 100)}`,
                      requests ? `• Special Requests: ${requests}` : null,
                      `Please confirm my booking and provide check-in assistance. Thank you!`,
                    ]
                      .filter(Boolean)
                      .join("\n")
                  )}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    setTimeout(() => {
                      window.location.assign(
                        `/booking/confirmation?ref=${encodeURIComponent(reference)}&method=whatsapp`
                      );
                    }, 400);
                  }}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Confirm via WhatsApp ({HOTEL.phone})</span>
                </a>
              </div>

              {/* PAYMENT OPTION 3: DIRECT BANK TRANSFER */}
              <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1a1815] space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[var(--accent)]" />
                    <span>Direct Bank Transfer / Front Desk Settlement</span>
                  </span>
                  <span className="font-bold text-[var(--accent)] text-sm">
                    {naira(quote.pricing.grandTotal / 100)}
                  </span>
                </div>

                <div className="grid gap-2 text-xs text-stone-700 dark:text-stone-300">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Bank:</span>
                    <strong className="text-stone-900 dark:text-white font-medium">
                      {paymentSettings.bankDetails?.bankName || "Zenith Bank"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Account Name:</span>
                    <strong className="text-stone-900 dark:text-white font-medium">
                      {paymentSettings.bankDetails?.accountName || "Banky Hotel & Suites Ltd"}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-900/80 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-mono">
                        Account Number:
                      </span>
                      <span className="font-mono font-bold text-base text-stone-900 dark:text-white">
                        {paymentSettings.bankDetails?.accountNumber || "1018273645"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const num = paymentSettings.bankDetails?.accountNumber || "1018273645";
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(num);
                          setCopiedBank(true);
                          setTimeout(() => setCopiedBank(false), 2000);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:text-[var(--accent)] inline-flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      {copiedBank ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedBank ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-stone-500">
                    Transfer Narration: Please include your reference <strong>{reference}</strong> in narration.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.location.assign(
                      `/booking/confirmation?ref=${encodeURIComponent(reference)}&method=bank_transfer`
                    );
                  }}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Confirm Hold &amp; Pay via Bank Transfer</span>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => jumpToStep(2)}
                  className="text-stone-500 hover:text-[var(--accent)] inline-flex items-center gap-1 font-medium cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" /> Edit Guest Details
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStep(1)}
                  className="text-stone-500 hover:text-[var(--accent)] inline-flex items-center gap-1 font-medium cursor-pointer"
                >
                  Change Suite
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ── AUTHORITATIVE RESERVATION FOLIO SIDEBAR ── */}
      <aside
        className="rounded-2xl p-6 sm:p-7 border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-[#1a1815] shadow-xs lg:sticky lg:top-[100px] space-y-5"
        aria-live="polite"
      >
        <div className="border-b border-stone-100 dark:border-stone-800 pb-4">
          <span className="text-[11px] font-condensed uppercase tracking-wider text-[var(--accent)] font-semibold block">
            Reservation Folio
          </span>
          <h2 className="mt-1 text-xl sm:text-2xl font-display font-medium text-stone-900 dark:text-white">
            {quote ? quote.roomTypeName : "Your Stay Summary"}
          </h2>
        </div>

        {!quote ? (
          <div className="space-y-3 py-4 text-center">
            <BedDouble className="h-8 w-8 text-stone-300 dark:text-stone-700 mx-auto" />
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Select your dates and suite to see full transparent pricing, inclusive of taxes and service fees.
            </p>
            {checkIn && checkOut && (
              <div className="text-xs font-mono text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-900/60 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800">
                {checkIn} → {checkOut}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center text-stone-700 dark:text-stone-300 pb-3 border-b border-stone-100 dark:border-stone-800">
              <span className="font-medium">{quote.checkIn} → {quote.checkOut}</span>
              <span className="text-stone-500 font-mono">{quote.nights} night{quote.nights !== 1 ? "s" : ""}</span>
            </div>

            {/* Itemized pricing breakdown */}
            <div className="space-y-2 pt-1 text-stone-600 dark:text-stone-300">
              <div className="flex justify-between">
                <span>Room Rate ({quote.nights} night{quote.nights > 1 ? "s" : ""} × {quote.roomCount} room{quote.roomCount > 1 ? "s" : ""})</span>
                <span className="font-mono text-stone-900 dark:text-white font-medium">
                  {naira(quote.pricing.roomSubtotal / 100)}
                </span>
              </div>

              {quote.addons.length > 0 &&
                quote.addons.map((a) => (
                  <div key={a.id} className="flex justify-between">
                    <span>{a.name} × {a.qty}</span>
                    <span className="font-mono text-stone-900 dark:text-white">
                      {naira(a.total / 100)}
                    </span>
                  </div>
                ))}

              {quote.pricing.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount {quote.promoCode ? `(${quote.promoCode})` : ""}</span>
                  <span className="font-mono font-medium">
                    −{naira(quote.pricing.discountTotal / 100)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-stone-500">
                <span>Service charge (5%)</span>
                <span className="font-mono">{naira(quote.pricing.serviceCharge / 100)}</span>
              </div>

              <div className="flex justify-between text-stone-500">
                <span>VAT &amp; Consumption Tax (7.5%)</span>
                <span className="font-mono">{naira(quote.pricing.taxTotal / 100)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] uppercase font-condensed tracking-wider text-stone-500 block">
                  Total Amount
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Full payment · No split balance
                </span>
              </div>
              <span className="font-display text-2xl font-bold text-stone-900 dark:text-white">
                {naira(quote.pricing.grandTotal / 100)}
              </span>
            </div>

            {quote.cancellationDeadline && (
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                {quote.cancellationPolicy === "non_refundable"
                  ? "Non-refundable promotional rate."
                  : `Free cancellation until ${quote.cancellationDeadline}.`}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <>
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20 bg-[#1b1b1b] dark:bg-[#1a1a1d] overflow-hidden">
        {/* Baseline Header Image — Luxury Hotel Exterior */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/exterior-night.jpg"
          alt="Banky Hotel & Suites Exterior at Night"
          className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b1b] dark:from-[#202023] via-[#1b1b1b]/70 to-[#1b1b1b]/85" />
        <div className="container-x relative z-10 text-center">
          <span className="eyebrow text-[var(--accent)] block mb-3">Online Reservations</span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white mb-4">Book Your Stay</h1>
          <p className="text-sm text-stone-200 max-w-xl mx-auto">
            Real-time availability, transparent pricing, and secure Paystack payments — confirmed the moment your payment is verified.
          </p>
        </div>
      </section>
      <section className="py-10 sm:py-16 md:py-20 bg-white dark:bg-[#202023]">
        <div className="container-x">
          <Suspense fallback={<div className="text-center py-20 text-stone-400">Loading booking form…</div>}>
            <BookingFlow />
          </Suspense>
        </div>
      </section>
    </>
  );
}
