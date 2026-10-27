"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  FileDown,
  Printer,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Loader2,
  BedDouble,
  User,
  Info,
} from "lucide-react";
import { HOTEL, naira } from "@/lib/hotel";
import { generateItineraryPdf, type ItineraryData } from "@/lib/booking/itinerary-pdf";

interface BookingItineraryCardProps {
  itinerary: ItineraryData;
  className?: string;
  autoFocus?: boolean;
}

export function BookingItineraryCard({ itinerary, className = "" }: BookingItineraryCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  // Generate in-browser QR preview for the card
  useEffect(() => {
    let active = true;
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/booking/confirmation?ref=${encodeURIComponent(itinerary.reference)}`
      : `https://bankyhotelandsuites.com/booking/confirmation?ref=${encodeURIComponent(itinerary.reference)}`;

    QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: {
        dark: "#1c1917",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (active) setQrSrc(dataUrl);
      })
      .catch((err) => {
        console.warn("Card QR preview error:", err);
      });

    return () => {
      active = false;
    };
  }, [itinerary.reference]);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await generateItineraryPdf(itinerary);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(itinerary.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn("Failed to copy:", err);
    }
  };

  const isPaidInFull =
    itinerary.paymentStatus === "successful" ||
    itinerary.paymentStatus === "paid" ||
    (itinerary.pricing && itinerary.pricing.balanceDue <= 0 && itinerary.pricing.amountPaid > 0);

  const grandTotal = itinerary.pricing ? itinerary.pricing.grandTotal / 100 : 0;
  const amountPaid = itinerary.pricing ? itinerary.pricing.amountPaid / 100 : 0;
  const balanceDue = itinerary.pricing ? itinerary.pricing.balanceDue / 100 : 0;

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "—";
    try {
      const [y, m, d] = isoStr.split("-").map(Number);
      if (!y || !m || !d) return isoStr;
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${HOTEL.name}, ${HOTEL.address}`
  )}`;

  return (
    <div
      id="booking-itinerary-card"
      className={`bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-stone-800 rounded-3xl overflow-hidden shadow-xl ${className}`}
    >
      {/* Top Banner with Hotel Identity & Reference */}
      <div className="bg-[#171513] text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent)]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
              <span className="text-[11px] font-condensed uppercase tracking-wider text-[var(--accent)] font-semibold">
                Official Reservation Itinerary
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-white">
              {HOTEL.name}
            </h2>
            <p className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
              <span>{HOTEL.address}</span>
            </p>
          </div>

          {/* Reference Pill with Copy */}
          <div className="bg-stone-900/90 border border-stone-700/60 rounded-2xl p-3 sm:px-4 sm:py-3 flex flex-col sm:items-end justify-center self-start sm:self-auto">
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">
              Booking Reference
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-base sm:text-lg font-bold text-[var(--accent)] tracking-wider">
                {itinerary.reference}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-stone-300 transition-colors"
                title="Copy reference"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar in Card Header */}
        <div className="relative z-10 mt-6 pt-5 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider font-mono ${
                isPaidInFull
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {isPaidInFull ? "Paid in Full · Confirmed" : "Deposit Paid · Confirmed"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-condensed uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Itinerary</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:brightness-110 text-stone-950 text-xs font-condensed uppercase tracking-wider font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5 stroke-[2.5]" />
              )}
              <span>{downloading ? "Generating PDF…" : "Download PDF Itinerary"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Itinerary Content Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Row 1: Stay Dates & Room Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dates & Times */}
          <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-condensed uppercase tracking-wider font-bold text-stone-700 dark:text-stone-300">
              <Calendar className="h-4 w-4 text-[var(--accent)]" />
              <span>Stay Schedule &amp; Timings</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200/70 dark:border-stone-700/60">
                <span className="text-[10px] uppercase font-mono text-stone-500 block">Check-in</span>
                <strong className="text-sm font-semibold text-stone-900 dark:text-white block mt-0.5">
                  {formatDate(itinerary.checkIn)}
                </strong>
                <span className="text-[11px] text-[var(--accent)] font-medium block mt-0.5">
                  From {HOTEL.checkIn}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200/70 dark:border-stone-700/60">
                <span className="text-[10px] uppercase font-mono text-stone-500 block">Check-out</span>
                <strong className="text-sm font-semibold text-stone-900 dark:text-white block mt-0.5">
                  {formatDate(itinerary.checkOut)}
                </strong>
                <span className="text-[11px] text-[var(--accent)] font-medium block mt-0.5">
                  Until {HOTEL.checkOut}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400">
              <span>
                Length of Stay: <strong>{itinerary.nights} Night{itinerary.nights !== 1 ? "s" : ""}</strong>
              </span>
              <span>
                Guests: <strong>{itinerary.adults} Adult{itinerary.adults > 1 ? "s" : ""}{itinerary.children > 0 ? `, ${itinerary.children} Child${itinerary.children > 1 ? "ren" : ""}` : ""}</strong>
              </span>
            </div>
          </div>

          {/* Accommodation & Suite */}
          <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-condensed uppercase tracking-wider font-bold text-stone-700 dark:text-stone-300">
              <BedDouble className="h-4 w-4 text-[var(--accent)]" />
              <span>Room &amp; Rate Details</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg text-stone-900 dark:text-white">
                    {itinerary.roomTypeName}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Plan: {itinerary.ratePlanName || "Standard Flexible Rate"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium">
                    {itinerary.assignedRoomNumber ? `Room ${itinerary.assignedRoomNumber}` : "Allocated on Arrival"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-1">
                <p className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-stone-400" />
                  <span>Lead Guest: <strong>{itinerary.guestName || "Valued Guest"}</strong></span>
                </p>
                {itinerary.guestEmail && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-stone-400" />
                    <span>{itinerary.guestEmail}</span>
                  </p>
                )}
                {itinerary.guestPhone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-stone-400" />
                    <span>{itinerary.guestPhone}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Payment Status & Accounting Breakdown */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1f1d1a] border border-[#ece6dd] dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-xs font-condensed uppercase tracking-wider font-bold text-stone-800 dark:text-stone-200">
                Payment Status &amp; Accounting
              </h3>
            </div>
            <span className={`text-xs font-mono font-semibold ${
              amountPaid > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}>
              {amountPaid > 0 ? "Deposit Settlement Verified" : "Direct Transfer / Front Desk Settlement"}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center text-stone-600 dark:text-stone-300">
              <span>Total Reservation Charge (incl. VAT &amp; Service Charge):</span>
              <strong className="text-stone-900 dark:text-white font-mono">{naira(grandTotal)}</strong>
            </div>

            {amountPaid > 0 && (
              <div className="flex justify-between items-center text-stone-600 dark:text-stone-300">
                <span>Payment Settled (Online Deposit):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  -{naira(amountPaid)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between items-center">
              <div>
                <span className="font-semibold text-stone-900 dark:text-white text-sm block">
                  {amountPaid >= grandTotal
                    ? "Balance Due at Check-in:"
                    : amountPaid > 0
                    ? "Outstanding Balance at Hotel:"
                    : "Payable at Hotel / Bank Transfer:"}
                </span>
                <span className="text-[11px] text-stone-500">
                  {amountPaid >= grandTotal
                    ? "Reservation paid in full. No payment needed at check-in."
                    : amountPaid > 0
                    ? "Payable at Front Desk via card or bank transfer."
                    : "Payable via Direct Bank Transfer or Front Desk POS/Cash."}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`font-mono text-base font-bold ${
                    balanceDue <= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {naira(balanceDue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Hotel Location, Directions & Digital QR Verification */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Hotel Location & Contact */}
          <div className="sm:col-span-2 p-5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-condensed uppercase tracking-wider font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[var(--accent)]" />
                Hotel Location &amp; Directions
              </span>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              <strong>{HOTEL.name}</strong>
              <br />
              {HOTEL.address}
            </p>

            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-stone-400">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{HOTEL.phone}</span>
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{HOTEL.email}</span>
              </span>
            </div>
          </div>

          {/* Verification QR Preview */}
          <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-center space-y-2">
            {qrSrc ? (
              <div className="w-24 h-24 bg-white p-1.5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="Verification QR" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-24 h-24 bg-stone-200 animate-pulse rounded-xl" />
            )}
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 font-semibold">
              Reception Scan QR
            </span>
            <span className="text-[10px] text-stone-400 leading-tight">
              Scan on arrival for express check-in
            </span>
          </div>
        </div>

        {/* Special Requests if any */}
        {itinerary.requests && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Special Requests Noted:</strong>
              <p className="mt-0.5">{itinerary.requests}</p>
            </div>
          </div>
        )}
      </div>

      {/* Card Bottom CTA */}
      <div className="bg-stone-50 dark:bg-stone-900/80 p-5 sm:px-8 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
        <p>
          Present your reference <strong>{itinerary.reference}</strong> or photo ID upon arrival at the front desk.
        </p>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-black font-condensed uppercase tracking-wider text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          <span>Save PDF Itinerary</span>
        </button>
      </div>
    </div>
  );
}
