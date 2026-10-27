"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  DollarSign,
  AlertTriangle,
  Receipt,
  Eye,
  Check,
  Copy,
  Download,
  Printer,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  Sliders,
  Sparkles,
  Zap,
  X,
} from "lucide-react";
import { naira } from "@/lib/hotel";
import type { TransactionAuditItem, TransactionAuditSummary } from "@/lib/booking/audit";
import {
  TransactionDateRangePicker,
  type DateRange,
} from "@/components/admin/TransactionDateRangePicker";

export default function TransactionAuditPage() {
  const [items, setItems] = useState<TransactionAuditItem[]>([]);
  const [summary, setSummary] = useState<TransactionAuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [gatewayFilter, setGatewayFilter] = useState<"all" | "paystack" | "bank_transfer">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "successful" | "failed" | "pending">("all");
  const [dateRange, setDateRange] = useState<DateRange>({ preset: "all" });
  const [search, setSearch] = useState("");

  // Modals & Drawers
  const [detailItem, setDetailItem] = useState<TransactionAuditItem | null>(null);
  const [confirmItem, setConfirmItem] = useState<TransactionAuditItem | null>(null);
  const [bankRefInput, setBankRefInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (gatewayFilter !== "all") params.set("gateway", gatewayFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateRange.startDate) params.set("startDate", dateRange.startDate);
      if (dateRange.endDate) params.set("endDate", dateRange.endDate);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "100");

      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setItems(json.data.items || []);
        setSummary(json.data.summary || null);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gatewayFilter, statusFilter, dateRange, search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleConfirmManualTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmItem) return;

    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_manual_transfer",
          reservationId: confirmItem.reservationId,
          bankReference: bankRefInput.trim(),
          notes: notesInput.trim(),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setActionMessage({ text: "Manual bank transfer verified and reservation confirmed!", type: "success" });
        setConfirmItem(null);
        setBankRefInput("");
        setNotesInput("");
        await fetchTransactions(true);
      } else {
        setActionMessage({ text: json.message || "Failed to confirm bank transfer", type: "error" });
      }
    } catch {
      setActionMessage({ text: "Network error occurred", type: "error" });
    } finally {
      setActionBusy(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-condensed uppercase tracking-wider font-semibold mb-2">
            <Receipt className="h-3.5 w-3.5" />
            <span>Financial Integrity &amp; Payment Ledger</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#222] dark:text-white">
            Transaction Audit
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Real-time audit log of payment successes and failures, comparing online Paystack gateway events and manual bank transfer settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchTransactions(true)}
            disabled={refreshing}
            className="p-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#1a1815] text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors inline-flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[var(--accent)]" : ""}`} />
            <span>{refreshing ? "Refreshing…" : "Sync Logs"}</span>
          </button>

          <Link
            href="/admin/settings"
            className="p-2.5 px-4 rounded-xl bg-stone-900 text-white dark:bg-stone-800 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors inline-flex items-center gap-2 shadow-sm"
          >
            <Sliders className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Payment Gateway Switch</span>
          </Link>
        </div>
      </div>

      {/* Global Action Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
            actionMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── KPI METRIC CARDS ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Settled Volume */}
        <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow text-stone-500">Audited Volume</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl text-stone-900 dark:text-white">
            {summary ? naira(summary.totalSuccessVolumeKobo / 100) : "—"}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>{summary?.successCount ?? 0} confirmed settlements</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow text-stone-500">Settlement Success Rate</span>
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl text-stone-900 dark:text-white">
            {summary ? `${summary.successRatePercent}%` : "—"}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            <span>{summary?.failedCount ?? 0} failed / unverified attempts</span>
          </div>
        </div>

        {/* Paystack Gateway Breakdown */}
        <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow text-stone-500 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-blue-500" />
              <span>Paystack Gateway</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold uppercase">
              {summary ? `${summary.paystack.successRate}% Success` : "Gateway"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl text-stone-900 dark:text-white">
              {summary?.paystack.successful ?? 0}
            </span>
            <span className="text-xs text-stone-500">/ {summary?.paystack.total ?? 0} initiated</span>
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span className="text-red-500">{summary?.paystack.failed ?? 0} failed/declined</span>
            <span className="font-mono text-stone-700 dark:text-stone-300">
              {summary ? naira(summary.paystack.volumeKobo / 100) : "0"}
            </span>
          </div>
        </div>

        {/* Manual Bank Transfer Breakdown */}
        <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow text-stone-500 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Manual Bank Transfers</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold uppercase">
              {summary?.bankTransfer.pending ?? 0} In Review
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl text-stone-900 dark:text-white">
              {summary?.bankTransfer.successful ?? 0}
            </span>
            <span className="text-xs text-stone-500">/ {summary?.bankTransfer.total ?? 0} holds</span>
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span className="text-amber-600 dark:text-amber-400">{summary?.bankTransfer.pending ?? 0} pending proof</span>
            <span className="font-mono text-stone-700 dark:text-stone-300">
              {summary ? naira(summary.bankTransfer.volumeKobo / 100) : "0"}
            </span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Gateway Tabs */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setGatewayFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                gatewayFilter === "all"
                  ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              All Types ({summary?.totalCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setGatewayFilter("paystack")}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                gatewayFilter === "paystack"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:text-blue-600"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Paystack Logs ({summary?.paystack.total ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setGatewayFilter("bank_transfer")}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                gatewayFilter === "bank_transfer"
                  ? "bg-[var(--accent)] text-stone-900 font-bold shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:text-[var(--accent)]"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Bank Transfers ({summary?.bankTransfer.total ?? 0})</span>
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-stone-900"
                  : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
              }`}
            >
              All Statuses
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("successful")}
              className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === "successful"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Successes ({summary?.successCount ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("failed")}
              className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === "failed"
                  ? "bg-red-600 text-white border-red-600"
                  : "border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              }`}
            >
              <XCircle className="h-3 w-3" />
              <span>Failures ({summary?.failedCount ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>Pending / In Review ({summary?.pendingCount ?? 0})</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Date-Range Picker */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions by reference (BKS-...), guest name, email, or Paystack reference..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <TransactionDateRangePicker
            value={dateRange}
            onChange={(range) => setDateRange(range)}
          />
        </div>
      </div>

      {/* ── TRANSACTION AUDIT LEDGER TABLE ── */}
      <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#ece6dd] dark:border-[#2e2b26] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-lg sm:text-xl text-stone-900 dark:text-white">
                Ledger &amp; Gateway Logs
              </h2>
              {dateRange.preset !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-semibold">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {dateRange.startDate === dateRange.endDate
                      ? dateRange.startDate
                      : `${dateRange.startDate || "Start"} to ${dateRange.endDate || "Present"}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDateRange({ preset: "all" })}
                    className="p-0.5 rounded-full hover:bg-[var(--accent)]/20 text-stone-600 dark:text-stone-300 ml-0.5"
                    title="Clear date filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Showing {items.length} audited transaction records
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Settled</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>Failed / Declined</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Pending Review</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent)] mx-auto" />
            <p className="text-xs text-stone-500">Loading audit records from Firestore ledger…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Receipt className="h-10 w-10 text-stone-300 dark:text-stone-700 mx-auto" />
            <h3 className="font-display text-base text-stone-800 dark:text-stone-200">
              No matching transaction logs found
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              There are no payment attempts matching your current filter criteria. New transactions created via Paystack or Direct Bank Transfer will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#f8f5f0] dark:bg-[#232019] border-b border-[#ece6dd] dark:border-[#2e2b26]">
                <tr>
                  <th className="p-3.5 font-condensed uppercase tracking-wider text-[11px] text-stone-600 dark:text-stone-400">
                    Status
                  </th>
                  <th className="p-3.5 font-condensed uppercase tracking-wider text-[11px] text-stone-600 dark:text-stone-400">
                    Payment Gateway &amp; Type
                  </th>
                  <th className="p-3.5 font-condensed uppercase tracking-wider text-[11px] text-stone-600 dark:text-stone-400">
                    Reservation &amp; Guest
                  </th>
                  <th className="p-3.5 font-condensed uppercase tracking-wider text-[11px] text-stone-600 dark:text-stone-400">
                    Gateway / Bank Ref
                  </th>
                  <th className="p-3.5 font-condensed uppercase tracking-wider text-[11px] text-stone-600 dark:text-stone-400">
                    Amount Settled
                  </th>
                  <th className="p-3.5 font-condensed uppercase tracking-wider text-[11px] text-stone-600 dark:text-stone-400">
                    Failure Reason / Audit Detail
                  </th>
                  <th className="p-3.5 font-condensed uppercase tracking-wider text-[11px] text-stone-600 dark:text-stone-400">
                    Timestamp
                  </th>
                  <th className="p-3.5 font-condensed uppercase tracking-wider text-[11px] text-stone-600 dark:text-stone-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece6dd]/60 dark:divide-[#2e2b26]/60">
                {items.map((tx) => {
                  const isSuccess = tx.status === "successful";
                  const isFailed = tx.status === "failed";
                  const isPending = tx.status === "pending" || tx.status === "processing";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-stone-50/70 dark:hover:bg-stone-900/40 transition-colors align-middle"
                    >
                      {/* Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono uppercase tracking-wider ${
                            isSuccess
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : isFailed
                              ? "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                          {isFailed && <XCircle className="h-3 w-3 text-red-600" />}
                          {isPending && <Clock className="h-3 w-3 text-amber-600" />}
                          <span>{tx.status}</span>
                        </span>
                      </td>

                      {/* Payment Gateway & Type */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                              tx.isPaystack
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {tx.isPaystack ? (
                              <CreditCard className="h-4 w-4" />
                            ) : (
                              <Building2 className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-stone-900 dark:text-white block text-xs">
                              {tx.isPaystack ? "Paystack Gateway" : "Direct Bank Transfer"}
                            </span>
                            <span className="text-[10px] text-stone-500 uppercase font-mono">
                              Channel: {tx.channel || (tx.isPaystack ? "card/ussd" : "manual_transfer")}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Reservation & Guest */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-stone-900 dark:text-white">
                              {tx.reference}
                            </span>
                          </div>
                          <div className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                            {tx.guestName}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {tx.roomTypeName}
                          </div>
                        </div>
                      </td>

                      {/* Gateway / Bank Ref */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-stone-600 dark:text-stone-300 truncate max-w-[150px]">
                            {tx.gatewayReference || "Pending Narration"}
                          </span>
                          {tx.gatewayReference && (
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.gatewayReference!, tx.id)}
                              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                              title="Copy Reference"
                            >
                              {copiedId === tx.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Amount Settled */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-stone-900 dark:text-white text-sm">
                          {naira(tx.amount / 100)}
                        </span>
                        <div className="text-[10px] text-stone-500 uppercase font-mono">
                          {tx.currency}
                        </div>
                      </td>

                      {/* Failure Reason / Audit Detail */}
                      <td className="p-3.5 max-w-[200px]">
                        {isFailed ? (
                          <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-[11px] flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              {tx.failureReason || "Gateway transaction declined"}
                            </span>
                          </div>
                        ) : isSuccess ? (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">
                              {tx.verifiedBy
                                ? `Verified via ${tx.verifiedBy}`
                                : tx.isPaystack
                                ? "Verified via Paystack Webhook"
                                : "Verified by Front Desk"}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>
                              {tx.isManualBankTransfer
                                ? "Awaiting Bank Proof"
                                : "Customer checkout in progress"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="p-3.5 whitespace-nowrap text-xs text-stone-500 font-mono">
                        <div>
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "—"}
                        </div>
                        <div className="text-[10px]">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If manual transfer and pending, allow quick confirmation */}
                          {tx.isManualBankTransfer && isPending && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmItem(tx);
                                setBankRefInput(tx.gatewayReference || "");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                              title="Verify and confirm bank transfer payment"
                            >
                              <Check className="h-3 w-3" />
                              <span>Verify</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDetailItem(tx)}
                            className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                            title="Inspect full transaction audit payload"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Inspect</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DETAIL INSPECTION DRAWER / MODAL ── */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    detailItem.isPaystack
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                  }`}
                >
                  {detailItem.isPaystack ? <CreditCard className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-display text-xl text-stone-900 dark:text-white">
                    Audit Inspection: {detailItem.reference}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {detailItem.isPaystack ? "Paystack API Transaction Record" : "Manual Bank Transfer Settlement Record"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Status & Amount Hero */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-stone-500 block">Settled Amount</span>
                <span className="font-display text-2xl text-stone-900 dark:text-white">
                  {naira(detailItem.amount / 100)}
                </span>
              </div>
              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    detailItem.status === "successful"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                      : detailItem.status === "failed"
                      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-700"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                  }`}
                >
                  {detailItem.status}
                </span>
              </div>
            </div>

            {/* Failure Reason Alert */}
            {detailItem.failureReason && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs space-y-1">
                <strong className="block font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Gateway Failure / Rejection Reason:</span>
                </strong>
                <p className="font-mono text-xs">{detailItem.failureReason}</p>
              </div>
            )}

            {/* Audit Grid */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="text-stone-500 block font-mono text-[10px] uppercase">Reservation Reference</span>
                <span className="font-bold text-stone-900 dark:text-white font-mono">{detailItem.reference}</span>
              </div>

              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="text-stone-500 block font-mono text-[10px] uppercase">Gateway Reference</span>
                <span className="font-bold text-stone-900 dark:text-white font-mono">
                  {detailItem.gatewayReference || "None"}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="text-stone-500 block font-mono text-[10px] uppercase">Guest Contact</span>
                <span className="font-medium text-stone-900 dark:text-white block">{detailItem.guestName}</span>
                <span className="text-stone-500">{detailItem.guestEmail}</span>
              </div>

              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="text-stone-500 block font-mono text-[10px] uppercase">Room Category</span>
                <span className="font-medium text-stone-900 dark:text-white block">{detailItem.roomTypeName}</span>
                {detailItem.checkIn && detailItem.checkOut && (
                  <span className="text-stone-500 font-mono">
                    {detailItem.checkIn} → {detailItem.checkOut}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="text-stone-500 block font-mono text-[10px] uppercase">Gateway Channel</span>
                <span className="font-medium text-stone-900 dark:text-white font-mono">{detailItem.channel}</span>
              </div>

              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <span className="text-stone-500 block font-mono text-[10px] uppercase">Audit Actor / Verified By</span>
                <span className="font-medium text-stone-900 dark:text-white font-mono">
                  {detailItem.verifiedBy || "Not verified"}
                </span>
              </div>
            </div>

            {/* Direct Guest Quick Links */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                {detailItem.guestPhone && (
                  <a
                    href={`https://wa.me/${detailItem.guestPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <span>Contact via WhatsApp</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <a
                  href={`mailto:${detailItem.guestEmail}?subject=Reservation%20Payment%20${detailItem.reference}`}
                  className="text-stone-600 dark:text-stone-400 hover:underline inline-flex items-center gap-1"
                >
                  <Mail className="h-3 w-3" />
                  <span>Send Email</span>
                </a>
              </div>

              <Link
                href={`/booking/confirmation?ref=${encodeURIComponent(detailItem.reference)}`}
                target="_blank"
                className="btn-gold px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span>View Guest Voucher</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL BANK TRANSFER CONFIRMATION MODAL ── */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="font-display text-lg text-stone-900 dark:text-white">
                  Confirm Manual Bank Transfer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <strong>Reservation: {confirmItem.reference}</strong>
              <p>Guest: {confirmItem.guestName} ({confirmItem.roomTypeName})</p>
              <p className="font-bold text-sm text-[var(--accent)]">
                Amount to Confirm: {naira(confirmItem.amount / 100)}
              </p>
            </div>

            <form onSubmit={handleConfirmManualTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                  Bank Reference / Narration / Session ID
                </label>
                <input
                  type="text"
                  value={bankRefInput}
                  onChange={(e) => setBankRefInput(e.target.value)}
                  placeholder="e.g. ZENITH-TRF-902837482"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                  Staff Verification Notes
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g. Verified by front desk, credited to Zenith bank"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setConfirmItem(null)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="btn-gold px-6 py-2.5 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{actionBusy ? "Verifying…" : "Confirm Payment & Lock Room"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
