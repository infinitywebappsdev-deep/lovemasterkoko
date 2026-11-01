"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { HOTEL, naira, whatsappLink } from "@/lib/hotel";
import { BookingItineraryCard } from "@/components/booking/BookingItineraryCard";
import type { ItineraryData } from "@/lib/booking/itinerary-pdf";
import { usePaymentSettings } from "@/lib/settings/usePaymentSettings";

type VerifyState = "verifying" | "confirmed" | "pending" | "failed";

type VerifyPayload = {
  status: string;
  paymentStatus: string;
  reference: string;
  amountPaid: number;
  balanceDue: number;
  reservation?: ItineraryData;
};

const MAX_POLLS = 8;
const POLL_MS = 2500;

function ConfirmationInner() {
  const sp = useSearchParams();
  const ref = sp.get("ref");
  const bankMode = sp.get("method") === "bank_transfer";

  const [state, setState] = useState<VerifyState>(bankMode ? "pending" : "verifying");
  const [message, setMessage] = useState(
    bankMode ? "Your room is held while your transfer is confirmed." : "Verifying your payment…",
  );
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [payload, setPayload] = useState<VerifyPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const pollsLeft = useRef(MAX_POLLS);
  const { settings } = usePaymentSettings();

  const loadReservation = useCallback(async (reference: string) => {
    try {
      const res = await fetch(`/api/booking/reservation?ref=${encodeURIComponent(reference)}`);
      const json = await res.json();
      if (json.ok && json.data) setItinerary(json.data as ItineraryData);
    } catch {
      /* the itinerary stays hidden if the lookup fails */
    }
  }, []);

  const verify = useCallback(
    async (reference: string) => {
      try {
        const res = await fetch("/api/booking/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const json = (await res.json()) as
          | { ok: true; data: VerifyPayload }
          | { ok: false; error: string; message: string };

        if (json.ok) {
          setPayload(json.data);
          setState("confirmed");
          setMessage("Payment received and your room is confirmed.");
          if (json.data.reservation) setItinerary(json.data.reservation);
          else void loadReservation(reference);
          return;
        }

        // Still settling at Paystack — keep polling briefly.
        pollsLeft.current -= 1;
        if (pollsLeft.current > 0 && /pending|processing|not found/i.test(json.message ?? "")) {
          setState("verifying");
          setMessage("Payment is still settling. This usually takes a few seconds…");
          setTimeout(() => void verify(reference), POLL_MS);
        } else {
          setState("pending");
          setMessage(json.message || "We could not confirm payment yet.");
          void loadReservation(reference);
        }
      } catch {
        setState("failed");
        setMessage("We could not reach the server to verify your payment.");
      }
    },
    [loadReservation],
  );

  useEffect(() => {
    if (!ref) {
      setState("failed");
      setMessage("No reservation reference was provided.");
      return;
    }
    if (bankMode) void loadReservation(ref);
    else void verify(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, bankMode]);

  const copyAccount = async () => {
    const acc = settings.bankDetails?.accountNumber;
    if (!acc) return;
    try {
      await navigator.clipboard.writeText(acc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!ref) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-[var(--accent)]" />
        <h1 className="display-sm mt-4">No reference to look up</h1>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-[var(--text-muted)]">
          Open the link from your confirmation message, or start a new reservation.
        </p>
        <Link href="/booking" className="btn-gold mt-6">Book a room</Link>
      </div>
    );
  }

  if (state === "verifying") {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" />
        <h1 className="display-sm mt-5">Confirming your reservation</h1>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-[var(--text-muted)]">{message}</p>
        <p className="mt-6 text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Reference {ref}
        </p>
      </div>
    );
  }

  if (state === "confirmed" || (state === "pending" && itinerary)) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              state === "confirmed"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-[var(--accent-muted)] text-[var(--accent)]"
            }`}
          >
            {state === "confirmed" ? <CheckCircle2 className="h-7 w-7" /> : <ShieldCheck className="h-6 w-6" />}
          </span>
          <h1 className="display-md mt-5">
            {state === "confirmed" ? "You're booked" : "Your room is held"}
          </h1>
          <p className="mt-3 max-w-lg text-[0.9rem] leading-relaxed text-[var(--text-muted)]">
            {state === "confirmed"
              ? `Reference ${ref}. A confirmation has been sent to your email — present the reference at the front desk.`
              : `Reference ${ref}. ${message}`}
          </p>
        </div>

        {state === "pending" && (
          <div className="card mt-8 p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-[0.9rem] font-medium">Bank transfer details</h2>
            </div>
            <p className="mt-2 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">
              Transfer the total below and send your receipt to the front desk. The reservation is confirmed
              as soon as payment lands.
            </p>
            <dl className="mt-4 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-[0.82rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Bank</dt>
                <dd>{settings.bankDetails?.bankName || "Zenith Bank"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Account name</dt>
                <dd className="text-right">{settings.bankDetails?.accountName || "Banky Hotel & Suites Ltd"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Account number</dt>
                <dd className="flex items-center gap-2">
                  <span className="tabular-nums">{settings.bankDetails?.accountNumber || "—"}</span>
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
              {itinerary?.pricing && (
                <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-2">
                  <dt className="text-[var(--text-muted)]">Amount due</dt>
                  <dd className="font-medium">{naira(itinerary.pricing.grandTotal / 100)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <a
                href={whatsappLink(
                  `Hello ${HOTEL.name}, I have paid by bank transfer for reservation ${ref}. Here is my receipt:`,
                )}
                target="_blank"
                rel="noreferrer"
                className="btn-brand"
              >
                <MessageCircle className="h-4 w-4" /> Send receipt
              </a>
              <button type="button" onClick={() => void verify(ref)} className="btn-outline">
                <RefreshCw className="h-4 w-4" /> Check again
              </button>
            </div>
          </div>
        )}

        {itinerary && (
          <div className="mt-8">
            <BookingItineraryCard itinerary={itinerary} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-outline">Back to the hotel</Link>
          <Link href="/rooms" className="btn-quiet">
            Add another room <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-lg p-8 text-center sm:p-10">
      <AlertCircle className="mx-auto h-6 w-6 text-[var(--accent)]" />
      <h1 className="display-sm mt-4">
        {state === "failed" ? "We couldn't check that reference" : "Payment not confirmed yet"}
      </h1>
      <p className="mt-3 text-[0.88rem] leading-relaxed text-[var(--text-muted)]">{message}</p>
      <p className="mt-4 text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        Reference {ref}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={() => void verify(ref)} className="btn-gold">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
        <a
          href={whatsappLink(`Hello ${HOTEL.name}, I need help with reservation ${ref}.`)}
          target="_blank"
          rel="noreferrer"
          className="btn-outline"
        >
          <MessageCircle className="h-4 w-4" /> Ask the front desk
        </a>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <section className="container-x pb-20 pt-28 sm:pt-36">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 py-24 text-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your reservation…
          </div>
        }
      >
        <ConfirmationInner />
      </Suspense>
    </section>
  );
}
