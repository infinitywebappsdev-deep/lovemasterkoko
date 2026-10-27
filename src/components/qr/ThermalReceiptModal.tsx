"use client";

import { useState, useEffect } from "react";
import { Printer, X, Copy, Check, AlertTriangle, Clock } from "lucide-react";
import { QrOrder } from "@/lib/qr-menu/types";
import { formatNaira } from "@/lib/qr-menu/store";

interface ThermalReceiptModalProps {
  order: QrOrder | null;
  onClose: () => void;
  elapsedMinutes?: number;
  autoPrint?: boolean;
  defaultPaperWidth?: "80mm" | "58mm";
  autoCloseAfterPrint?: boolean;
}

export function ThermalReceiptModal({
  order,
  onClose,
  elapsedMinutes = 0,
  autoPrint = false,
  defaultPaperWidth = "80mm",
  autoCloseAfterPrint = false,
}: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">(defaultPaperWidth);
  const [copied, setCopied] = useState(false);
  const [isAutoPrinting, setIsAutoPrinting] = useState(autoPrint);

  useEffect(() => {
    if (defaultPaperWidth) {
      setPaperWidth(defaultPaperWidth);
    }
  }, [defaultPaperWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    if (typeof document !== "undefined") {
      document.body.classList.add("printing-thermal-slip");
      window.print();
      // Remove class shortly after print dialog opens/closes
      setTimeout(() => {
        document.body.classList.remove("printing-thermal-slip");
      }, 500);
    }
  };

  useEffect(() => {
    if (autoPrint && order) {
      setIsAutoPrinting(true);
      const timer = setTimeout(() => {
        handlePrint();
        setIsAutoPrinting(false);
        if (autoCloseAfterPrint) {
          setTimeout(onClose, 1000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, order, autoCloseAfterPrint, onClose]);

  if (!order) return null;

  const isOverdue = elapsedMinutes >= 30;

  // Format order date in Lagos WAT style
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) + " WAT";
    } catch {
      return isoString;
    }
  };

  const handleCopyText = () => {
    const divider = "------------------------------------------";
    const lines = [
      "==========================================",
      "           BANKY HOTEL & SUITES           ",
      "      KITCHEN & BAR EXPEDITE SLIP        ",
      "==========================================",
      `ORDER NO:     #${order.orderNumber}`,
      `DATE/TIME:    ${formatDate(order.createdAt)}`,
      `DESTINATION:  ${order.roomOrTable.toUpperCase()}`,
      `ORDER TYPE:   ${order.orderType.toUpperCase()}`,
      order.guestName ? `GUEST:        ${order.guestName}` : null,
      order.guestPhone ? `PHONE:        ${order.guestPhone}` : null,
      isOverdue
        ? `*** [!] PRIORITY: OVERDUE (${elapsedMinutes} MINS) ***`
        : `STATUS:       ${order.status.toUpperCase()} (${elapsedMinutes}m elapsed)`,
      divider,
      "QTY  ITEM NAME                     AMOUNT ",
      divider,
      ...order.items.map(
        (i) =>
          `${i.quantity}x   ${i.title.padEnd(24).slice(0, 24)} ${formatNaira(i.subtotal)}` +
          (i.notes ? `\n     * ${i.notes}` : "")
      ),
      divider,
      `TOTAL ITEMS:  ${order.totalItems}`,
      `TOTAL AMOUNT: ${formatNaira(order.totalAmount)}`,
      divider,
      order.specialInstructions
        ? `SPECIAL INSTRUCTIONS:\n"${order.specialInstructions}"\n${divider}`
        : null,
      "EXPEDITE RUNNER: [  ]",
      "CHEF SIGN-OFF:   ________________",
      "==========================================",
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-[#ffbf00]" />
            <h3 className="font-display font-semibold text-stone-900 dark:text-white text-base">
              Thermal Receipt View
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {paperWidth}
            </span>
            {isAutoPrinting && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                Auto-Printing…
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex bg-stone-200 dark:bg-stone-800 rounded-md p-0.5 text-xs">
              <button
                onClick={() => setPaperWidth("80mm")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  paperWidth === "80mm"
                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-bold"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setPaperWidth("58mm")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  paperWidth === "58mm"
                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-bold"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                }`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100 dark:bg-stone-950/80 flex justify-center">
          {/* Thermal Slip Simulation */}
          <div
            id="thermal-receipt-container"
            className={`bg-white text-black font-mono shadow-md border border-stone-300 p-4 transition-all ${
              paperWidth === "80mm" ? "w-[310px]" : "w-[245px] text-[11px]"
            }`}
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            }}
          >
            {/* Serrated top border simulation */}
            <div className="border-b-2 border-dashed border-black pb-3 text-center">
              <p className="text-[10px] tracking-widest text-stone-600 uppercase">
                ================================
              </p>
              <h2 className="text-base font-bold tracking-wider uppercase mt-0.5">
                BANKY HOTEL & SUITES
              </h2>
              <p className="text-[11px] font-bold tracking-widest uppercase">
                KITCHEN & BAR EXPEDITE SLIP
              </p>
              <p className="text-[9px] text-stone-600">
                Abeokuta, Ogun State, Nigeria
              </p>
              <p className="text-[10px] tracking-widest text-stone-600 uppercase">
                ================================
              </p>
            </div>

            {/* Destination Highlight */}
            <div className="my-2 py-1.5 px-2 border border-black bg-stone-50 text-center">
              <span className="text-[10px] uppercase block tracking-wider text-stone-600 font-bold">
                DELIVER TO
              </span>
              <span className="text-lg font-black tracking-wide block">
                {order.roomOrTable.toUpperCase()}
              </span>
              <span className="text-[10px] uppercase font-semibold text-stone-700">
                {order.orderType === "room"
                  ? "IN-ROOM DINING"
                  : order.orderType === "table"
                  ? "RESTAURANT TABLE"
                  : "POOLSIDE & BAR"}
              </span>
            </div>

            {/* Order Meta */}
            <div className="py-2 border-b border-dashed border-black text-xs space-y-1">
              <div className="flex justify-between">
                <span>ORDER #:</span>
                <span className="font-bold">#{order.orderNumber}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>PLACED:</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              {order.guestName && (
                <div className="flex justify-between text-[11px]">
                  <span>GUEST:</span>
                  <span className="font-semibold">{order.guestName}</span>
                </div>
              )}
              {order.guestPhone && (
                <div className="flex justify-between text-[11px]">
                  <span>PHONE:</span>
                  <span>{order.guestPhone}</span>
                </div>
              )}
            </div>

            {/* Priority Alert Banner if >30 minutes */}
            {isOverdue ? (
              <div className="my-2 p-1.5 border-2 border-black bg-black text-white text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-black uppercase">
                  <span>*** [!] HIGH PRIORITY ***</span>
                </div>
                <p className="text-[10px] font-bold mt-0.5">
                  OVERDUE: {elapsedMinutes} MINS ELAPSED
                </p>
                <p className="text-[9px] tracking-wide">
                  EXCEEDS 30-MIN KITCHEN STANDARD
                </p>
              </div>
            ) : (
              <div className="my-2 py-1 border-b border-dashed border-black text-[11px] flex justify-between">
                <span>ELAPSED TIME:</span>
                <span className="font-semibold">{elapsedMinutes} mins ago</span>
              </div>
            )}

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="flex justify-between text-[10px] font-bold pb-1 border-b border-black">
                <span>QTY ITEM</span>
                <span>AMOUNT</span>
              </div>
              <div className="divide-y divide-dashed divide-stone-300 pt-1 space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="pt-1 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold pr-2 flex-1">
                        {item.quantity}x {item.title}
                      </span>
                      <span className="font-mono whitespace-nowrap">
                        {formatNaira(item.subtotal)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[10px] italic pl-5 text-stone-700">
                        * Note: {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="py-2 border-b-2 border-dashed border-black text-xs space-y-1">
              <div className="flex justify-between text-[11px] text-stone-700">
                <span>TOTAL ITEMS:</span>
                <span>{order.totalItems}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1">
                <span>TOTAL AMOUNT:</span>
                <span>{formatNaira(order.totalAmount)}</span>
              </div>
            </div>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <div className="my-2 p-2 border border-black bg-stone-50 text-xs">
                <span className="font-bold text-[10px] block uppercase tracking-wider">
                  SPECIAL INSTRUCTIONS:
                </span>
                <p className="text-[11px] mt-0.5 font-sans font-medium">
                  &ldquo;{order.specialInstructions}&rdquo;
                </p>
              </div>
            )}

            {/* Sign-off & Footer */}
            <div className="pt-3 text-[10px] space-y-2 text-stone-800">
              <div className="flex justify-between items-end pt-1">
                <span>RUNNER DISPATCH:</span>
                <span className="border-b border-black w-24 inline-block"></span>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span>CHEF SIGN-OFF:</span>
                <span className="border-b border-black w-24 inline-block"></span>
              </div>

              <div className="text-center pt-3 text-[9px] text-stone-600">
                <p>================================</p>
                <p className="font-bold tracking-widest text-black">
                  BANKY KITCHEN EXPEDITE SYSTEM
                </p>
                <p>Print Time: {new Date().toLocaleTimeString()} WAT</p>
                <p>================================</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyText}
            className="px-3 py-2 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Docket Text</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-stone-900 hover:bg-black text-white dark:bg-[#ffbf00] dark:hover:bg-[#e09e00] rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print Thermal Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
