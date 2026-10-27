"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Utensils,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  RefreshCw,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Printer,
  AlertTriangle,
  Flame,
  Sliders,
  Download,
  FileSpreadsheet,
  X,
  ListChecks,
  CheckSquare,
  Square,
  Check,
} from "lucide-react";
import { QrOrder, OrderStatus } from "@/lib/qr-menu/types";
import {
  subscribeOrders,
  updateOrderStatusInDb,
  playOrderChime,
  formatNaira,
} from "@/lib/qr-menu/store";
import { ThermalReceiptModal } from "@/components/qr/ThermalReceiptModal";
import { usePaymentSettings } from "@/lib/settings/usePaymentSettings";

export default function AdminQrOrdersPage() {
  const { thermalSettings, toggleAutoPrintThermal } = usePaymentSettings();
  const [orders, setOrders] = useState<QrOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [receiptModalOrder, setReceiptModalOrder] = useState<QrOrder | null>(null);
  const [autoPrintModal, setAutoPrintModal] = useState<boolean>(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const previousOrderCountRef = useRef<number>(0);

  // Live timer interval to keep elapsed times accurate without reloading
  useEffect(() => {
    setCurrentTime(Date.now());
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000); // update every 10 seconds
    return () => clearInterval(timer);
  }, []);

  // Subscribe to real-time orders
  useEffect(() => {
    const unsub = subscribeOrders((newOrders) => {
      // If there are more orders than before, play sound chime & auto-print if configured for incoming
      if (
        previousOrderCountRef.current > 0 &&
        newOrders.length > previousOrderCountRef.current
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
      previousOrderCountRef.current = newOrders.length;
      setOrders(newOrders);
      setLoading(false);
    });

    return () => unsub();
  }, [soundEnabled, thermalSettings.autoPrintOnConfirmation, thermalSettings.triggerOn]);

  // Calculate elapsed minutes from order creation
  const getElapsedMinutes = (isoString: string) => {
    try {
      const diffMs = currentTime - new Date(isoString).getTime();
      return Math.max(0, Math.floor(diffMs / 60000));
    } catch {
      return 0;
    }
  };

  // Check if an order is active and exceeds 30 minutes
  const isOrderOverdue = (order: QrOrder) => {
    const isActive = order.status === "pending" || order.status === "in_progress";
    return isActive && getElapsedMinutes(order.createdAt) >= 30;
  };

  const overdueOrders = orders.filter(isOrderOverdue);
  const overdueCount = overdueOrders.length;

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (filterStatus === "priority") {
      if (!isOrderOverdue(o)) return false;
    } else if (filterStatus !== "all" && o.status !== filterStatus) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = o.orderNumber.toLowerCase().includes(q);
      const matchLoc = o.roomOrTable.toLowerCase().includes(q);
      const matchGuest = (o.guestName || "").toLowerCase().includes(q);
      const matchItem = o.items.some((i) => i.title.toLowerCase().includes(q));
      return matchNum || matchLoc || matchGuest || matchItem;
    }
    return true;
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const inProgressCount = orders.filter((o) => o.status === "in_progress").length;
  const fulfilledCount = orders.filter((o) => o.status === "fulfilled").length;

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrderStatusInDb(orderId, newStatus);
    // If order was confirmed (started preparation), automatically dispatch thermal receipt if enabled
    if (
      newStatus === "in_progress" &&
      thermalSettings.autoPrintOnConfirmation &&
      (thermalSettings.triggerOn === "confirmation" || thermalSettings.triggerOn === "both")
    ) {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setReceiptModalOrder(order);
        setAutoPrintModal(true);
        if (soundEnabled && thermalSettings.chimeOnPrint) {
          playOrderChime();
        }
      }
    }
  };

  // Bulk actions handlers
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const visibleOrderIds = filteredOrders.map((o) => o.id);
  const isAllVisibleSelected =
    visibleOrderIds.length > 0 && visibleOrderIds.every((id) => selectedOrderIds.includes(id));
  const isSomeVisibleSelected =
    visibleOrderIds.some((id) => selectedOrderIds.includes(id)) && !isAllVisibleSelected;

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !visibleOrderIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...visibleOrderIds])));
    }
  };

  const handleBulkStatusChange = async (targetStatus: OrderStatus) => {
    if (selectedOrderIds.length === 0 || isBulkUpdating) return;
    setIsBulkUpdating(true);
    try {
      const targetIds = [...selectedOrderIds];
      await Promise.all(
        targetIds.map((id) => updateOrderStatusInDb(id, targetStatus))
      );
      const labelMap: Record<OrderStatus, string> = {
        pending: "Pending Queue",
        in_progress: "In Progress",
        fulfilled: "Fulfilled",
        cancelled: "Cancelled",
      };
      setBulkFeedback(
        `Updated ${targetIds.length} order${targetIds.length > 1 ? "s" : ""} to "${labelMap[targetStatus]}".`
      );
      setSelectedOrderIds([]);
      setTimeout(() => setBulkFeedback(null), 4000);
    } catch (err) {
      console.error("Bulk update error:", err);
      setBulkFeedback("Failed to update some orders. Please try again.");
      setTimeout(() => setBulkFeedback(null), 4000);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMins = getElapsedMinutes(isoString);
      if (diffMins < 1) return "Just now";
      if (diffMins === 1) return "1 min ago";
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours}h ago`;
    } catch {
      return "Recent";
    }
  };

  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);

  const handleExportCsv = () => {
    const listToExport = filteredOrders.length > 0 ? filteredOrders : orders;
    if (listToExport.length === 0) return;
    setExportingCsv(true);

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
        "Elapsed Time (Minutes)",
      ];

      const escapeCsv = (val: unknown) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = listToExport.map((order) => {
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
              `${item.quantity}x ${item.title} (₦${item.price.toLocaleString("en-NG")})${
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

        const elapsed = getElapsedMinutes(order.createdAt);

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
          escapeCsv(elapsed),
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `banky-kitchen-bar-orders-audit-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportMessage(`Audit report with ${listToExport.length} orders downloaded successfully!`);
      setTimeout(() => setExportMessage(null), 5000);
    } catch (err) {
      console.error("Failed to generate CSV export:", err);
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl text-stone-900 dark:text-white font-semibold">
              Kitchen & Bar Live Orders
            </h1>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Real-time feed of guest orders placed from rooms, restaurant tables, and poolside sitouts.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Quick Auto-Print Thermal Receipt Toggle Button */}
          <button
            onClick={() => toggleAutoPrintThermal()}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
              thermalSettings.autoPrintOnConfirmation
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100"
                : "bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700 hover:bg-stone-200"
            }`}
            title={`Thermal Receipt Auto-Print: ${thermalSettings.autoPrintOnConfirmation ? "Enabled" : "Disabled"}. Click to toggle.`}
          >
            <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Auto-Print: {thermalSettings.autoPrintOnConfirmation ? `ON (${thermalSettings.paperWidth})` : "OFF"}</span>
          </button>

          {/* CSV Export Button for Audit Reports */}
          <button
            onClick={handleExportCsv}
            disabled={orders.length === 0 || exportingCsv}
            className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            title="Download CSV report of kitchen & bar orders for auditing"
          >
            <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Export CSV {filteredOrders.length > 0 ? `(${filteredOrders.length})` : ""}</span>
          </button>

          <Link
            href="/admin/settings"
            className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors"
            title="Configure Thermal Printer & POS Settings"
          >
            <Sliders className="h-4 w-4" />
          </Link>

          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playOrderChime();
            }}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100"
                : "bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700 hover:bg-stone-200"
            }`}
            title="Toggle kitchen chime sound"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-600" /> : <VolumeX className="h-4 w-4" />}
            <span>Chime {soundEnabled ? "Active" : "Muted"}</span>
          </button>
        </div>
      </div>

      {/* ── CSV Export Success Notification ── */}
      {exportMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-xs sm:text-sm animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{exportMessage}</span>
          </div>
          <button
            onClick={() => setExportMessage(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Visual Alert Banner for Orders Exceeding 30 Minutes ── */}
      {overdueCount > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500 dark:border-red-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-red-900 dark:text-red-300 uppercase tracking-wide">
                  CRITICAL KITCHEN ALERT: {overdueCount} Order{overdueCount > 1 ? "s" : ""} Exceeding 30 Minutes!
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">
                  Immediate Priority
                </span>
              </div>
              <p className="text-xs text-red-800 dark:text-red-400 mt-0.5">
                These pending/in-progress orders have exceeded the 30-minute preparation threshold. Expedite immediately to ensure guest satisfaction.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus("priority")}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap flex items-center gap-1.5 transition-all"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Show Priority Orders ({overdueCount})</span>
          </button>
        </div>
      )}

      {/* ── Operational Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div
          onClick={() => setFilterStatus("all")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === "all"
              ? "bg-stone-900 text-white border-stone-900 shadow-md"
              : "bg-white dark:bg-[#1a1815] text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-stone-400"
          }`}
        >
          <span className="text-xs uppercase font-medium tracking-wider opacity-80 block mb-1">
            Total Orders
          </span>
          <span className="font-display text-2xl font-bold">{orders.length}</span>
        </div>

        {/* Priority Card with live alert status */}
        <div
          onClick={() => setFilterStatus("priority")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === "priority"
              ? "bg-red-600 text-white border-red-700 shadow-md"
              : overdueCount > 0
              ? "bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-300 border-red-300 dark:border-red-800 ring-2 ring-red-500/20"
              : "bg-white dark:bg-[#1a1815] text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-stone-400"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase font-bold tracking-wider flex items-center gap-1">
              <Flame className="h-3 w-3 text-red-600" />
              Priority (&gt;30m)
            </span>
            {overdueCount > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-2xl font-bold ${overdueCount > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
              {overdueCount}
            </span>
            {overdueCount > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.2 rounded">
                Overdue
              </span>
            )}
          </div>
        </div>

        <div
          onClick={() => setFilterStatus("pending")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === "pending"
              ? "bg-amber-500 text-white border-amber-600 shadow-md"
              : "bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:border-amber-400"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase font-medium tracking-wider">Queue / New</span>
            {pendingCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
            )}
          </div>
          <span className="font-display text-2xl font-bold">{pendingCount}</span>
        </div>

        <div
          onClick={() => setFilterStatus("in_progress")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === "in_progress"
              ? "bg-blue-600 text-white border-blue-700 shadow-md"
              : "bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:border-blue-400"
          }`}
        >
          <span className="text-xs uppercase font-medium tracking-wider block mb-1">
            Cooking / In Prep
          </span>
          <span className="font-display text-2xl font-bold">{inProgressCount}</span>
        </div>

        <div
          onClick={() => setFilterStatus("fulfilled")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === "fulfilled"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-md"
              : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400"
          }`}
        >
          <span className="text-xs uppercase font-medium tracking-wider block mb-1">
            Fulfilled Today
          </span>
          <span className="font-display text-2xl font-bold">{fulfilledCount}</span>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-[#1a1815] p-3.5 rounded-xl border border-stone-200 dark:border-stone-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Room, Order #, Guest or Item…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:border-stone-600"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
          {[
            { id: "all", label: "All Orders" },
            {
              id: "priority",
              label: `🔥 Priority (>30m)${overdueCount > 0 ? ` (${overdueCount})` : ""}`,
              urgent: overdueCount > 0,
            },
            { id: "pending", label: "Pending Queue" },
            { id: "in_progress", label: "In Progress" },
            { id: "fulfilled", label: "Fulfilled" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => {
            const isSelected = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? tab.id === "priority"
                      ? "bg-red-600 text-white font-bold shadow-xs"
                      : "bg-stone-900 dark:bg-white text-white dark:text-stone-900"
                    : tab.urgent
                    ? "bg-red-100 text-red-800 border border-red-300 font-semibold"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bulk Action Notification Banner ── */}
      {bulkFeedback && (
        <div className="p-3.5 rounded-xl bg-stone-900 text-white dark:bg-amber-950 dark:text-amber-100 border border-stone-700 dark:border-amber-700 flex items-center justify-between text-xs sm:text-sm animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{bulkFeedback}</span>
          </div>
          <button
            onClick={() => setBulkFeedback(null)}
            className="text-stone-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Bulk Selection Toolbar ── */}
      {filteredOrders.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-100 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-medium text-stone-700 dark:text-stone-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = isSomeVisibleSelected;
                  }
                }}
                onChange={toggleSelectAllVisible}
                className="h-4 w-4 rounded border-stone-300 dark:border-stone-600 text-stone-900 focus:ring-stone-500 cursor-pointer"
              />
              <span>
                {isAllVisibleSelected
                  ? `Deselect All (${filteredOrders.length})`
                  : `Select All (${filteredOrders.length})`}
              </span>
            </label>

            {selectedOrderIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-[11px] font-semibold">
                {selectedOrderIds.length} selected
              </span>
            )}
          </div>

          {selectedOrderIds.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-500 text-[11px] font-medium hidden sm:inline">Bulk Action:</span>
              <button
                disabled={isBulkUpdating}
                onClick={() => handleBulkStatusChange("fulfilled")}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                title="Mark all selected orders as Fulfilled"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Set Fulfilled</span>
              </button>
              <button
                disabled={isBulkUpdating}
                onClick={() => handleBulkStatusChange("in_progress")}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                title="Mark all selected orders as In Progress"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>In Progress</span>
              </button>
              <button
                disabled={isBulkUpdating}
                onClick={() => handleBulkStatusChange("pending")}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                title="Set all selected orders to Pending Queue"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Pending</span>
              </button>
              <button
                disabled={isBulkUpdating}
                onClick={() => handleBulkStatusChange("cancelled")}
                className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-red-100 hover:text-red-700 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                title="Cancel all selected orders"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                disabled={isBulkUpdating}
                onClick={() => setSelectedOrderIds([])}
                className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 px-2 py-1 text-xs underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          ) : (
            <span className="text-stone-400 text-[11px] italic">
              Select multiple orders above to perform batch kitchen actions
            </span>
          )}
        </div>
      )}

      {/* ── Live Orders List ── */}
      {loading ? (
        <div className="p-12 text-center text-stone-500 text-sm">
          Connecting to kitchen order stream…
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center text-stone-500 dark:text-stone-400">
          <Utensils className="h-10 w-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <p className="text-stone-700 dark:text-stone-200 font-medium text-base">
            {filterStatus === "priority"
              ? "No priority orders exceeding 30 minutes! Kitchen is on schedule."
              : "No orders found in this category."}
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Incoming orders scanned from rooms or restaurant tables will pop up here instantly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === "pending";
            const isInProgress = order.status === "in_progress";
            const isFulfilled = order.status === "fulfilled";
            const isCancelled = order.status === "cancelled";
            const elapsedMins = getElapsedMinutes(order.createdAt);
            const isOverdue = (isPending || isInProgress) && elapsedMins >= 30;
            const isApproaching = (isPending || isInProgress) && elapsedMins >= 20 && elapsedMins < 30;
            const isSelected = selectedOrderIds.includes(order.id);

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-[#1a1815] rounded-2xl border transition-all duration-200 shadow-sm flex flex-col justify-between overflow-hidden ${
                  isSelected
                    ? "ring-2 ring-stone-900 dark:ring-amber-400 border-stone-900 dark:border-amber-400 shadow-md"
                    : isOverdue
                    ? "border-red-500 ring-2 ring-red-500/25 shadow-md dark:border-red-600"
                    : isPending
                    ? "border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-400/20"
                    : isInProgress
                    ? "border-blue-300 dark:border-blue-700/60"
                    : isFulfilled
                    ? "border-emerald-200 dark:border-emerald-800/40 opacity-90"
                    : "border-stone-200 dark:border-stone-800 opacity-60"
                }`}
              >
                {/* Visual Priority Alert Banner (Top of Card if >30m) */}
                {isOverdue && (
                  <div className="bg-red-600 text-white px-3.5 py-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 animate-bounce" />
                      <span>PRIORITY: OVERDUE</span>
                    </div>
                    <span className="font-mono text-xs font-black">
                      {elapsedMins}m ELAPSED (&gt;30M LIMIT)
                    </span>
                  </div>
                )}

                {/* Approaching limit warning banner (20-29m) */}
                {!isOverdue && isApproaching && (
                  <div className="bg-amber-500/90 text-white px-3 py-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Approaching 30m limit
                    </span>
                    <span className="font-mono">{elapsedMins} mins elapsed</span>
                  </div>
                )}

                {/* Header bar */}
                <div className="p-4 border-b border-stone-100 dark:border-stone-800/60 bg-stone-50/70 dark:bg-stone-900/40 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {/* Bulk Action Checkbox */}
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="h-4 w-4 rounded border-stone-300 dark:border-stone-600 text-stone-900 focus:ring-stone-500 cursor-pointer"
                        title="Select order for bulk action"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {formatTimeAgo(order.createdAt)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-semibold text-xs tracking-wide">
                          {order.roomOrTable}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-mono">
                          {order.orderType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Priority Badge + Direct Print button */}
                  <div className="flex items-center gap-1.5">
                    {/* Quick Thermal Print Icon */}
                    <button
                      onClick={() => setReceiptModalOrder(order)}
                      className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
                      title="Preview & print thermal receipt slip"
                    >
                      <Printer className="h-4 w-4" />
                    </button>

                    {isOverdue ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs animate-pulse">
                        <Flame className="h-3 w-3" />
                        Priority
                      </span>
                    ) : isPending ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                        Pending
                      </span>
                    ) : isInProgress ? (
                      <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider border border-blue-300 dark:border-blue-700">
                        In Progress
                      </span>
                    ) : isFulfilled ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Fulfilled
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 text-[11px] font-bold uppercase tracking-wider">
                        Cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Guest info & Special notes */}
                <div className="p-4 flex-1 space-y-3">
                  {(order.guestName || order.guestPhone) && (
                    <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800/60">
                      <span>Guest: <strong>{order.guestName || "In-House Guest"}</strong></span>
                      {order.guestPhone && (
                        <a
                          href={`tel:${order.guestPhone}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          <Phone className="h-3 w-3" />
                          {order.guestPhone}
                        </a>
                      )}
                    </div>
                  )}

                  {order.specialInstructions && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-semibold block text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Special Instructions:
                      </span>
                      {order.specialInstructions}
                    </div>
                  )}

                  {/* Order Items Table */}
                  <div className="space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-stone-50 dark:border-stone-800/40">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded bg-stone-100 dark:bg-stone-800 font-mono font-bold text-stone-800 dark:text-stone-200 flex items-center justify-center text-[11px]">
                            {item.quantity}×
                          </span>
                          <span className="text-stone-800 dark:text-stone-200 font-medium">{item.title}</span>
                        </div>
                        <span className="text-stone-500 dark:text-stone-400 font-mono">{formatNaira(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
                    <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Total Bill</span>
                    <span className="text-base font-bold text-stone-900 dark:text-white font-display">
                      {formatNaira(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Action buttons & Print Slip Trigger */}
                <div className="p-3 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
                  {/* Thermal Receipt Print Button */}
                  <button
                    onClick={() => setReceiptModalOrder(order)}
                    className="h-9 px-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-stone-200 dark:border-stone-700 transition-colors"
                    title="Print clean receipt view for thermal printers"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Print Slip</span>
                  </button>

                  {isPending && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, "in_progress")}
                        className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <span>Start Preparing</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(order.id, "cancelled")}
                        className="h-9 px-3 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {isInProgress && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, "fulfilled")}
                        className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ready & Delivered</span>
                      </button>
                    </>
                  )}

                  {isFulfilled && (
                    <button
                      onClick={() => handleStatusChange(order.id, "in_progress")}
                      className="flex-1 h-8 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white text-xs font-medium"
                    >
                      Reopen to In Progress
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky Bottom Bulk Action Bar ── */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl bg-stone-900/95 dark:bg-stone-950/95 backdrop-blur-md text-white border border-stone-700/80 rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="h-6 px-2.5 rounded-full bg-amber-500 text-stone-950 text-xs font-bold flex items-center justify-center">
                {selectedOrderIds.length}
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                Order{selectedOrderIds.length > 1 ? "s" : ""} Selected
              </span>
            </div>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="text-xs text-stone-400 hover:text-white underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("fulfilled")}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Mark Fulfilled</span>
            </button>
            <button
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("in_progress")}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
              <span>In Progress</span>
            </button>
            <button
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("pending")}
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Pending</span>
            </button>
            <button
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("cancelled")}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-red-900/60 text-stone-300 hover:text-red-200 border border-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Printer-Friendly Thermal Receipt Modal ── */}
      <ThermalReceiptModal
        order={receiptModalOrder}
        onClose={() => {
          setReceiptModalOrder(null);
          setAutoPrintModal(false);
        }}
        elapsedMinutes={receiptModalOrder ? getElapsedMinutes(receiptModalOrder.createdAt) : 0}
        autoPrint={autoPrintModal}
        defaultPaperWidth={thermalSettings.paperWidth}
        autoCloseAfterPrint={thermalSettings.autoCloseAfterPrint}
      />
    </div>
  );
}
