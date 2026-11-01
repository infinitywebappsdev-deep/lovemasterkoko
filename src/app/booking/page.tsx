"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Info,
  Loader2,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { HOTEL, naira, whatsappLink } from "@/lib/hotel";
import type { AvailabilityResult, BookingErrorCode, BookingQuote } from "@/lib/booking/types";
import { BookingCalendarDatePicker } from "@/components/booking/BookingCalendarDatePicker";
import { usePaymentSettings } from "@/lib/settings/usePaymentSettings";

/* ------------------------------------------------------------------ */
/*  Typed API client                                                   */
/* ------------------------------------------------------------------ */

type ApiReply<T> = { ok: true; data: T } | { ok: false; error: BookingErrorCode; message: string };

async function api<T>(url: string, body?: unknown): Promise<ApiReply<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json();
    return json as ApiReply<T>;
  } catch (err) {
    const aborted = (err as { name?: string })?.name === "AbortError";
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: aborted ? "The request timed out. Please try again." : "Network error. Check your connection.",
    };
  } finally {
    clearTimeout(timer);
  }
}

type RatePlanSummary = {
  id: string;
  name: string;
  description: string;
  cancellationPolicy: string;
  freeCancellationDays: number;
  depositPercent: number;
  minNights: number;
};

type Addon = { id: string; name: string; price: number; unit?: string; description?: string };

const STEPS = ["Dates", "Room", "Details", "Payment"] as const;

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

/* ------------------------------------------------------------------ */
/*  Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function Stepper({ step, reachable, onJump }: { step: number; reachable: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        const canJump = i <= reachable && i !== step;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => canJump && onJump(i)}
              disabled={!canJump}
              className={`flex items-center gap-2 rounded-full transition-opacity ${canJump ? "hover:opacity-70" : ""}`}
            >
              <span
                className={`step-dot ${active ? "step-dot-active" : ""} ${done ? "step-dot-done" : ""}`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={`hidden text-[0.66rem] font-medium uppercase tracking-[0.16em] sm:inline ${
                  active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                }`}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span className={`h-px w-5 sm:w-8 ${done ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-[0.84rem] ${muted ? "text-[var(--text-muted)]" : ""}`}>
      <span>{label}</span>
      <span className={muted ? "" : "font-medium"}>{value}</span>
    </div>
  );
}

function Notice({ kind, children }: { kind: "error" | "info" | "ok"; children: React.ReactNode }) {
  const styles =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
      : kind === "ok"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        : "border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-secondary)]";
  const Icon = kind === "error" ? AlertCircle : kind === "ok" ? CheckCircle2 : Info;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[0.82rem] leading-relaxed ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkout                                                           */
/* ------------------------------------------------------------------ */

function BookingFlow() {
  const sp = useSearchParams();

  const [step, setStep] = useState(0);
  const [reachable, setReachable] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyRoom, setBusyRoom] = useState<string | null>(null);

  // Search state
  const today = useMemo(todayISO, []);
  const [checkIn, setCheckIn] = useState(sp.get("checkIn") || today);
  const [checkOut, setCheckOut] = useState(sp.get("checkOut") || addDaysISO(sp.get("checkIn") || today, 2));
  const [adults, setAdults] = useState(Math.max(1, Number(sp.get("adults")) || 2));
  const [children, setChildren] = useState(Math.max(0, Number(sp.get("children")) || 0));
  const [roomCount, setRoomCount] = useState(Math.max(1, Number(sp.get("rooms")) || 1));

  const [search, setSearch] = useState<AvailabilityResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Rate plans, promo, add-ons
  const [ratePlans, setRatePlans] = useState<RatePlanSummary[]>([]);
  const [ratePlanId, setRatePlanId] = useState("flexible");
  const [promoInput, setPromoInput] = useState("");
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonSelection, setAddonSelection] = useState<Record<string, number>>({});

  // Quote
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  // Guest
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");

  // Reservation / payment
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [reservedVia, setReservedVia] = useState<"website" | "whatsapp">("website");
  const [confirmed, setConfirmed] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [copied, setCopied] = useState(false);

  const { paystackEnabled, settings: paymentSettings } = usePaymentSettings();

  const nights = useMemo(() => {
    const a = new Date(`${checkIn}T12:00:00`).getTime();
    const b = new Date(`${checkOut}T12:00:00`).getTime();
    const n = Math.round((b - a) / 86_400_000);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [checkIn, checkOut]);

  const advance = useCallback((next: number) => {
    setStep(next);
    setReachable((prev) => Math.max(prev, next));
    if (typeof window !== "undefined") {
      const el = document.getElementById("checkout");
      if (el) window.scrollTo({ top: el.offsetTop - 140, behavior: "smooth" });
    }
  }, []);

  // Load rate plans and add-ons once
  useEffect(() => {
    api<{ addons: Addon[] }>("/api/booking/addons").then((r) => {
      if (r.ok) setAddons(r.data.addons);
    });
    api<{ ratePlans: RatePlanSummary[] }>("/api/booking/rate-plans").then((r) => {
      if (r.ok && r.data.ratePlans.length) setRatePlans(r.data.ratePlans);
    });
  }, []);

  const runSearch = useCallback(async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError("Please choose a check-out date after your check-in date.");
      return;
    }
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
    setQuoteId(null);
    if (res.data.rooms.every((r) => r.available <= 0)) {
      setError("No rooms are left for these dates. Try shifting your stay by a night.");
      return;
    }
    advance(1);
  }, [checkIn, checkOut, adults, children, roomCount, advance]);

  // Auto-search when arriving from the header/search bar
  useEffect(() => {
    if (sp.get("autosearch") === "true" && checkIn && checkOut && !search && !searching) {
      void runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRoom = useCallback(
    async (roomTypeId: string) => {
      setBusy(true);
      setBusyRoom(roomTypeId);
      setError(null);
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
      setBusy(false);
      setBusyRoom(null);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setQuote(res.data.quote);
      setQuoteId(res.data.quoteId);
      advance(2);
    },
    [addonSelection, checkIn, checkOut, adults, children, roomCount, promoInput, ratePlanId, advance],
  );

  const refreshQuote = useCallback(
    async (opts?: { promo?: string; addons?: Record<string, number>; silent?: boolean }) => {
      if (!quote) return;
      const selection = opts?.addons ?? addonSelection;
      const addonIds = Object.entries(selection)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, qty }));
      if (!opts?.silent) setBusy(true);
      setError(null);
      const res = await api<{ quote: BookingQuote; quoteId: string }>("/api/booking/quote", {
        roomTypeId: quote.roomTypeId,
        ratePlanId: quote.ratePlanId || ratePlanId,
        checkIn,
        checkOut,
        adults,
        children,
        roomCount,
        promoCode: opts?.promo ?? promoInput ?? undefined,
        addonIds,
      });
      if (!opts?.silent) setBusy(false);
      if (res.ok) {
        setQuote(res.data.quote);
        setQuoteId(res.data.quoteId);
      } else {
        setError(res.message);
      }
    },
    [quote, addonSelection, checkIn, checkOut, adults, children, roomCount, promoInput, ratePlanId],
  );

  const reservationMessage = useCallback(
    (ref: string) =>
      [
        `Hello ${HOTEL.name}, I have just reserved a room and would like to confirm.`,
        "",
        `Reference: ${ref}`,
        quote ? `Room: ${quote.roomTypeName} (${quote.roomCount} room${quote.roomCount > 1 ? "s" : ""})` : null,
        `Dates: ${checkIn} → ${checkOut} (${nights} night${nights === 1 ? "" : "s"})`,
        `Guests: ${adults} adult${adults === 1 ? "" : "s"}${children ? `, ${children} child${children === 1 ? "" : "ren"}` : ""}`,
        name.trim() ? `Name: ${name.trim()}` : null,
        phone.trim() ? `Phone: ${phone.trim()}` : null,
        quote ? `Total: ${naira(quote.pricing.grandTotal / 100)}` : null,
        "",
        "Please confirm the room and send payment instructions.",
      ]
        .filter(Boolean)
        .join("\n"),
    [quote, checkIn, checkOut, nights, adults, children, name, phone],
  );

  const createBooking = useCallback(
    async (channel: "website" | "whatsapp") => {
      if (!name.trim() || !email.trim() || !phone.trim()) {
        setError("Please add your name, email and phone number.");
        return;
      }
      setBusy(true);
      setError(null);

      try {
        let activeQuoteId = quoteId;
        if (!activeQuoteId && quote) {
          const again = await api<{ quote: BookingQuote; quoteId: string }>("/api/booking/quote", {
            roomTypeId: quote.roomTypeId,
            ratePlanId: quote.ratePlanId || ratePlanId,
            checkIn,
            checkOut,
            adults,
            children,
            roomCount,
            promoCode: promoInput || undefined,
          });
          if (!again.ok) {
            setError(again.message);
            advance(1);
            return;
          }
          activeQuoteId = again.data.quoteId;
          setQuote(again.data.quote);
          setQuoteId(again.data.quoteId);
        }
        if (!activeQuoteId) {
          setError("Your quote expired. Pick a room again to continue.");
          advance(1);
          return;
        }

        const idempotencyKey =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        const res = await api<{ reservationId: string; reference: string }>("/api/booking/create", {
          quoteId: activeQuoteId,
          guest: { name: name.trim(), email: email.trim(), phone: phone.trim() },
          requests: requests.trim() || undefined,
          idempotencyKey,
          channel,
        });

        if (!res.ok) {
          setError(res.message);
          if (res.error === "ROOM_UNAVAILABLE" || res.error === "QUOTE_EXPIRED") {
            setQuote(null);
            setQuoteId(null);
            advance(1);
          }
          return;
        }

        setReservationId(res.data.reservationId);
        setReference(res.data.reference);
        setReservedVia(channel);
        advance(3);

        if (channel === "whatsapp" && typeof window !== "undefined") {
          const url = whatsappLink(reservationMessage(res.data.reference));
          setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 350);
        }
      } catch {
        setError("We could not create the reservation. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [
      name,
      email,
      phone,
      requests,
      quoteId,
      quote,
      ratePlanId,
      checkIn,
      checkOut,
      adults,
      children,
      roomCount,
      promoInput,
      reservationMessage,
      advance,
    ],
  );

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
    try {
      window.localStorage.setItem(`banky-ps-ref-${reference}`, res.data.reference);
    } catch {
      /* storage blocked — verify falls back to the BKS reference */
    }
    window.location.assign(res.data.authorizationUrl);
  }, [reservationId, reference]);

  const verifyPayment = useCallback(async () => {
    if (!reference) return;
    setCheckingPayment(true);
    setError(null);
    let psRef: string | null = null;
    try {
      psRef = window.localStorage.getItem(`banky-ps-ref-${reference}`);
    } catch {
      psRef = null;
    }
    const res = await api<{ status: string; paymentStatus: string }>("/api/booking/verify", {
      reference: psRef ?? reference,
    });
    setCheckingPayment(false);
    if (res.ok) setConfirmed(true);
    else setError(res.message);
  }, [reference]);

  const copyAccount = async () => {
    const acc = paymentSettings.bankDetails?.accountNumber;
    if (!acc) return;
    try {
      await navigator.clipboard.writeText(acc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const addonQuantity = (id: string) => addonSelection[id] ?? 0;

  const setAddon = (id: string, qty: number) => {
    const next = { ...addonSelection, [id]: Math.max(0, qty) };
    setAddonSelection(next);
    void refreshQuote({ addons: next });
  };

  /* ── Confirmed ─────────────────────────────────────────────────── */
  if (confirmed && reference) {
    return (
      <div className="card mx-auto max-w-2xl p-8 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="display-sm mt-5">Payment received — your stay is confirmed</h2>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--text-muted)]">
          Reference <strong className="text-[var(--text-primary)]">{reference}</strong>. A confirmation has been
          sent to {email || "your email"}. Quote the reference at the front desk on arrival.
        </p>
        {quote && (
          <div className="mt-6 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 text-left">
            <SummaryRow label="Room" value={quote.roomTypeName} />
            <SummaryRow label="Stay" value={`${fmtDate(quote.checkIn)} → ${fmtDate(quote.checkOut)}`} />
            <SummaryRow label="Nights" value={quote.nights} />
            <SummaryRow label="Total paid" value={naira(quote.pricing.grandTotal / 100)} />
          </div>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href={`/booking/confirmation?ref=${encodeURIComponent(reference)}`} className="btn-gold">
            View itinerary
          </Link>
          <a
            href={whatsappLink(reservationMessage(reference))}
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
          >
            Message the front desk
          </a>
        </div>
      </div>
    );
  }

  const roomCountLabel = `${roomCount} room${roomCount > 1 ? "s" : ""}`;

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Main column */}
      <div className="lg:col-span-7 xl:col-span-8">
        <Stepper step={step} reachable={reachable} onJump={(i) => advance(i)} />

        {error && (
          <div className="mt-6">
            <Notice kind="error">{error}</Notice>
          </div>
        )}

        {/* Step 1 — Dates */}
        {step === 0 && (
          <div className="mt-7 space-y-6">
            <div className="card p-5 sm:p-6">
              <h2 className="font-display text-2xl">When are you staying?</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="col-span-2 block sm:col-span-1">
                  <span className="field-label">Check in</span>
                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCheckIn(next);
                      if (next && (!checkOut || checkOut <= next)) setCheckOut(addDaysISO(next, 1));
                    }}
                    className="field"
                  />
                </label>
                <label className="col-span-2 block sm:col-span-1">
                  <span className="field-label">Check out</span>
                  <input
                    type="date"
                    value={checkOut}
                    min={addDaysISO(checkIn, 1)}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Adults</span>
                  <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="field">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Rooms</span>
                  <select value={roomCount} onChange={(e) => setRoomCount(Number(e.target.value))} className="field">
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-[0.8rem] text-[var(--text-muted)]">
                  Children
                  <span className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] hover:border-[var(--text-primary)]"
                      aria-label="Fewer children"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-4 text-center tabular-nums text-[var(--text-primary)]">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren(Math.min(6, children + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] hover:border-[var(--text-primary)]"
                      aria-label="More children"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </span>
                </label>
                {nights > 0 && (
                  <span className="text-[0.8rem] text-[var(--text-muted)]">
                    {nights} night{nights > 1 ? "s" : ""} · {adults + children} guest{adults + children > 1 ? "s" : ""} · {roomCountLabel}
                  </span>
                )}
              </div>

              <button type="button" onClick={runSearch} disabled={searching} className="btn-gold mt-6 w-full sm:w-auto">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                {searching ? "Checking availability" : "Search rooms"}
              </button>
            </div>

            <div className="card overflow-hidden p-1">
              <BookingCalendarDatePicker
                checkIn={checkIn}
                checkOut={checkOut}
                onSelectDates={(a, b) => {
                  setCheckIn(a);
                  setCheckOut(b);
                }}
                adults={adults}
                childrenCount={children}
                roomCount={roomCount}
              />
            </div>
          </div>
        )}

        {/* Step 2 — Room */}
        {step === 1 && (
          <div className="mt-7 space-y-6">
            <div className="card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.82rem]">
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
                  {fmtDate(checkIn)} → {fmtDate(checkOut)}
                </span>
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <Users className="h-4 w-4 text-[var(--accent)]" />
                  {adults} adult{adults > 1 ? "s" : ""}{children ? `, ${children} child${children > 1 ? "ren" : ""}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => advance(0)}
                className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[var(--accent)]"
              >
                Change dates
              </button>
            </div>

            {/* Rate plan */}
            {ratePlans.length > 0 && (
              <div>
                <h3 className="text-[0.66rem] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Rate plan
                </h3>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {ratePlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setRatePlanId(plan.id)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        ratePlanId === plan.id
                          ? "border-[var(--text-primary)] bg-[var(--surface-alt)]"
                          : "border-[var(--border)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[0.86rem] font-medium">{plan.name}</span>
                        {ratePlanId === plan.id && <Check className="h-4 w-4 text-[var(--accent)]" />}
                      </span>
                      <span className="mt-1 block text-[0.74rem] leading-relaxed text-[var(--text-muted)]">
                        {plan.description ||
                          (plan.freeCancellationDays > 0
                            ? `Free cancellation up to ${plan.freeCancellationDays} day${plan.freeCancellationDays > 1 ? "s" : ""} before arrival.`
                            : "Non-refundable rate.")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Promo */}
            <div className="card p-4 sm:p-5">
              <label className="block">
                <span className="field-label">Promo code</span>
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Optional"
                    className="field"
                  />
                  <button
                    type="button"
                    onClick={() => void refreshQuote({ promo: promoInput })}
                    disabled={!quote || busy}
                    className="btn-outline shrink-0 px-5 py-3"
                  >
                    Apply
                  </button>
                </div>
              </label>
              {quote?.promoMessage && (
                <p className={`mt-2 text-[0.75rem] ${quote.promoValid ? "text-emerald-600" : "text-red-600"}`}>
                  {quote.promoMessage}
                </p>
              )}
            </div>

            {/* Availability */}
            <div className="space-y-3">
              {searching && (
                <>
                  <div className="skeleton h-32" />
                  <div className="skeleton h-32" />
                </>
              )}
              {!searching &&
                search?.rooms.map(({ roomType, available, minRate }) => {
                  const soldOut = available <= 0;
                  return (
                    <div
                      key={roomType.id}
                      className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 ${
                        soldOut ? "opacity-60" : ""
                      }`}
                    >
                      <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-[var(--surface-alt)] sm:h-24 sm:w-32">
                        <Image
                          src={roomType.image}
                          alt={roomType.name}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg leading-tight">{roomType.name}</h3>
                          {soldOut ? (
                            <span className="chip">Sold out</span>
                          ) : (
                            <span className="badge-ok">{available} left</span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[0.78rem] leading-relaxed text-[var(--text-muted)]">
                          {roomType.blurb || `Sleeps ${roomType.maxOccupancy} · ${roomType.bed || "En-suite"}`}
                        </p>
                        <p className="mt-2 text-[0.72rem] text-[var(--text-muted)]">
                          Sleeps {roomType.maxOccupancy} · {roomType.bed || "En-suite"}
                        </p>
                      </div>
                      <div className="flex items-end justify-between gap-4 sm:flex-col sm:items-end">
                        <div className="text-right">
                          <p className="font-display text-lg leading-none">{naira(minRate / 100)}</p>
                          <p className="mt-1 text-[0.6rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            per night
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={soldOut || busy}
                          onClick={() => void selectRoom(roomType.id)}
                          className="btn-gold px-5 py-2.5 disabled:opacity-40"
                        >
                          {busyRoom === roomType.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Select"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              {!searching && !search && (
                <div className="card p-8 text-center">
                  <p className="text-[0.9rem] text-[var(--text-muted)]">
                    Choose your dates above and search to see live availability.
                  </p>
                  <button type="button" onClick={() => advance(0)} className="btn-outline mt-4">
                    Pick dates
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Guest details */}
        {step === 2 && quote && (
          <div className="mt-7 space-y-6">
            <div className="card p-5 sm:p-6">
              <h2 className="font-display text-2xl">Who is staying?</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="field-label">Full name *</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Ada Obi" autoComplete="name" />
                </label>
                <label className="block">
                  <span className="field-label">Email *</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field"
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Phone / WhatsApp *</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="field"
                    placeholder="+234…"
                    autoComplete="tel"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="field-label">Requests</span>
                  <textarea
                    value={requests}
                    onChange={(e) => setRequests(e.target.value)}
                    rows={3}
                    className="field resize-none"
                    placeholder="Late arrival, airport pick-up, high floor…"
                  />
                </label>
              </div>
            </div>

            {/* Add-ons */}
            {addons.length > 0 && (
              <div className="card p-5 sm:p-6">
                <h3 className="text-[0.66rem] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Add to your stay
                </h3>
                <div className="mt-4 divide-y divide-[var(--border)]">
                  {addons.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[0.86rem] font-medium">{a.name}</p>
                        <p className="mt-0.5 text-[0.74rem] text-[var(--text-muted)]">
                          {naira(a.price / 100)}
                          {a.unit ? ` · ${a.unit.replace("_", " ")}` : ""}
                          {a.description ? ` — ${a.description}` : ""}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAddon(a.id, addonQuantity(a.id) - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] hover:border-[var(--text-primary)]"
                          aria-label={`Remove ${a.name}`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center text-[0.82rem] tabular-nums">{addonQuantity(a.id)}</span>
                        <button
                          type="button"
                          onClick={() => setAddon(a.id, addonQuantity(a.id) + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] hover:border-[var(--text-primary)]"
                          aria-label={`Add ${a.name}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-5 sm:p-6">
              <h3 className="font-display text-xl">How would you like to finish?</h3>
              <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">
                Hold the room for two hours and settle with the front desk, or pay online now for instant
                confirmation.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void createBooking("whatsapp")}
                  disabled={busy}
                  className="btn-brand w-full"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  Reserve on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => void createBooking("website")}
                  disabled={busy}
                  className="btn-gold w-full"
                >
                  <ArrowRight className="h-4 w-4" />
                  Continue to payment
                </button>
              </div>
              <p className="mt-3 text-[0.72rem] leading-relaxed text-[var(--text-muted)]">
                No card needed to hold. Your room is only released if it is not confirmed before the hold
                expires.
              </p>
            </div>
          </div>
        )}

        {/* Step 4 — Payment */}
        {step === 3 && quote && reference && (
          <div className="mt-7 space-y-5">
            <div className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl">Finish your reservation</h2>
                  <p className="mt-1.5 text-[0.84rem] text-[var(--text-muted)]">
                    Reference <strong className="text-[var(--text-primary)]">{reference}</strong> — quote it in
                    the chat or at the desk.
                  </p>
                </div>
                <span className="badge">Held for you</span>
              </div>

              {reservedVia === "whatsapp" && (
                <div className="mt-5">
                  <Notice kind="info">
                    Your room is held for two hours. Send the pre-filled message to the front desk to confirm
                    — no card required.
                  </Notice>
                </div>
              )}
            </div>

            {paystackEnabled ? (
              <div className="card p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-4 w-4 text-[var(--accent)]" />
                  <h3 className="text-[0.9rem] font-medium">Pay online</h3>
                </div>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">
                  Card, bank transfer or USSD via Paystack. Confirmation is automatic and immediate.
                </p>
                <button type="button" onClick={() => void payNow()} disabled={busy} className="btn-gold mt-4 w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Pay {naira(quote.pricing.grandTotal / 100)} securely
                </button>
                <button
                  type="button"
                  onClick={() => void verifyPayment()}
                  disabled={checkingPayment}
                  className="btn-quiet mt-3 w-full justify-center"
                >
                  {checkingPayment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Already paid? Re-check payment
                </button>
              </div>
            ) : (
              <Notice kind="info">
                Online card payment is paused right now. WhatsApp and direct bank transfer are both open.
              </Notice>
            )}

            <div className="card p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="text-[0.9rem] font-medium">Bank transfer / front desk</h3>
              </div>
              <p className="mt-2 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">
                Transfer {naira(quote.pricing.grandTotal / 100)} and send the receipt to the front desk. Your
                reservation is confirmed once payment lands.
              </p>
              <dl className="mt-4 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-[0.82rem]">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Bank</dt>
                  <dd>{paymentSettings.bankDetails?.bankName || "Zenith Bank"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Account name</dt>
                  <dd className="text-right">{paymentSettings.bankDetails?.accountName || "Banky Hotel & Suites Ltd"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Account number</dt>
                  <dd className="flex items-center gap-2">
                    <span className="tabular-nums">{paymentSettings.bankDetails?.accountNumber || "—"}</span>
                    <button
                      type="button"
                      onClick={copyAccount}
                      className="inline-flex items-center gap-1 text-[0.68rem] uppercase tracking-[0.12em] text-[var(--accent)]"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-2">
                  <dt className="text-[var(--text-muted)]">Amount</dt>
                  <dd className="font-medium">{naira(quote.pricing.grandTotal / 100)}</dd>
                </div>
              </dl>
              <Link
                href={`/booking/confirmation?ref=${encodeURIComponent(reference)}&method=bank_transfer`}
                className="btn-outline mt-4 w-full"
              >
                I have paid — view my reservation
              </Link>
              <a
                href={whatsappLink(reservationMessage(reference))}
                target="_blank"
                rel="noreferrer"
                className="btn-brand mt-2.5 w-full"
              >
                <MessageCircle className="h-4 w-4" />
                Send reference on WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Back */}
        {step > 0 && (
          <button type="button" onClick={() => advance(step - 1)} className="btn-quiet mt-6">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        )}
      </div>

      {/* Sticky folio */}
      <aside className="lg:col-span-5 xl:col-span-4">
        <div className="card sticky top-24 overflow-hidden">
          {quote ? (
            <>
              <div className="relative h-32">
                <Image
                  src={search?.rooms.find((r) => r.roomType.id === quote.roomTypeId)?.roomType.image || "/images/DELUXE MAIN1.jpeg"}
                  alt={quote.roomTypeName}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-display text-lg leading-tight text-white">{quote.roomTypeName}</p>
                  <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/60">
                    {quote.roomCount} room{quote.roomCount > 1 ? "s" : ""} · {quote.nights} night
                    {quote.nights > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="space-y-2 p-4 sm:p-5">
                <SummaryRow label="Stay" value={`${fmtDate(quote.checkIn)} → ${fmtDate(quote.checkOut)}`} />
                <SummaryRow label="Guests" value={`${quote.adults} adult${quote.adults > 1 ? "s" : ""}${quote.children ? `, ${quote.children} child` : ""}`} />
                <SummaryRow label="Rate plan" value={quote.ratePlanName} muted />
                <div className="my-2 hairline" />
                <SummaryRow label="Room subtotal" value={naira(quote.pricing.roomSubtotal / 100)} />
                {quote.addons.map((a) => (
                  <SummaryRow key={a.id} label={`${a.name} × ${a.qty}`} value={naira(a.total / 100)} muted />
                ))}
                {quote.pricing.discountTotal > 0 && (
                  <SummaryRow label="Discount" value={`− ${naira(quote.pricing.discountTotal / 100)}`} muted />
                )}
                <SummaryRow label="Service charge" value={naira(quote.pricing.serviceCharge / 100)} muted />
                <SummaryRow label="Taxes" value={naira(quote.pricing.taxTotal / 100)} muted />
                <div className="my-2 hairline" />
                <div className="flex items-baseline justify-between">
                  <span className="text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">Total</span>
                  <span className="font-display text-2xl leading-none">{naira(quote.pricing.grandTotal / 100)}</span>
                </div>
                <p className="flex items-center gap-1.5 text-[0.68rem] text-[var(--text-muted)]">
                  <ShieldCheck className="h-3 w-3" /> All taxes and fees included
                </p>
              </div>
            </>
          ) : (
            <div className="p-5 sm:p-6">
              <p className="text-[0.66rem] font-medium uppercase tracking-[0.22em] text-[var(--accent)]">
                Your stay
              </p>
              <p className="mt-3 font-display text-xl leading-snug">Nothing selected yet</p>
              <p className="mt-2 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">
                Pick your dates and a room and the full price breakdown — taxes, service charge and any
                extras — appears here.
              </p>
              <div className="mt-5 space-y-2.5 text-[0.8rem]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <CalendarDays className="h-3.5 w-3.5 text-[var(--accent)]" />
                  {fmtDate(checkIn)} → {fmtDate(checkOut)}
                </div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Users className="h-3.5 w-3.5 text-[var(--accent)]" />
                  {adults} adult{adults > 1 ? "s" : ""} · {roomCountLabel}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3.5 text-[0.7rem] leading-relaxed text-[var(--text-muted)]">
            <span className="flex items-start gap-1.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
              Free cancellation on flexible rates · No booking fees · Front desk answers on WhatsApp
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function BookingPage() {
  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)] pb-8 pt-28 sm:pt-36">
        <div className="container-x">
          <nav className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <Link href="/" className="transition-colors hover:text-[var(--text-primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Reservations</span>
          </nav>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.66rem] font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
                Book direct
              </p>
              <h1 className="display-lg mt-3">Reserve your stay</h1>
              <p className="lede mt-3 max-w-xl">
                Live availability across all {28} rooms, transparent pricing, and a two-hour hold if you would
                rather confirm with the front desk.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[0.72rem] text-[var(--text-muted)]">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              Secure checkout
            </div>
          </div>
        </div>
      </section>

      <section id="checkout" className="container-x py-10 sm:py-14">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 py-20 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing the booking form…
            </div>
          }
        >
          <BookingFlow />
        </Suspense>
      </section>
    </>
  );
}
