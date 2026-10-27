"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileDown,
  Printer,
  Calendar,
  CreditCard,
  MapPin,
  Home,
  RefreshCw,
  Phone,
  Building2,
  Copy,
  Check,
  Info,
  MessageCircle,
} from "lucide-react";
import { HOTEL, naira, whatsappLink } from "@/lib/hotel";
import { BookingItineraryCard } from "@/components/booking/BookingItineraryCard";
import { generateItineraryPdf, type ItineraryData } from "@/lib/booking/itinerary-pdf";
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
const POLL_INTERVAL_MS = 2500;

export default function BookingConfirmationPage() {
  const [state, setState] = useState<VerifyState>("verifying");
  const [message, setMessage] = useState<string>("Verifying your payment and securing reservation…");
  const [payload, setPayload] = useState<VerifyPayload | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isBankTransfer, setIsBankTransfer] = useState(false);
  const [isWhatsApp, setIsWhatsApp] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const pollsLeft = useRef(MAX_POLLS);

  const { settings: paymentSettings } = usePaymentSettings();

  const loadReservationDetails = useCallback(async (reference: string) => {
    try {
      const res = await fetch(`/api/booking/reservation?ref=${encodeURIComponent(reference)}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setItinerary(json.data as ItineraryData);
      }
    } catch (err) {
      console.warn("Failed to load reservation details:", err);
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

          if (json.data.reservation) {
            setItinerary(json.data.reservation);
          } else {
            void loadReservationDetails(reference);
          }
          return true;
        }

        if (json.error === "PAYMENT_PENDING" && pollsLeft.current > 0) {
          pollsLeft.current -= 1;
          setMessage("Payment is still processing — checking gateway status…");
          return false;
        }

        if (json.error === "PAYMENT_PENDING") {
          setState("pending");
          setMessage("Your transaction is currently awaiting final settlement confirmation from the bank.");
          // Try to load any existing reservation info so they can view details while pending
          void loadReservationDetails(reference);
          return true; // stop polling, allow user to retry manually
        }

        setState("failed");
        setMessage(json.message || "We could not verify your payment. Please contact the front desk with your reference.");
        return true;
      } catch {
        if (pollsLeft.current > 0) {
          pollsLeft.current -= 1;
          return false;
        }
        setState("failed");
        setMessage("Network connection interrupted during verification. Please try again.");
        return true;
      }
    },
    [loadReservationDetails]
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlRef = searchParams.get("ref");
    const method = searchParams.get("method");
    setRef(urlRef);
    if (!urlRef) {
      setState("failed");
      setMessage("No reservation reference was provided. If you just completed booking, check your email or contact the hotel.");
      return;
    }

    if (method === "whatsapp") {
      setIsWhatsApp(true);
      setState("confirmed");
      setMessage("Your reservation hold is locked! Reservation details have been sent to our 24/7 WhatsApp front desk team.");
      void loadReservationDetails(urlRef);
      return;
    }

    if (method === "bank_transfer" || method === "front_desk" || method === "hotel") {
      setIsBankTransfer(true);
      setState("confirmed");
      setMessage("Your reservation hold is locked! Please settle your stay payment via bank transfer or at the front desk.");
      void loadReservationDetails(urlRef);
      return;
    }

    let cancelled = false;
    (async () => {
      while (!cancelled) {
        const done = await verify(urlRef);
        if (done || cancelled) break;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [verify, loadReservationDetails]);

  const handleQuickDownload = async () => {
    if (!itinerary && payload) {
      // Fallback synthetic itinerary if detailed fetch didn't finish
      const synthetic: ItineraryData = {
        reference: payload.reference,
        guestName: "Valued Guest",
        roomTypeName: "Deluxe Accommodation",
        checkIn: new Date().toISOString().slice(0, 10),
        checkOut: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        nights: 1,
        adults: 1,
        children: 0,
        status: payload.status,
        paymentStatus: payload.paymentStatus,
        pricing: {
          grandTotal: payload.amountPaid + payload.balanceDue,
          amountPaid: payload.amountPaid,
          balanceDue: payload.balanceDue,
          currency: "NGN",
        },
      };
      setDownloadingPdf(true);
      try {
        await generateItineraryPdf(synthetic);
      } finally {
        setDownloadingPdf(false);
      }
      return;
    }

    if (!itinerary) return;
    setDownloadingPdf(true);
    try {
      await generateItineraryPdf(itinerary);
    } catch (e) {
      console.error("PDF download failed:", e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Construct effective itinerary if partial data
  const effectiveItinerary: ItineraryData | null =
    itinerary ||
    (payload
      ? {
          reference: payload.reference,
          guestName: "Valued Guest",
          roomTypeName: "Reserved Room",
          checkIn: "",
          checkOut: "",
          nights: 1,
          adults: 1,
          children: 0,
          status: payload.status,
          paymentStatus: payload.paymentStatus,
          pricing: {
            grandTotal: payload.amountPaid + payload.balanceDue,
            amountPaid: payload.amountPaid,
            balanceDue: payload.balanceDue,
          },
        }
      : null);

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#121110]">
      {/* Hero Header Section */}
      <section className="pt-28 pb-12 sm:pt-36 sm:pb-16 bg-[#171513] text-white relative overflow-hidden print-hide">
        {/* Baseline Header Image — Luxury Hotel Exterior */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/exterior-night.jpg"
          alt="Banky Hotel & Suites Exterior at Night"
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171513] via-[#171513]/75 to-[#171513]/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="container-x relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-condensed uppercase tracking-wider font-semibold mb-4">
            <ShieldCheck className="h-4 w-4" />
            <span>Reservations &amp; Guest Itinerary</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl text-white tracking-tight">
            {isWhatsApp
              ? "Reservation Hold Secured"
              : isBankTransfer
              ? "Reservation Hold Secured"
              : state === "confirmed"
              ? "Reservation Confirmed"
              : state === "pending"
              ? "Payment Processing"
              : state === "failed"
              ? "Verification Needed"
              : "Verifying Reservation"}
          </h1>

          <p className="text-sm sm:text-base text-stone-300 mt-3 max-w-xl mx-auto leading-relaxed">
            {isWhatsApp
              ? "Thank you for choosing Banky Hotel & Suites. Your room reservation hold is locked! Our front desk team on WhatsApp has your details ready for express check-in."
              : isBankTransfer
              ? "Thank you for choosing Banky Hotel & Suites. Your room reservation is locked. Please transfer your stay payment to our official hotel account or present payment at check-in."
              : state === "confirmed"
              ? "Thank you for choosing Banky Hotel & Suites. Your room is locked and payment is verified."
              : "We are validating your transaction with Paystack and securing your room reservation."}
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-10 sm:py-16">
        <div className="container-x max-w-4xl space-y-8">
          {/* WHATSAPP NOTICE & ACTION CARD */}
          {isWhatsApp && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#1a1815] border border-emerald-300 dark:border-emerald-800/80 shadow-md space-y-4 print-hide">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg text-stone-900 dark:text-white font-medium">
                      WhatsApp Reservation Hold Active
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                      Your booking reference is <strong>{ref}</strong>. If you have not already sent your message, click below to chat with our 24/7 reception concierge on WhatsApp.
                    </p>
                  </div>
                </div>

                <a
                  href={whatsappLink(`Hello Banky Hotel & Suites, following up on my reservation reference: ${ref}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat on WhatsApp ({HOTEL.phone})</span>
                </a>
              </div>
            </div>
          )}

          {/* BANK TRANSFER NOTICE & DETAILS CARD */}
          {isBankTransfer && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#1a1815] border border-amber-300 dark:border-amber-800/80 shadow-md space-y-4 print-hide">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-lg text-stone-900 dark:text-white font-medium">
                    Direct Bank Transfer &amp; Front-Desk Settlement
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Please transfer your total reservation payment to the official Banky Hotel &amp; Suites account below. Include your reservation reference <strong>{ref}</strong> in the payment narration.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 bg-stone-50 dark:bg-stone-900/80 p-4 rounded-xl border border-stone-200 dark:border-stone-800 text-xs">
                <div>
                  <span className="text-stone-500 block uppercase font-mono text-[10px]">Bank:</span>
                  <span className="font-semibold text-stone-900 dark:text-white text-sm">
                    {paymentSettings.bankDetails?.bankName || "Zenith Bank"}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block uppercase font-mono text-[10px]">Account Name:</span>
                  <span className="font-semibold text-stone-900 dark:text-white text-sm">
                    {paymentSettings.bankDetails?.accountName || "Banky Hotel & Suites Ltd"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-stone-500 block uppercase font-mono text-[10px]">Account Number:</span>
                    <span className="font-mono font-bold text-stone-900 dark:text-white text-base">
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
                    className="p-1.5 px-2.5 rounded-lg border bg-white dark:bg-stone-800 text-xs text-stone-700 dark:text-stone-200 hover:text-[var(--accent)] shadow-sm inline-flex items-center gap-1"
                  >
                    {copiedBank ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedBank ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* VERIFYING STATE */}
          {state === "verifying" && (
            <div className="glass p-10 sm:p-14 rounded-3xl border border-[#ece6dd] text-center space-y-6 max-w-xl mx-auto shadow-lg">
              <div className="h-16 w-16 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div>
                <h2 className="font-display text-2xl text-stone-900 dark:text-white">
                  Verifying Your Payment…
                </h2>
                <p className="text-sm text-stone-600 dark:text-stone-300 mt-2">{message}</p>
              </div>
              {ref && (
                <div className="p-3 bg-stone-100 dark:bg-stone-900 rounded-xl font-mono text-xs text-stone-600 dark:text-stone-400">
                  Checking Reference: <strong className="text-stone-900 dark:text-white">{ref}</strong>
                </div>
              )}
            </div>
          )}

          {/* CONFIRMED STATE */}
          {state === "confirmed" && (
            <div className="space-y-6">
              {/* Quick Action Bar for Instant PDF Itinerary Download */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm print-hide">
                <div className="flex items-center gap-3.5 text-left">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-emerald-950 dark:text-emerald-100">
                      Payment &amp; Stay Verified
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Save or print your official guest itinerary for effortless check-in upon arrival.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-900 text-emerald-900 dark:text-emerald-200 text-xs font-condensed uppercase tracking-wider font-semibold hover:bg-emerald-100/50 transition-colors cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickDownload}
                    disabled={downloadingPdf}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-condensed uppercase tracking-wider font-bold transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4 stroke-[2.5]" />
                    )}
                    <span>{downloadingPdf ? "Generating…" : "Generate PDF Itinerary"}</span>
                  </button>
                </div>
              </div>

              {/* Full Interactive Itinerary Card with Location, Dates & Payment Status */}
              {effectiveItinerary && (
                <BookingItineraryCard itinerary={effectiveItinerary} />
              )}

              {/* Bottom Quick Navigation Links */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500 print-hide">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[var(--accent)] font-medium transition-colors"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Return to Homepage</span>
                </Link>

                <div className="flex items-center gap-4">
                  <a
                    href={`tel:${HOTEL.phone}`}
                    className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[var(--accent)] font-medium transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Front Desk: {HOTEL.phone}</span>
                  </a>
                  <Link
                    href="/booking"
                    className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold hover:underline"
                  >
                    <span>Book Another Room</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* PENDING STATE */}
          {state === "pending" && (
            <div className="glass p-8 sm:p-12 rounded-3xl border border-[#ece6dd] text-center space-y-6 max-w-xl mx-auto shadow-lg">
              <div className="h-16 w-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div>
                <h2 className="font-display text-2xl text-stone-900 dark:text-white">
                  Payment Processing
                </h2>
                <p className="text-sm text-stone-600 dark:text-stone-300 mt-2">{message}</p>
              </div>

              {ref && (
                <div className="p-4 bg-stone-100 dark:bg-stone-900 rounded-2xl text-xs space-y-1">
                  <span className="text-stone-500 block">Your Reservation Reference</span>
                  <strong className="text-stone-900 dark:text-white text-base font-mono block">
                    {ref}
                  </strong>
                  <p className="text-[11px] text-stone-500 pt-1">
                    Your room is held while we await gateway settlement. You can check again anytime.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    pollsLeft.current = MAX_POLLS;
                    setState("verifying");
                    if (ref) void verify(ref);
                  }}
                  className="btn-gold w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Re-check Payment Status</span>
                </button>
                <Link
                  href="/"
                  className="btn-outline-white w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium"
                >
                  Return Home
                </Link>
              </div>
            </div>
          )}

          {/* FAILED STATE */}
          {state === "failed" && (
            <div className="glass p-8 sm:p-12 rounded-3xl border border-red-200 dark:border-red-900/50 text-center space-y-6 max-w-xl mx-auto shadow-lg">
              <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-display text-2xl text-stone-900 dark:text-white">
                  Verification Incomplete
                </h2>
                <p className="text-sm text-stone-600 dark:text-stone-300 mt-2">{message}</p>
              </div>

              {ref && (
                <div className="p-4 bg-stone-100 dark:bg-stone-900 rounded-2xl text-xs space-y-1">
                  <span className="text-stone-500 block">Booking Reference</span>
                  <strong className="text-stone-900 dark:text-white text-base font-mono block">
                    {ref}
                  </strong>
                  <p className="text-[11px] text-stone-500">
                    Quote this reference to our 24/7 front desk team at {HOTEL.phone} for immediate assistance.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    pollsLeft.current = MAX_POLLS;
                    setState("verifying");
                    if (ref) void verify(ref);
                  }}
                  className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" /> Try Verification Again
                </button>
                <Link
                  href="/booking"
                  className="btn-outline-white inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium"
                >
                  Start New Booking
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
