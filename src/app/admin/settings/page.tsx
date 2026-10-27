"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Save,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Info,
  Sliders,
  DollarSign,
  Copy,
  Check,
  Printer,
  Volume2,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCheck,
} from "lucide-react";
import { usePaymentSettings } from "@/lib/settings/usePaymentSettings";
import { ThermalReceiptModal } from "@/components/qr/ThermalReceiptModal";
import { QrOrder } from "@/lib/qr-menu/types";

// Demonstration order used for testing thermal printer physical hardware and alignment
const SAMPLE_TEST_ORDER: QrOrder = {
  id: "test_print_sample",
  orderNumber: "BKY-DEMO-2026",
  roomOrTable: "VIP Table 05",
  orderType: "table",
  guestName: "Chief Adewale Adeleke",
  guestPhone: "+234 903 587 9708",
  status: "in_progress",
  totalAmount: 21500,
  totalItems: 3,
  items: [
    {
      id: "demo_1",
      title: "Banky Royal Egusi with Pounded Yam",
      categoryName: "Soups & Swallows",
      price: 8500,
      quantity: 1,
      subtotal: 8500,
      notes: "Extra spicy with assorted goat meat",
    },
    {
      id: "demo_2",
      title: "Fresh Catfish Pepper Soup",
      categoryName: "Pepper Soups",
      price: 9500,
      quantity: 1,
      subtotal: 9500,
      notes: "Served piping hot in traditional earthen bowl",
    },
    {
      id: "demo_3",
      title: "Signature Chapman Cocktail",
      categoryName: "Cocktails & Drinks",
      price: 3500,
      quantity: 1,
      subtotal: 3500,
      notes: "Garnished with fresh cucumber & lemon",
    },
  ],
  specialInstructions: "VIP guest dining at executive patio. Please expedite promptly.",
  createdAt: new Date().toISOString(),
};

export default function AdminSettingsPage() {
  const {
    settings,
    paystackEnabled,
    thermalSettings,
    loading,
    isUpdating,
    error,
    togglePaystack,
    updateSettings,
    updateThermalSettings,
    toggleAutoPrintThermal,
  } = usePaymentSettings();

  const [bankName, setBankName] = useState(settings.bankDetails?.bankName || "Zenith Bank");
  const [accountName, setAccountName] = useState(settings.bankDetails?.accountName || "Banky Hotel & Suites Ltd");
  const [accountNumber, setAccountNumber] = useState(settings.bankDetails?.accountNumber || "1018273645");
  const [instructions, setInstructions] = useState(
    settings.bankDetails?.instructions ||
      "Please include your reservation reference in the transfer narration and show proof of payment at check-in."
  );
  const [noticeMessage, setNoticeMessage] = useState(settings.noticeMessage || "");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Thermal receipt settings local state
  const [autoPrintOnConfirmation, setAutoPrintOnConfirmation] = useState(
    thermalSettings?.autoPrintOnConfirmation ?? true
  );
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">(
    thermalSettings?.paperWidth || "80mm"
  );
  const [triggerOn, setTriggerOn] = useState<"confirmation" | "incoming" | "both">(
    thermalSettings?.triggerOn || "both"
  );
  const [chimeOnPrint, setChimeOnPrint] = useState(
    thermalSettings?.chimeOnPrint ?? true
  );
  const [includeChefNotes, setIncludeChefNotes] = useState(
    thermalSettings?.includeChefNotes ?? true
  );
  const [autoCloseAfterPrint, setAutoCloseAfterPrint] = useState(
    thermalSettings?.autoCloseAfterPrint ?? false
  );

  // Modal test print state
  const [testOrderModal, setTestOrderModal] = useState<QrOrder | null>(null);
  const [testAutoPrint, setTestAutoPrint] = useState(false);
  const [showKioskGuide, setShowKioskGuide] = useState(false);

  // Sync state if initial settings load
  const [hasSynced, setHasSynced] = useState(false);
  if (!hasSynced && !loading && settings.bankDetails) {
    setBankName(settings.bankDetails.bankName || "Zenith Bank");
    setAccountName(settings.bankDetails.accountName || "Banky Hotel & Suites Ltd");
    setAccountNumber(settings.bankDetails.accountNumber || "1018273645");
    setInstructions(settings.bankDetails.instructions || "");
    setNoticeMessage(settings.noticeMessage || "");
    setHasSynced(true);
  }

  // Sync thermal settings from remote when loaded
  useEffect(() => {
    if (settings.thermalPrinter) {
      setAutoPrintOnConfirmation(settings.thermalPrinter.autoPrintOnConfirmation);
      setPaperWidth(settings.thermalPrinter.paperWidth);
      setTriggerOn(settings.thermalPrinter.triggerOn);
      setChimeOnPrint(settings.thermalPrinter.chimeOnPrint);
      setIncludeChefNotes(settings.thermalPrinter.includeChefNotes);
      setAutoCloseAfterPrint(settings.thermalPrinter.autoCloseAfterPrint);
    }
  }, [settings.thermalPrinter]);

  const handleToggleAutoPrint = async () => {
    const next = !autoPrintOnConfirmation;
    setAutoPrintOnConfirmation(next);
    const success = await updateThermalSettings({ autoPrintOnConfirmation: next });
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };

  const handleSaveThermalSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const success = await updateThermalSettings({
      autoPrintOnConfirmation,
      paperWidth,
      triggerOn,
      chimeOnPrint,
      includeChefNotes,
      autoCloseAfterPrint,
    });
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };

  const handleTestPrint = (auto: boolean = true) => {
    setTestAutoPrint(auto);
    setTestOrderModal(SAMPLE_TEST_ORDER);
  };

  const handleToggle = async () => {
    const success = await togglePaystack();
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateSettings({
      noticeMessage,
      bankDetails: {
        bankName,
        accountName,
        accountNumber,
        instructions,
      },
    });
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };

  const copyAccountNumber = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffbf00]/15 text-[#b38600] dark:text-[#ffbf00] text-xs font-condensed uppercase tracking-wider font-semibold mb-3">
          <Sliders className="h-3.5 w-3.5" />
          <span>Site Administration &amp; Payments</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-[#222] dark:text-white">
          Payment Settings
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
          Enable or disable online Paystack checkout site-wide with a single click, or manage fallback bank accounts for front-desk settlement.
        </p>
      </div>

      {/* Global Success / Error Notification */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div className="text-sm">
            <strong>Settings Updated Successfully!</strong> Changes are active in real-time across all public booking, dining, and kitchen stations.
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div className="text-sm">
            <strong>Update Error:</strong> {error}
          </div>
        </div>
      )}

      {/* ── 1. THERMAL RECEIPT & POS PRINTER SETTINGS CARD ── */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 shadow-md ${
          autoPrintOnConfirmation
            ? "bg-gradient-to-br from-blue-50/90 via-white to-blue-50/40 dark:from-blue-950/20 dark:via-[#1a1815] dark:to-blue-950/10 border-blue-300 dark:border-blue-800/80"
            : "bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-stone-900/40 dark:via-[#1a1815] dark:to-stone-900/20 border-stone-200 dark:border-stone-800"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-200/80 dark:border-stone-800/80">
          <div className="flex items-start gap-4">
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                autoPrintOnConfirmation
                  ? "bg-blue-600 text-white shadow-blue-500/30"
                  : "bg-stone-400 text-white shadow-stone-500/20"
              }`}
            >
              <Printer className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display text-2xl text-stone-900 dark:text-white">
                  Thermal Receipt Printing
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    autoPrintOnConfirmation
                      ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      autoPrintOnConfirmation ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                    }`}
                  />
                  {autoPrintOnConfirmation ? `Auto-Print Active (${paperWidth})` : "Manual Print Only"}
                </span>
              </div>

              <p className="text-sm text-stone-600 dark:text-stone-300 max-w-2xl leading-relaxed">
                Automatically dispatch an 80mm or 58mm continuous thermal expedite slip to your connected POS printer upon order confirmation. Compatible with Epson, Xprinter, Star Micronics, and network thermal printers.
              </p>
            </div>
          </div>

          {/* MASTER AUTO-PRINT TOGGLE BUTTON */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleToggleAutoPrint}
              disabled={isUpdating || loading}
              className={`w-full sm:w-auto px-6 py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer ${
                autoPrintOnConfirmation
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25"
                  : "bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-700 dark:hover:bg-stone-600 shadow-stone-800/25"
              }`}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating…</span>
                </>
              ) : autoPrintOnConfirmation ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Auto-Print: Enabled</span>
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  <span>Enable Auto-Print</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* PRINTER CONFIGURATION CONTROLS */}
        <form onSubmit={handleSaveThermalSettings} className="mt-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Paper Roll Width */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Paper Roll Format
              </label>
              <div className="grid grid-cols-2 gap-2 bg-stone-100 dark:bg-stone-900/80 p-1.5 rounded-xl border border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setPaperWidth("80mm")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    paperWidth === "80mm"
                      ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  80mm Standard
                  <span className="block text-[10px] font-normal text-stone-500">Wide Continuous Roll</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth("58mm")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    paperWidth === "58mm"
                      ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  58mm Compact
                  <span className="block text-[10px] font-normal text-stone-500">Mini / Mobile POS</span>
                </button>
              </div>
            </div>

            {/* Print Trigger Moment */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Auto-Print Trigger Event
              </label>
              <select
                value={triggerOn}
                onChange={(e) => setTriggerOn(e.target.value as "confirmation" | "incoming" | "both")}
                className="w-full px-3.5 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-white text-xs font-medium focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="both">Both (Incoming Order + Kitchen Acceptance)</option>
                <option value="confirmation">Order Confirmation (Staff clicks &apos;Start Preparing&apos;)</option>
                <option value="incoming">Incoming Placement (Instantly upon guest checkout)</option>
              </select>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Controls the exact moment the print docket dialog is invoked.
              </p>
            </div>

            {/* Chime & Sign-Off Toggles */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Audio &amp; Docket Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chimeOnPrint}
                    onChange={(e) => setChimeOnPrint(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Play audio chime when printing slip</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeChefNotes}
                    onChange={(e) => setIncludeChefNotes(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Include Chef &amp; Runner sign-off blanks</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCloseAfterPrint}
                    onChange={(e) => setAutoCloseAfterPrint(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Auto-close slip preview after print dialog</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Row: Test Print & Save */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTestPrint(true)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                title="Send a sample expedite ticket to your thermal printer"
              >
                <Printer className="h-4 w-4 text-blue-600" />
                <span>Test Print Thermal Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setShowKioskGuide(!showKioskGuide)}
                className="px-3 py-2 text-xs font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Silent Kiosk Printing Setup</span>
                {showKioskGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/qr-orders"
                className="px-4 py-2.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Go to Live Orders Feed</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <button
                type="submit"
                disabled={isUpdating || loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Printer Preferences</span>
              </button>
            </div>
          </div>

          {/* Kiosk Printing Instructions Accordion */}
          {showKioskGuide && (
            <div className="p-4 sm:p-5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 space-y-2 animate-in fade-in slide-in-from-top-1">
              <div className="font-semibold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                <span>Silent / 1-Click Thermal Printing (Kiosk Mode)</span>
              </div>
              <p>
                To have receipts print instantly to your thermal roll printer without prompting the browser print preview dialog every time:
              </p>
              <ol className="list-decimal pl-5 space-y-1 font-mono text-[11px] text-stone-800 dark:text-stone-200">
                <li>Set your 80mm or 58mm POS printer as the default Windows/macOS/Linux system printer.</li>
                <li>In Chrome or Edge, start the browser shortcut with the flag: <code className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded font-bold text-blue-600 dark:text-blue-400">--kiosk-printing</code></li>
                <li>When &quot;Auto-Print on Confirmation&quot; fires, the ticket outputs straight to physical paper silently.</li>
              </ol>
            </div>
          )}
        </form>
      </div>

      {/* ── 2. MASTER PAYSTACK SWITCH CARD ── */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 shadow-md ${
          paystackEnabled
            ? "bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 dark:from-emerald-950/20 dark:via-[#1a1815] dark:to-emerald-950/10 border-emerald-300 dark:border-emerald-800/80"
            : "bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 dark:from-amber-950/30 dark:via-[#1a1815] dark:to-amber-950/10 border-amber-300 dark:border-amber-800/80"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                paystackEnabled
                  ? "bg-emerald-500 text-white shadow-emerald-500/30"
                  : "bg-amber-500 text-white shadow-amber-500/30"
              }`}
            >
              {paystackEnabled ? (
                <ShieldCheck className="h-7 w-7" />
              ) : (
                <ShieldAlert className="h-7 w-7" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display text-2xl text-stone-900 dark:text-white">
                  Paystack Online Payments
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    paystackEnabled
                      ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                      : "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      paystackEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  {paystackEnabled ? "Active Across Site" : "Disabled Across Site"}
                </span>
              </div>

              <p className="text-sm text-stone-600 dark:text-stone-300 max-w-2xl leading-relaxed">
                {paystackEnabled
                  ? "Guests can make instant online payments using Debit/Credit cards, Bank Transfer, and USSD via Paystack. Automated webhook confirmation is active."
                  : "Paystack gateway is turned OFF. Guests on the booking page and QR menu will see Direct Bank Transfer details and Front Desk payment instructions."}
              </p>

              <div className="pt-1 text-xs text-stone-500 dark:text-stone-400">
                Last modified:{" "}
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "System Default"}
                </span>{" "}
                by <span className="font-mono">{settings.updatedBy || "staff"}</span>
              </div>
            </div>
          </div>

          {/* MASTER TOGGLE BUTTON */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleToggle}
              disabled={isUpdating || loading}
              className={`w-full sm:w-auto px-6 py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer ${
                paystackEnabled
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/25"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25"
              }`}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating System…</span>
                </>
              ) : paystackEnabled ? (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  <span>Disable Paystack Across Site</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Enable Paystack Across Site</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live indicator banner */}
        <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 dark:text-stone-400">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-stone-500" />
            <span>
              Real-time synchronization: Any guest currently on the booking page sees the updated payment options in real time.
            </span>
          </div>

          <Link
            href="/booking"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-[var(--accent)] hover:underline font-medium"
          >
            <span>Preview Booking Checkout</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 2. HOTEL BANK ACCOUNT DETAILS (FOR DIRECT SETTLEMENT / OFFLINE MODE) ── */}
      <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#ece6dd] dark:border-[#2e2b26] pb-4">
          <div>
            <h3 className="font-display text-xl text-stone-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--accent)]" />
              <span>Direct Bank Transfer &amp; Front Desk Details</span>
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              These details are displayed to guests whenever Paystack is disabled or when guests opt for manual bank transfer.
            </p>
          </div>

          {/* Quick Preview Card */}
          <div className="bg-stone-50 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 p-3 rounded-xl flex items-center gap-4 text-xs">
            <div>
              <div className="text-[10px] uppercase font-mono text-stone-500">Live Account Number</div>
              <div className="font-mono font-bold text-stone-900 dark:text-white text-sm">
                {accountNumber} ({bankName})
              </div>
            </div>
            <button
              type="button"
              onClick={copyAccountNumber}
              className="p-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-[var(--accent)]"
              title="Copy account number"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveBankDetails} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Zenith Bank"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Banky Hotel & Suites Ltd"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="10-digit NUBAN"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-white font-mono text-sm focus:outline-none focus:border-[var(--accent)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                Notice Message When Paystack Is Offline
              </label>
              <input
                type="text"
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                placeholder="Custom notice shown to booking guests"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Guest Payment Instructions
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Instructions provided to guests after creating a bank transfer hold…"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isUpdating || loading}
              className="btn-gold px-6 py-3 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Bank &amp; Notice Details</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── 3. OPERATIONAL GUIDANCE ── */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] rounded-2xl p-6 space-y-3">
          <div className="h-9 w-9 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold">
            1
          </div>
          <h4 className="font-display text-lg text-stone-900 dark:text-white">
            When Paystack Is Enabled
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Guests who complete Step 2 on the booking page click &quot;Pay with Paystack&quot;. They are redirected to the secure gateway to settle their required stay deposit. When verified, their reservation automatically changes to <strong>Confirmed</strong> and generates their digital voucher.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] rounded-2xl p-6 space-y-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            2
          </div>
          <h4 className="font-display text-lg text-stone-900 dark:text-white">
            When Paystack Is Disabled
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            The booking engine smoothly transitions to <strong>Direct Settlement Mode</strong>. Guests see the hotel&apos;s bank account number and front-desk instructions. They confirm their hold with a single click, receiving an official Reference Number and voucher marked <em>&quot;Pending Front-Desk / Bank Settlement&quot;</em>.
          </p>
        </div>
      </div>

      {/* ── Interactive Test Thermal Receipt Modal ── */}
      <ThermalReceiptModal
        order={testOrderModal}
        onClose={() => {
          setTestOrderModal(null);
          setTestAutoPrint(false);
        }}
        elapsedMinutes={4}
        autoPrint={testAutoPrint}
        defaultPaperWidth={paperWidth}
        autoCloseAfterPrint={autoCloseAfterPrint}
      />
    </div>
  );
}
