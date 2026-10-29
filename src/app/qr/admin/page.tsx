"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Lock,
  KeyRound,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  Utensils,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Printer,
  Sliders,
  Download,
} from "lucide-react";
import { QrOrder, MenuItem } from "@/lib/qr-menu/types";
import {
  subscribeOrders,
  subscribeMenuItems,
  subscribeOrderStats,
  updateOrderStatusInDb,
  toggleItemAvailabilityInDb,
  playOrderChime,
  formatNaira,
} from "@/lib/qr-menu/store";
import { ThermalReceiptModal } from "@/components/qr/ThermalReceiptModal";
import { usePaymentSettings } from "@/lib/settings/usePaymentSettings";

const STAFF_PASSCODE = "banky2026";
const ALTERNATE_PASSCODE = "1234";

export default function QrAdminKitchenStation() {
  const { thermalSettings, toggleAutoPrintThermal } = usePaymentSettings();
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [stats, setStats] = useState<{ pending: number; inProgress: number; fulfilled: number; totalRevenue: number; ordersToday: number }>({ pending: 0, inProgress: 0, fulfilled: 0, totalRevenue: 0, ordersToday: 0 });

  // Live kitchen stats (updated in real-time via Firestore)
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeOrderStats((s) => setStats({ pending: s.pending, inProgress: s.inProgress, fulfilled: s.fulfilled, totalRevenue: s.totalRevenue, ordersToday: s.ordersToday }));
    return () => unsub();
  }, [isAuthenticated]);

  const [activeTab, setActiveTab] = useState<"orders" | "stock">("orders");
  const [orders, setOrders] = useState<QrOrder[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stockFilter, setStockFilter] = useState("");
  const [receiptModalOrder, setReceiptModalOrder] = useState<QrOrder | null>(null);
  const [autoPrintModal, setAutoPrintModal] = useState<boolean>(false);
  const previousOrdersLength = useRef(0);

  // Check saved session in localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAuth = sessionStorage.getItem("banky_kitchen_auth");
      if (savedAuth === "granted") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Listen to orders
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeOrders((newOrders) => {
      if (
        previousOrdersLength.current > 0 &&
        newOrders.length > previousOrdersLength.current
      ) {
        if (soundEnabled) {
          playOrderChime();
        }
        // Auto-print thermal slip upon incoming new order if enabled
        if (
          thermalSettings.autoPrintOnConfirmation &&
          (thermalSettings.triggerOn === "incoming" || thermalSettings.triggerOn === "both")
        ) {
          const newestOrder = newOrders[0];
          if (newestOrder) {
            setReceiptModalOrder(newestOrder);
            setAutoPrintModal(true);
          }
        }
      }
      previousOrdersLength.current = newOrders.length;
      setOrders(newOrders);
    });
    return () => unsub();
  }, [isAuthenticated, soundEnabled, thermalSettings.autoPrintOnConfirmation, thermalSettings.triggerOn]);

  // Listen to items for live 86 / stock manager
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeMenuItems((newItems) => {
      setItems(newItems);
    });
    return () => unsub();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === STAFF_PASSCODE || passcode.trim() === ALTERNATE_PASSCODE) {
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("banky_kitchen_auth", "granted");
      }
      setAuthError("");
    } else {
      setAuthError("Incorrect staff passcode. Use banky2026 or 1234.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("banky_kitchen_auth");
    }
  };

  const handleExportCsv = () => {
    if (orders.length === 0) return;

    try {
      const headers = [
        "Order Number",
        "Created Date & Time (WAT / Lagos)",
        "Status",
        "Order Location Type",
        "Room or Table",
        "Guest Name",
        "Guest Phone",
        "Items Breakdown",
        "Total Items Count",
        "Total Amount (NGN)",
        "Special Instructions / Notes",
      ];

      const escapeCsv = (val: unknown) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = orders.map((order) => {
        const formattedDate = new Date(order.createdAt).toLocaleString("en-GB", {
          timeZone: "Africa/Lagos",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const itemsBreakdown = order.items
          .map(
            (item) =>
              `${item.quantity}x ${item.title} (₦${item.priceAtOrder ? item.priceAtOrder.toLocaleString("en-NG") : formatNaira(item.subtotal)})${
                item.notes ? ` [Note: ${item.notes}]` : ""
              }`
          )
          .join("; ");

        const statusLabel =
          order.status === "pending"
            ? "Pending Confirmation"
            : order.status === "in_progress"
            ? "In Preparation"
            : order.status === "fulfilled"
            ? "Fulfilled"
            : "Cancelled";

        const typeLabel =
          order.orderType === "room"
            ? "In-Room Dining"
            : order.orderType === "poolside_garden"
            ? "Poolside / Garden"
            : "Restaurant Table";

        return [
          escapeCsv(order.orderNumber),
          escapeCsv(formattedDate),
          escapeCsv(statusLabel),
          escapeCsv(typeLabel),
          escapeCsv(order.roomOrTable),
          escapeCsv(order.guestName || "Walk-in Guest"),
          escapeCsv(order.guestPhone || "N/A"),
          escapeCsv(itemsBreakdown),
          escapeCsv(order.totalItems),
          escapeCsv(order.totalAmount),
          escapeCsv(order.specialInstructions || "None"),
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `banky-kitchen-orders-audit-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate CSV export:", err);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const inProgressOrders = orders.filter((o) => o.status === "in_progress");

  // If not authenticated, show secure passcode PIN pad
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#11100f] text-[#f4efe6] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-[#181715] border border-stone-800 rounded-3xl p-6 text-center shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-[#ffbf00]/20 border border-[#ffbf00]/40 flex items-center justify-center mx-auto mb-4 text-[#ffbf00]">
            <Lock className="h-6 w-6" />
          </div>

          <h2 className="font-display text-xl font-medium text-white">
            Kitchen & Bar Portal
          </h2>
          <p className="text-xs text-stone-400 mt-1 mb-6">
            Enter staff passcode to access live kitchen orders & stock management.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
              <input
                type="password"
                required
                autoFocus
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode (e.g. banky2026)"
                className="w-full h-11 pl-10 pr-4 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-600 focus:outline-none focus:border-[#ffbf00] text-center tracking-widest font-mono"
              />
            </div>

            {authError && (
              <p className="text-red-400 text-xs bg-red-950/60 p-2 rounded-lg border border-red-900/50">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full h-11 bg-[#ffbf00] hover:bg-[#e09e00] text-white rounded-xl text-sm font-semibold shadow-lg shadow-[#ffbf00]/20 active:scale-95 transition-all"
            >
              Unlock Station
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stone-800/80 text-[11px] text-stone-500">
            Banky Hotel & Suites Staff System
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#11100f] text-[#f4efe6] pb-20">
      {/* ── Kitchen Station Header ── */}
      <header className="sticky top-0 z-40 bg-[#181715]/95 backdrop-blur-md border-b border-stone-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-base text-white">
              Banky Kitchen / Bar
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playOrderChime();
              }}
              className={`p-2 rounded-lg text-xs border ${
                soundEnabled
                  ? "bg-amber-950/50 border-amber-800 text-amber-300"
                  : "bg-stone-900 border-stone-800 text-stone-500"
              }`}
              title="Kitchen Order Bell"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <button
              onClick={handleExportCsv}
              disabled={orders.length === 0}
              className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 text-xs hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              title="Download audit CSV report of kitchen orders"
            >
              <Download className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <Link
              href="/admin/qr-orders"
              className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 text-xs hover:text-white"
            >
              Full Admin
            </Link>

            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg text-stone-500 hover:text-white text-xs"
            >
              Lock
            </button>
          </div>
        </div>

        {/* Station Navigation Tabs */}
        <div className="max-w-5xl mx-auto mt-3 flex items-center gap-2 border-t border-stone-800 pt-2">
          <div className="flex items-center gap-3 text-[10px] font-mono text-stone-400 mr-2">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{stats.pending} pending</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{stats.inProgress} cooking</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{stats.fulfilled} done</span>
            <span className="flex items-center gap-1 ml-1 text-[#ffbf00]">{formatNaira(stats.totalRevenue)} today</span>
          </div>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === "orders"
                ? "bg-[#ffbf00] text-white"
                : "bg-stone-900 text-stone-400 hover:text-white"
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Active Orders ({pendingOrders.length + inProgressOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === "stock"
                ? "bg-[#ffbf00] text-white"
                : "bg-stone-900 text-stone-400 hover:text-white"
            }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>86 / Stock Switchboard</span>
          </button>
        </div>
      </header>

      {/* ── Main Station Content ── */}
      <main className="max-w-5xl mx-auto p-4">
        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="p-12 text-center text-stone-500 bg-stone-900/40 rounded-2xl border border-stone-800">
                <Clock className="h-8 w-8 mx-auto mb-2 text-stone-600" />
                <p className="text-sm font-medium text-stone-400">Kitchen order queue is empty</p>
                <p className="text-xs text-stone-600 mt-1">Waiting for guest orders…</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((o) => {
                  const isPending = o.status === "pending";
                  const isInProgress = o.status === "in_progress";
                  const isFulfilled = o.status === "fulfilled";

                  return (
                    <div
                      key={o.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between ${
                        isPending
                          ? "bg-[#1c1914] border-amber-500/60 ring-1 ring-amber-500/40"
                          : isInProgress
                          ? "bg-[#14181f] border-blue-500/50"
                          : "bg-stone-950/60 border-stone-900 opacity-60"
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs text-stone-400 font-bold">
                            {o.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              isPending
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : isInProgress
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {o.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Room */}
                        <div className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                          <span className="bg-[#ffbf00] text-white px-2.5 py-0.5 rounded-lg text-sm">
                            {o.roomOrTable}
                          </span>
                          {o.guestName && (
                            <span className="text-xs text-stone-400 font-normal">
                              ({o.guestName})
                            </span>
                          )}
                        </div>

                        {/* Special Instructions */}
                        {o.specialInstructions && (
                          <div className="p-2 bg-amber-950/50 border border-amber-800/40 rounded-lg text-xs text-amber-200 mb-3">
                            <span className="font-bold text-[10px] uppercase text-amber-400 block">
                              Note from Guest:
                            </span>
                            {o.specialInstructions}
                          </div>
                        )}

                        {/* Items */}
                        <div className="space-y-1 text-xs divide-y divide-stone-800/60 mb-3">
                          {o.items.map((i, idx) => (
                            <div key={idx} className="pt-1 flex items-center justify-between">
                              <span className="text-stone-200">
                                <strong>{i.quantity}×</strong> {i.title}
                              </span>
                              <span className="text-stone-400 font-mono">
                                {formatNaira(i.priceAtOrder ? i.priceAtOrder : i.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {/* Preparation Timeline */}
                        {o.kitchenStartedAt && (
                          <div className="flex items-center gap-3 text-[10px] text-stone-400 mb-2">
                            <Clock className="h-3 w-3 text-blue-400" />
                            <span>Kitchen started <span className="font-mono text-stone-500">{new Date(o.kitchenStartedAt).toLocaleTimeString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}</span></span>
                          </div>
                        )}
                        {o.fulfilledAt && (
                          <div className="flex items-center gap-3 text-[10px] text-stone-400 mb-2">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span>Delivered <span className="font-mono text-stone-500">{new Date(o.fulfilledAt).toLocaleTimeString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}</span></span>
                          </div>
                        )}
                      </div>

                      {/* Total & Action */}
                      <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-3">
                        <div className="font-display font-semibold text-sm text-[#ffbf00]">
                          {formatNaira(o.totalAmount)}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setReceiptModalOrder(o);
                              setAutoPrintModal(false);
                            }}
                            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
                            title="Print thermal receipt docket"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {isPending && (
                            <button
                              onClick={async () => {
                                await updateOrderStatusInDb(o.id, "in_progress");
                                if (
                                  thermalSettings.autoPrintOnConfirmation &&
                                  (thermalSettings.triggerOn === "confirmation" || thermalSettings.triggerOn === "both")
                                ) {
                                  setReceiptModalOrder(o);
                                  setAutoPrintModal(true);
                                  if (soundEnabled && thermalSettings.chimeOnPrint) {
                                    playOrderChime();
                                  }
                                }
                              }}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Start Cooking
                            </button>
                          )}
                          {isInProgress && (
                            <button
                              onClick={() => updateOrderStatusInDb(o.id, "fulfilled")}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Delivered</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "stock" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 bg-stone-900 p-3 rounded-xl border border-stone-800">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  placeholder="Quick search dish or drink to toggle stock…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-stone-950 border border-stone-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {items
                .filter((i) => !stockFilter || i.title.toLowerCase().includes(stockFilter.toLowerCase()))
                .map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      item.isAvailable
                        ? "bg-stone-900/80 border-stone-800"
                        : "bg-red-950/20 border-red-900/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-xs font-semibold text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {item.categoryName} • {formatNaira(item.price)}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleItemAvailabilityInDb(item.id, !item.isAvailable)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        item.isAvailable
                          ? "bg-emerald-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {item.isAvailable ? "In Stock" : "86 (Out)"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Printer-Friendly Thermal Receipt Modal */}
      <ThermalReceiptModal
        order={receiptModalOrder}
        onClose={() => {
          setReceiptModalOrder(null);
          setAutoPrintModal(false);
        }}
        elapsedMinutes={0}
        autoPrint={autoPrintModal}
        defaultPaperWidth={thermalSettings.paperWidth}
        autoCloseAfterPrint={thermalSettings.autoCloseAfterPrint}
      />
    </div>
  );
}
