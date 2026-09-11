"use client";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { naira } from "@/lib/hotel";
import type { AvailabilityResult, BookingQuote, BookingErrorCode } from "@/lib/booking/types";

/* ------------------------------------------------------------------ */
/* Typed API client                                                    */
/* ------------------------------------------------------------------ */

async function api<T>(url: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: BookingErrorCode; message: string }> {
  const res = await fetch(url, {
    method: body !== undefined ? "POST" : "GET",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.ok) return json as { ok: true; data: T };
  return json as { ok: false; error: BookingErrorCode; message: string };
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
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomCount, setRoomCount] = useState(1);
  const [promoInput, setPromoInput] = useState("");
  const [search, setSearch] = useState<AvailabilityResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [ratePlans, setRatePlans] = useState<RatePlanSummary[]>([]);
  const [ratePlanId, setRatePlanId] = useState("flexible");

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
    const res = await api<AvailabilityResult>("/api/booking/search", {
      checkIn,
      checkOut,
      adults,
      children,
      roomCount,
    });
    setSearching(false);
    if (!res.ok) {
      setError(res.message);
      setSearch(null);
      return;
    }
    setSearch(res.data);
    setQuote(null);
    if (res.data.rooms.every((r) => r.available <= 0)) {
      setError("No rooms are available for these dates. Please try different dates.");
    }
  }, [checkIn, checkOut, adults, children, roomCount]);

  const selectRoom = useCallback(
    async (roomTypeId: string) => {
      setBusy(true);
      setError(null);
      const addonIds = Object.entries(addonSelection)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, qty }));
      const res = await api<{ quote: BookingQuote; quoteId: string }>("/api/booking/quote", {
        roomTypeId,
        ratePlanId,
        checkIn,
        checkOut,
        adults,
        children,
        roomCount,
        promoCode: promoInput || undefined,
        addonIds,
      });
      setBusy(false);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setQuote(res.data.quote);
      setQuoteId(res.data.quoteId);
      setStep(2);
    },
    [addonSelection, checkIn, checkOut, adults, children, roomCount, promoInput, ratePlanId],
  );

  const refreshQuote = useCallback(
    async (withPromo?: string) => {
      if (!quote) return;
      setBusy(true);
      setError(null);
      const addonIds = Object.entries(addonSelection)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, qty }));
      const res = await api<{ quote: BookingQuote; quoteId: string }>("/api/booking/quote", {
        roomTypeId: quote.roomTypeId,
        ratePlanId: quote.ratePlanId,
        checkIn,
        checkOut,
        adults,
        children,
        roomCount,
        promoCode: withPromo || undefined,
        addonIds,
      });
      setBusy(false);
      if (res.ok) {
        setQuote(res.data.quote);
        setQuoteId(res.data.quoteId);
      } else {
        setError(res.message);
      }
    },
    [quote, addonSelection, checkIn, checkOut, adults, children, roomCount],
  );

  const createBooking = useCallback(async () => {
    if (!quoteId) return;
    setBusy(true);
    setError(null);
    const idempotencyKey = crypto.randomUUID();
    const res = await api<{ reservationId: string; reference: string; pricing: BookingQuote["pricing"] }>(
      "/api/booking/create",
      { quoteId, guest: { name, email, phone }, requests, idempotencyKey },
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      if (res.error === "ROOM_UNAVAILABLE") {
        setStep(1);
        setQuote(null);
      }
      return;
    }
    setReservationId(res.data.reservationId);
    setReference(res.data.reference);
    setStep(3);
  }, [quoteId, name, email, phone, requests]);

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
        <div className="glass p-6 rounded-md text-left text-sm space-y-2 border border-[#ece6dd]">
          {quote && (
            <>
              <div className="flex justify-between"><span className="text-stone-600 dark:text-stone-300">Room</span><span className="font-medium">{quote.roomTypeName}</span></div>
              <div className="flex justify-between"><span className="text-stone-600 dark:text-stone-300">Dates</span><span className="font-medium">{quote.checkIn} → {quote.checkOut}</span></div>
              <div className="flex justify-between"><span className="text-stone-600 dark:text-stone-300">Guests</span><span className="font-medium">{quote.adults + quote.children}</span></div>
              <div className="flex justify-between border-t border-[#ece6dd] pt-2"><span className="text-stone-600 dark:text-stone-300">Total</span><span className="font-semibold text-[var(--accent)]">{naira(quote.pricing.grandTotal / 100)}</span></div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Wizard                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        {/* Stepper */}
        <ol className="flex items-center gap-2 text-xs font-condensed uppercase tracking-wider" aria-label="Booking progress">
          {STEPS.map((s, i) => (
            <li key={s} className={`flex items-center gap-2 ${i === step ? "text-[var(--accent)] font-medium" : i < step ? "text-emerald-600" : "text-stone-400"}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs border ${i === step ? "border-[var(--accent)]" : i < step ? "border-emerald-500 bg-emerald-50" : "border-stone-300"}`}>
                {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {s}
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-stone-300" aria-hidden />}
            </li>
          ))}
        </ol>

        {error && (
          <div role="alert" className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">{error}</p>
          </div>
        )}

        {/* Step 0 — Search */}
        {step === 0 && (
          <section className="glass p-6 rounded-md space-y-5 border border-[#ece6dd]/80" aria-label="Search availability">
            <div className="flex items-center gap-2 border-b border-[#ece6dd]/60 pb-3">
              <span className="h-6 w-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium flex items-center justify-center">1</span>
              <h3 className="font-display text-xl text-stone-900 dark:text-white font-normal">Stay Dates &amp; Guests</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkin" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Check-in Date</label>
                <input id="checkin" type="date" required value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none text-stone-900 dark:text-white" />
              </div>
              <div>
                <label htmlFor="checkout" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Check-out Date</label>
                <input id="checkout" type="date" required value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none text-stone-900 dark:text-white" />
              </div>
              <div>
                <label htmlFor="adults" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Adults</label>
                <select id="adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none text-stone-900 dark:text-white">
                  {[1, 2, 3, 4, 5].map((a) => <option key={a} value={a}>{a} {a === 1 ? "Adult" : "Adults"}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="children" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Children</label>
                <select id="children" value={children} onChange={(e) => setChildren(Number(e.target.value))} className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none text-stone-900 dark:text-white">
                  {[0, 1, 2, 3].map((c) => <option key={c} value={c}>{c} {c === 1 ? "Child" : "Children"}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="rooms" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Rooms</label>
                <select id="rooms" value={roomCount} onChange={(e) => setRoomCount(Number(e.target.value))} className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none text-stone-900 dark:text-white">
                  {[1, 2, 3].map((r) => <option key={r} value={r}>{r} Room{r > 1 ? "s" : ""}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="promo" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Promo Code (optional)</label>
                <input id="promo" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none placeholder:text-stone-400 text-stone-900 dark:text-white" />
              </div>
            </div>

            {ratePlans.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ratePlans.map((p) => {
                  const selected = ratePlanId === p.id;
                  const badge =
                    p.priceModifier.type === "percent" && p.priceModifier.value < 0
                      ? `Save ${Math.abs(p.priceModifier.value)}%`
                      : p.depositPercent >= 100
                        ? "Pay in full"
                        : `${p.depositPercent}% deposit`;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRatePlanId(p.id)}
                      aria-pressed={selected}
                      className={`text-left p-4 rounded-lg border transition-all ${selected ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm" : "border-[#ece6dd] hover:border-[var(--accent)]/50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-stone-900 dark:text-white">{p.name}</span>
                        <span className={`text-[0.65rem] font-condensed uppercase tracking-wider px-1.5 py-0.5 rounded ${selected ? "bg-[var(--accent)] text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-500"}`}>{badge}</span>
                      </div>
                      {p.description && <p className="text-[0.68rem] text-stone-500 dark:text-stone-400 mt-1.5 line-clamp-2">{p.description}</p>}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={runSearch}
              disabled={!canSearch || searching}
              className="btn-gold w-full min-h-[52px] text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>{searching ? "Checking availability…" : "Check Availability"}</span>
            </button>
          </section>
        )}

        {/* Step 1 — Room selection */}
        {step === 1 && search && (
          <section className="space-y-4" aria-label="Select a room">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-stone-900 dark:text-white">Available Rooms</h3>
              <button type="button" onClick={() => setStep(0)} className="text-xs font-condensed uppercase tracking-wider text-stone-500 hover:text-[var(--accent)] inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Change dates
              </button>
            </div>
            {search.rooms.length === 0 && (
              <div className="glass p-8 text-center rounded-md border border-[#ece6dd]">
                <Calendar className="h-8 w-8 text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-600 dark:text-stone-300">No rooms are available for these dates. Please change your dates or guest count.</p>
              </div>
            )}
            {search.rooms.map((r) => (
              <div key={r.roomType.id} className={`glass p-5 rounded-md border ${r.available > 0 ? "border-[#ece6dd]" : "border-[#ece6dd]/50 opacity-60"} flex gap-4`}>
                <img src={r.roomType.image} alt={r.roomType.name} className="hidden sm:block w-28 h-28 object-cover rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display text-lg text-stone-900 dark:text-white">{r.roomType.name}</h4>
                    <span className="text-sm font-medium text-[var(--accent)]">{naira(r.minRate / 100)} <span className="text-xs text-stone-400">/ night</span></span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">{r.roomType.blurb}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-xs font-condensed uppercase tracking-wider ${r.available > 0 ? "text-emerald-600" : "text-stone-400"}`}>
                      {r.available > 0 ? `${r.available} available` : "Sold out for these dates"}
                    </span>
                    <button
                      type="button"
                      disabled={r.available <= 0 || busy}
                      onClick={() => selectRoom(r.roomType.id)}
                      className="btn-gold px-5 py-2.5 text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Select <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Step 2 — Guest details + review */}
        {step === 2 && quote && (
          <section className="space-y-6" aria-label="Guest details">
            <div className="glass p-6 rounded-md space-y-5 border border-[#ece6dd]/80">
              <div className="flex items-center gap-2 border-b border-[#ece6dd]/60 pb-3">
                <span className="h-6 w-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium flex items-center justify-center">3</span>
                <h3 className="font-display text-xl text-stone-900 dark:text-white font-normal">Primary Guest Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label htmlFor="fullname" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Full Name</label>
                  <input id="fullname" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chief Adeleke Johnson" className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none placeholder:text-stone-400 text-stone-900 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="email" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Email Address</label>
                  <input id="email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guest@domain.com" className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none placeholder:text-stone-400 text-stone-900 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="phone" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Phone / WhatsApp</label>
                  <input id="phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none placeholder:text-stone-400 text-stone-900 dark:text-white" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="requests" className="text-xs font-condensed uppercase tracking-wider text-stone-700 dark:text-stone-300 font-medium block mb-1">Special Requests</label>
                  <textarea id="requests" rows={2} value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="High floor, quiet wing, anniversary setup…" className="w-full border-b border-[#ece6dd] py-2 text-base bg-transparent outline-none resize-none placeholder:text-stone-400 text-stone-900 dark:text-white" />
                </div>
              </div>
            </div>

            {/* Extras */}
            {addons.length > 0 && (
              <div className="glass p-6 rounded-md space-y-3 border border-[#ece6dd]/80">
                <h3 className="font-display text-lg text-stone-900 dark:text-white font-normal">Enhance Your Stay</h3>
                {addons.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#ece6dd]/60 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm text-stone-900 dark:text-white font-medium">{a.name}</p>
                      <p className="text-xs text-stone-500">{naira(a.price / 100)} {a.unit === "per_night" ? "per night" : a.unit === "per_person" ? "per person" : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        aria-label={`Quantity for ${a.name}`}
                        value={addonSelection[a.id] ?? 0}
                        onChange={(e) => {
                          const qty = Number(e.target.value);
                          setAddonSelection((s) => ({ ...s, [a.id]: qty }));
                        }}
                        className="border border-[#ece6dd] rounded px-2 py-1 text-sm bg-transparent text-stone-900 dark:text-white"
                      >
                        {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n === 0 ? "—" : n}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => refreshQuote()} className="btn-gold w-full py-2.5 text-xs font-medium">
                  {busy ? "Recalculating…" : "Apply extras & update price"}
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-outline-white px-6 py-3 text-xs font-medium inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={createBooking}
                disabled={!name || !email || !phone || busy}
                className="btn-gold flex-1 min-h-[52px] text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>{busy ? "Reserving your room…" : "Reserve & Continue to Payment"}</span>
              </button>
            </div>
          </section>
        )}

        {/* Step 3 — Payment */}
        {step === 3 && reference && quote && (
          <section className="glass p-6 rounded-md space-y-5 border border-[#ece6dd]/80" aria-label="Payment">
            <div className="flex items-center gap-2 border-b border-[#ece6dd]/60 pb-3">
              <span className="h-6 w-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium flex items-center justify-center">4</span>
              <h3 className="font-display text-xl text-stone-900 dark:text-white font-normal">Secure Your Reservation</h3>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
              Room held for 30 minutes — reference <strong>{reference}</strong>. Complete payment to confirm.
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Pay the deposit of <strong>{naira(quote.pricing.depositDue / 100)}</strong> now with Paystack (cards, bank transfer, USSD). The balance of {naira(quote.pricing.balanceDue / 100)} is due at the hotel.
            </p>
            <button type="button" onClick={payNow} disabled={busy} className="btn-gold w-full min-h-[52px] text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              <span>Pay {naira(quote.pricing.depositDue / 100)} with Paystack</span>
            </button>
            <button type="button" onClick={checkPayment} disabled={checkingPayment} className="w-full py-3 text-xs font-condensed uppercase tracking-wider text-stone-600 dark:text-stone-300 hover:text-[var(--accent)] transition-colors">
              {checkingPayment ? "Verifying payment…" : "I've completed payment — verify now"}
            </button>
          </section>
        )}
      </div>

      {/* Sidebar: authoritative price breakdown */}
      <aside className="h-fit rounded-xl p-6 sm:p-8 space-y-4 border border-[#ece6dd]/80 bg-white dark:bg-[#1a1815] shadow-md lg:sticky lg:top-28" aria-live="polite">
        <div>
          <span className="eyebrow text-[var(--accent)] font-medium">Stay Breakdown</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-display font-normal text-stone-900 dark:text-white">
            {quote ? quote.roomTypeName : "Your Selection"}
          </h2>
        </div>

        {!quote && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Search your dates and select a room — the full price breakdown, taxes and charges will appear here, calculated by our reservations system.
          </p>
        )}

        {quote && (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-stone-600 dark:text-stone-300">{quote.checkIn} → {quote.checkOut}</span><span className="text-stone-500">{quote.nights} night{quote.nights !== 1 ? "s" : ""}</span></div>
            <div className="border-t border-[#ece6dd] dark:border-[#2e2b26] pt-2.5 space-y-2">
              {quote.nightlyRates.map((r, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-stone-500 dark:text-stone-400">Night {i + 1} · {quote.roomTypeName}</span>
                  <span className="text-stone-700 dark:text-stone-200">{naira(r / 100)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">Rooms</span>
                <span className="text-stone-700 dark:text-stone-200">× {quote.roomCount}</span>
              </div>
            </div>
            {quote.addons.length > 0 && (
              <div className="border-t border-[#ece6dd] dark:border-[#2e2b26] pt-2.5 space-y-2">
                {quote.addons.map((a) => (
                  <div key={a.id} className="flex justify-between text-xs">
                    <span className="text-stone-500 dark:text-stone-400">{a.name} × {a.qty}</span>
                    <span className="text-stone-700 dark:text-stone-200">{naira(a.total / 100)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-[#ece6dd] dark:border-[#2e2b26] pt-2.5 space-y-2">
              <div className="flex justify-between text-xs"><span className="text-stone-500 dark:text-stone-400">Rooms subtotal</span><span className="text-stone-700 dark:text-stone-200">{naira(quote.pricing.roomSubtotal / 100)}</span></div>
              {quote.pricing.discountTotal > 0 && (
                <div className="flex justify-between text-xs text-emerald-600"><span>Discount {quote.promoCode ? `(${quote.promoCode})` : ""}</span><span>−{naira(quote.pricing.discountTotal / 100)}</span></div>
              )}
              <div className="flex justify-between text-xs"><span className="text-stone-500 dark:text-stone-400">Service charge (5%)</span><span className="text-stone-700 dark:text-stone-200">{naira(quote.pricing.serviceCharge / 100)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-stone-500 dark:text-stone-400">VAT (7.5%)</span><span className="text-stone-700 dark:text-stone-200">{naira(quote.pricing.taxTotal / 100)}</span></div>
              <div className="flex justify-between border-t border-[#ece6dd] dark:border-[#2e2b26] pt-2.5 text-base sm:text-lg font-medium text-stone-900 dark:text-white">
                <span>Total</span>
                <span className="text-[var(--accent)]">{naira(quote.pricing.grandTotal / 100)}</span>
              </div>
              <div className="flex justify-between text-xs"><span className="text-stone-500 dark:text-stone-400">Deposit due now</span><span className="text-stone-700 dark:text-stone-200 font-medium">{naira(quote.pricing.depositDue / 100)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-stone-500 dark:text-stone-400">Balance at hotel</span><span className="text-stone-700 dark:text-stone-200">{naira(quote.pricing.balanceDue / 100)}</span></div>
            </div>
            {quote.cancellationDeadline && (
              <p className="text-[0.68rem] text-stone-500 dark:text-stone-400 pt-2 border-t border-[#ece6dd] dark:border-[#2e2b26]">
                {quote.cancellationPolicy === "non_refundable"
                  ? "Non-refundable rate."
                  : `Free cancellation until ${quote.cancellationDeadline}.`}
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export default function BookingPage() {
  return (
    <>
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20 bg-[#1b1b1b]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b1b1b] via-[#1b1b1b]/80 to-[#1b1b1b]" />
        <div className="container-x relative z-10 text-center">
          <span className="eyebrow text-[var(--accent)] block mb-3">Online Reservations</span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white mb-4">Book Your Stay</h1>
          <p className="text-sm text-stone-300 max-w-xl mx-auto">
            Real-time availability, transparent pricing, and secure Paystack payments — confirmed the moment your payment is verified.
          </p>
        </div>
      </section>
      <section className="py-10 sm:py-16 md:py-20 bg-white dark:bg-[#121212]">
        <div className="container-x">
          <Suspense fallback={<div className="text-center py-20 text-stone-400">Loading booking form…</div>}>
            <BookingFlow />
          </Suspense>
        </div>
      </section>
    </>
  );
}
