"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarRange,
  BedDouble,
  Users,
  DollarSign,
  LogIn,
  LogOut,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Settings,
  ArrowRight,
  ReceiptText,
  Film,
} from "lucide-react";
import { naira } from "@/lib/hotel";
import type { Reservation } from "@/lib/booking/types";
import {
  RevenueTrendChart,
  DailyTrendItem,
  MonthMetadata,
} from "@/components/admin/RevenueTrendChart";
import { usePaymentSettings } from "@/lib/settings/usePaymentSettings";

function StatCard({ icon: Icon, label, value, color }: { icon: typeof CalendarRange; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] p-6 rounded-md">
      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow text-[#666] dark:text-stone-400">{label}</span>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${color}`}><Icon className="h-5 w-5" /></div>
      </div>
      <span className="font-display text-3xl text-[#222] dark:text-white">{value}</span>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState<{
    totalRooms: number;
    arrivals: number;
    departures: number;
    inHouse: number;
    revenue: number;
    recent: Reservation[];
    today: string;
    dailyTrends?: DailyTrendItem[];
    monthMetadata?: MonthMetadata;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { paystackEnabled, isUpdating: isUpdatingPayment, togglePaystack } = usePaymentSettings();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((j) => (j.ok ? setStats(j.data) : null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    checked_in: "bg-blue-100 text-blue-700",
    checked_out: "bg-stone-200 text-stone-700",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-red-50 text-red-500",
    completed: "bg-emerald-50 text-emerald-600",
    inquiry: "bg-stone-100 text-stone-600",
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-[#222] dark:text-white mb-1">Dashboard Overview</h1>
          <p className="text-sm text-[#666] dark:text-stone-400">
            {stats ? `Live operations for ${stats.today}.` : "Loading live operations…"}
          </p>
        </div>

        {/* Quick Paystack Gateway Master Switch */}
        <div className="flex items-center gap-3 p-2.5 px-4 rounded-xl border bg-white dark:bg-[#1a1815] border-[#ece6dd] dark:border-[#2e2b26] shadow-sm">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                paystackEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <div className="text-xs">
              <span className="font-semibold text-stone-900 dark:text-white block leading-tight">
                Paystack: {paystackEnabled ? "Enabled" : "Disabled"}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                {paystackEnabled ? "Cards & Transfers Live" : "Bank Transfer & Front Desk Mode"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => togglePaystack()}
            disabled={isUpdatingPayment}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              paystackEnabled
                ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            }`}
            title="Click to toggle Paystack payment gateway site-wide"
          >
            {isUpdatingPayment ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : paystackEnabled ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Disable Paystack</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Enable Paystack</span>
              </>
            )}
          </button>

          <Link
            href="/admin/home-media"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[#9a7300] dark:text-[var(--accent)] flex items-center gap-1.5 transition-colors border border-[var(--accent)]/30"
            title="Open Home Page Video & Image Management Center"
          >
            <Film className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Home Media Center</span>
          </Link>

          <Link
            href="/admin/transactions"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors"
            title="Open Transaction Audit Ledger"
          >
            <ReceiptText className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Transaction Audit</span>
          </Link>

          <Link
            href="/admin/settings"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Open Payment Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={BedDouble} label="Rooms" value={stats?.totalRooms ?? "—"} color="bg-[#ffbf00]/10 text-[#ffbf00]" />
        <StatCard icon={LogIn} label="Arrivals Today" value={stats?.arrivals ?? "—"} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Users} label="In House" value={stats?.inHouse ?? "—"} color="bg-blue-100 text-blue-600" />
        <StatCard icon={LogOut} label="Departures Today" value={stats?.departures ?? "—"} color="bg-stone-200 text-stone-700" />
        <StatCard icon={DollarSign} label="Revenue (Month)" value={stats ? naira(stats.revenue / 100) : "—"} color="bg-amber-100 text-amber-600" />
      </div>

      {/* Daily Revenue Trends Line Chart (Recharts) */}
      <RevenueTrendChart
        data={stats?.dailyTrends ?? []}
        metadata={stats?.monthMetadata}
        totalRevenueNaira={stats ? Math.round(stats.revenue / 100) : 0}
        loading={loading}
      />

      <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] rounded-md p-6">
        <h2 className="font-display text-xl text-[#222] dark:text-white mb-4">Recent Reservations</h2>
        {loading ? (
          <p className="text-sm text-[#666]">Loading…</p>
        ) : !stats || stats.recent.length === 0 ? (
          <p className="text-sm text-[#666] dark:text-stone-400">No reservations yet. New bookings from the website will appear here in real time.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ece6dd] dark:border-[#2e2b26] text-left">
                  <th className="p-2 font-condensed uppercase tracking-wider text-xs text-[#666]">Ref</th>
                  <th className="p-2 font-condensed uppercase tracking-wider text-xs text-[#666]">Guest</th>
                  <th className="p-2 font-condensed uppercase tracking-wider text-xs text-[#666]">Room</th>
                  <th className="p-2 font-condensed uppercase tracking-wider text-xs text-[#666]">Dates</th>
                  <th className="p-2 font-condensed uppercase tracking-wider text-xs text-[#666]">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((r) => (
                  <tr key={r.id} className="border-b border-[#ece6dd]/60 dark:border-[#2e2b26]/60 last:border-0">
                    <td className="p-2 font-medium text-[#222] dark:text-white">{r.reference}</td>
                    <td className="p-2 text-[#444] dark:text-stone-300">{r.guestName}</td>
                    <td className="p-2 text-[#444] dark:text-stone-300">{r.roomTypeName}{r.assignedRoomNumber ? ` · Rm ${r.assignedRoomNumber}` : ""}</td>
                    <td className="p-2 text-[#444] dark:text-stone-300">{r.checkIn} → {r.checkOut}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded-full text-xs ${statusStyles[r.status] ?? "bg-stone-100"}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
