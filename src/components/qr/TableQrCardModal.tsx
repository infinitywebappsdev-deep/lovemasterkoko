"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  Sparkles,
  QrCode as QrIcon,
  Maximize2,
  Hotel,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TableQrCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomOrTable: string;
  orderType: "room" | "table" | "poolside_garden";
}

export function TableQrCardModal({
  isOpen,
  onClose,
  roomOrTable,
  orderType,
}: TableQrCardModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [styleMode, setStyleMode] = useState<"viewfinder" | "bubble">("viewfinder");

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}/qr?${orderType === "table" ? "table" : "room"}=${encodeURIComponent(roomOrTable || "Table 1")}`
    : `https://bankyhotel.com/qr?table=${encodeURIComponent(roomOrTable || "Table 1")}`;

  useEffect(() => {
    if (!isOpen) return;

    // Generate high resolution QR code
    QRCode.toDataURL(fullUrl, {
      width: 480,
      margin: 1,
      color: styleMode === "bubble"
        ? { dark: "#0066ff", light: "#ffffff" }
        : { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code Generation Error:", err));
  }, [isOpen, fullUrl, styleMode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `Banky-Hotel-QR-${roomOrTable || "Table"}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative z-10 bg-[#161513] border border-stone-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#aa8453]/20 text-[#c89e63]">
                <QrIcon className="h-4 w-4" />
              </span>
              <div className="text-left">
                <h3 className="font-display text-sm font-medium text-white">
                  Table & Room QR Stand
                </h3>
                <p className="text-[10px] text-stone-400">
                  Instant contactless in-house dining
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Style selector pills: Viewfinder (scan1) vs Bubble Dot (scan2) */}
          <div className="mt-3 flex items-center justify-center gap-2 text-[11px]">
            <button
              onClick={() => setStyleMode("viewfinder")}
              className={`px-3 py-1 rounded-full border transition-all ${
                styleMode === "viewfinder"
                  ? "bg-[#3b82f6] text-white border-[#3b82f6] font-medium shadow-sm"
                  : "bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200"
              }`}
            >
              Scanner Viewfinder (scan1)
            </button>
            <button
              onClick={() => setStyleMode("bubble")}
              className={`px-3 py-1 rounded-full border transition-all ${
                styleMode === "bubble"
                  ? "bg-[#0066ff] text-white border-[#0066ff] font-medium shadow-sm"
                  : "bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200"
              }`}
            >
              Dot Matrix (scan2)
            </button>
          </div>

          {/* ── Table Tent Display Card ── */}
          <div className="mt-4 p-5 bg-gradient-to-b from-stone-900/90 to-stone-950 border border-stone-800 rounded-2xl relative shadow-inner">
            {/* Hotel branding header */}
            <div className="flex items-center justify-center gap-1.5 text-stone-300 text-[11px] uppercase tracking-widest font-mono mb-1">
              <Hotel className="h-3 w-3 text-[#c89e63]" />
              <span>Banky Hotel & Suites</span>
            </div>

            <div className="text-center mb-3">
              <span className="inline-block px-3 py-0.5 rounded-full bg-[#c89e63]/20 border border-[#c89e63]/40 text-[#f5d799] text-xs font-semibold">
                {roomOrTable || (orderType === "table" ? "Table 1" : "Room Service")}
              </span>
            </div>

            {/* Viewfinder Frame (infused from scan1.png with blue corner brackets) */}
            <div className="relative inline-block p-4 bg-white rounded-2xl shadow-xl">
              {/* Corner 1: Top-Left */}
              <div className="absolute top-1.5 left-1.5 w-6 h-6 border-t-[3.5px] border-l-[3.5px] border-[#3b82f6] rounded-tl-lg" />
              {/* Corner 2: Top-Right */}
              <div className="absolute top-1.5 right-1.5 w-6 h-6 border-t-[3.5px] border-r-[3.5px] border-[#3b82f6] rounded-tr-lg" />
              {/* Corner 3: Bottom-Left */}
              <div className="absolute bottom-1.5 left-1.5 w-6 h-6 border-b-[3.5px] border-l-[3.5px] border-[#3b82f6] rounded-bl-lg" />
              {/* Corner 4: Bottom-Right */}
              <div className="absolute bottom-1.5 right-1.5 w-6 h-6 border-b-[3.5px] border-r-[3.5px] border-[#3b82f6] rounded-br-lg" />

              {/* Generated QR code */}
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${roomOrTable}`}
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-md"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">
                  Generating QR…
                </div>
              )}
            </div>

            {/* Handwritten / Script style label (inspired from scan1.png) */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-sky-400 font-serif italic">
              <span>Scan me to order & check menu</span>
            </div>

            <p className="text-[10px] text-stone-500 mt-1 font-mono">
              Direct live menu for this location
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={handleCopy}
              className="h-9 px-3 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Link Copied!" : "Copy URL"}</span>
            </button>

            <button
              onClick={handleDownload}
              className="h-9 px-3 bg-[#aa8453] hover:bg-[#967344] text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm shadow-[#aa8453]/20"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Save Image</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
