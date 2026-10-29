"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, Download, Loader2, QrCode, Utensils } from "lucide-react";

const FALLBACK_URL = "https://bankyhotelandsuites.com/menu";

export function MenuQrPrint() {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [menuUrl, setMenuUrl] = useState(FALLBACK_URL);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/menu`;
    setMenuUrl(url);
    QRCode.toDataURL(url, {
      width: 900,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#121110", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setError("Could not generate the QR code. Please refresh and try again."));
  }, []);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#1a1a1d] py-10 px-4">
      {/* Toolbar — hidden when printing */}
      <div className="no-print max-w-md mx-auto mb-8 text-center">
        <p className="text-xs font-condensed uppercase tracking-[0.2em] text-[var(--accent-dark)] dark:text-[var(--accent)] mb-2">
          Printed menu card
        </p>
        <h1 className="font-display text-2xl sm:text-3xl text-[#222] dark:text-[#f4efe6] mb-3">
          Print your QR card
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">
          Print this card and place it on tables, counters and room desks. Guests scan it with
          any phone camera to open the live menu.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.print()}
            disabled={!dataUrl}
            className="btn-gold px-6 py-3 text-xs inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" /> Print card
          </button>
          {dataUrl && (
            <a
              href={dataUrl}
              download="banky-hotel-menu-qr.png"
              className="px-6 py-3 rounded-full text-xs font-condensed tracking-wider uppercase font-semibold border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 inline-flex items-center gap-2 hover:border-[var(--accent)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Download PNG
            </a>
          )}
        </div>
        <p className="mt-4 text-[0.7rem] text-stone-400 break-all">{menuUrl}</p>
      </div>

      {/* The card */}
      <div className="mx-auto w-full max-w-sm bg-white dark:bg-[#121110] rounded-2xl border-2 border-[var(--accent)] shadow-xl p-8 text-center print:shadow-none print:border-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Utensils className="h-4 w-4 text-[var(--accent-dark)] dark:text-[var(--accent)]" />
          <span className="text-[0.65rem] font-condensed uppercase tracking-[0.28em] text-stone-500">
            Banky Hotel &amp; Suites
          </span>
        </div>
        <p className="font-display text-xl text-[#222] dark:text-[#f4efe6] mb-1">
          Our Menu
        </p>
        <p className="text-[0.7rem] text-stone-500 dark:text-stone-400 mb-5">
          Restaurant &amp; Bar · Ado-Ekiti
        </p>

        <div className="mx-auto w-56 h-56 flex items-center justify-center rounded-xl bg-white border border-stone-100 dark:border-stone-800 p-2">
          {error && <p className="text-xs text-red-500 px-4">{error}</p>}
          {!error && !dataUrl && (
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          )}
          {dataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={`QR code for the menu at ${menuUrl}`}
              className="w-full h-full"
            />
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[0.7rem] text-stone-500 dark:text-stone-400">
          <QrCode className="h-3.5 w-3.5 text-[var(--accent-dark)] dark:text-[var(--accent)]" />
          Scan with your phone camera
        </div>
        <p className="mt-1 text-[0.72rem] font-medium text-[#222] dark:text-[#f4efe6]">
          View menu &amp; order
        </p>
        <div className="mt-5 h-1 rounded-full bg-[var(--accent)]" />
      </div>
    </div>
  );
}
