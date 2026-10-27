"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, Calendar, ArrowUpRight, BarChart2 } from "lucide-react";
import { naira } from "@/lib/hotel";

export interface DailyTrendItem {
  date: string;
  dayLabel: string;
  dayNum: number;
  revenue: number; // in Naira
  bookings: number;
  isToday: boolean;
  isPastOrToday: boolean;
}

export interface MonthMetadata {
  monthName: string;
  monthShort: string;
  year: number;
  currentDay: number;
  daysInMonth: number;
  peakRevenue: number;
  peakDay: string;
  totalPaidBookings: number;
  averageDailyRevenue: number;
}

interface RevenueTrendChartProps {
  data: DailyTrendItem[];
  metadata?: MonthMetadata;
  totalRevenueNaira: number;
  loading?: boolean;
}

// Custom Tooltip component for Recharts
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const item: DailyTrendItem = payload[0].payload;

  return (
    <div className="bg-stone-900/95 text-white border border-stone-700/80 px-3.5 py-2.5 rounded-lg shadow-xl text-xs backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 mb-1 border-b border-stone-800 pb-1.5">
        <span className="font-semibold text-stone-200 flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-[#ffbf00]" />
          {item.dayLabel}, {item.date.slice(0, 4)}
        </span>
        {item.isToday && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#ffbf00] text-black font-semibold uppercase tracking-wider">
            Today
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-stone-400">Revenue:</span>
          <span className="font-mono font-bold text-[#f4efe6] text-sm">
            {naira(item.revenue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-stone-400">Paid Bookings:</span>
          <span className="font-mono font-medium text-stone-300">
            {item.bookings} {item.bookings === 1 ? "booking" : "bookings"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RevenueTrendChart({
  data,
  metadata,
  totalRevenueNaira,
  loading = false,
}: RevenueTrendChartProps) {
  const [mounted, setMounted] = useState(false);
  const [viewScope, setViewScope] = useState<"month_to_date" | "full_month">(
    "full_month"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayedData =
    viewScope === "month_to_date"
      ? data.filter((d) => d.isPastOrToday)
      : data;

  const currentMonthTitle = metadata
    ? `${metadata.monthName} ${metadata.year}`
    : "Current Month";

  // Format currency for Y-Axis
  const formatYAxis = (val: number) => {
    if (val === 0) return "₦0";
    if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `₦${(val / 1_000).toFixed(0)}k`;
    return `₦${val}`;
  };

  return (
    <div className="bg-white dark:bg-[#202023] border border-[#ece6dd] dark:border-[#3a3a42] rounded-md p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl text-[#222] dark:text-white font-semibold">
              Daily Revenue Trends
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#ffbf00]/10 text-[#ffbf00] border border-[#ffbf00]/20">
              {currentMonthTitle}
            </span>
          </div>
          <p className="text-xs text-[#666] dark:text-stone-400 mt-1">
            Recharts visualization of daily room bookings and verified guest transactions.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setViewScope("full_month")}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewScope === "full_month"
                ? "bg-white dark:bg-[#28282d] text-[#222] dark:text-white shadow-sm font-semibold"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
            }`}
          >
            Full Month (1–{metadata?.daysInMonth ?? 30})
          </button>
          <button
            onClick={() => setViewScope("month_to_date")}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewScope === "month_to_date"
                ? "bg-white dark:bg-[#28282d] text-[#222] dark:text-white shadow-sm font-semibold"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
            }`}
          >
            Month to Date (Day 1–{metadata?.currentDay ?? 1})
          </button>
        </div>
      </div>

      {/* Metric summary banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#ece6dd] dark:border-[#3a3a42] text-xs">
        <div className="p-3 bg-stone-50 dark:bg-[#28282d] rounded-lg border border-[#ece6dd] dark:border-[#3a3a42]">
          <span className="text-stone-500 dark:text-stone-400 block mb-0.5 font-medium">
            Month-to-Date Revenue
          </span>
          <span className="font-display text-base sm:text-lg font-bold text-[#ffbf00]">
            {naira(totalRevenueNaira)}
          </span>
        </div>

        <div className="p-3 bg-stone-50 dark:bg-stone-900/40 rounded-lg border border-[#ece6dd] dark:border-[#2e2b26]">
          <span className="text-stone-500 dark:text-stone-400 block mb-0.5 font-medium">
            Daily Average
          </span>
          <span className="font-display text-base sm:text-lg font-bold text-[#222] dark:text-white">
            {naira(metadata?.averageDailyRevenue ?? 0)}
          </span>
        </div>

        <div className="p-3 bg-stone-50 dark:bg-stone-900/40 rounded-lg border border-[#ece6dd] dark:border-[#2e2b26]">
          <span className="text-stone-500 dark:text-stone-400 block mb-0.5 font-medium">
            Peak Day ({metadata?.peakDay || "—"})
          </span>
          <span className="font-display text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {naira(metadata?.peakRevenue ?? 0)}
          </span>
        </div>

        <div className="p-3 bg-stone-50 dark:bg-stone-900/40 rounded-lg border border-[#ece6dd] dark:border-[#2e2b26]">
          <span className="text-stone-500 dark:text-stone-400 block mb-0.5 font-medium">
            Confirmed Bookings
          </span>
          <span className="font-display text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
            {metadata?.totalPaidBookings ?? 0}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80 pt-2">
        {!mounted || loading ? (
          <div className="h-full w-full flex items-center justify-center bg-stone-50/50 dark:bg-stone-900/20 rounded-lg text-stone-400 text-xs">
            <BarChart2 className="h-5 w-5 animate-pulse mr-2 text-[#ffbf00]" />
            Rendering revenue trend visualization…
          </div>
        ) : displayedData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center bg-stone-50/50 dark:bg-stone-900/20 rounded-lg text-stone-400 text-xs">
            No daily data available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={displayedData}
              margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="goldRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffbf00" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ffbf00" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#88888825"
              />
              <XAxis
                dataKey="dayNum"
                tickLine={false}
                axisLine={{ stroke: "#88888840" }}
                tick={{ fontSize: 11, fill: "#888888" }}
                tickFormatter={(d) => `${metadata?.monthShort ?? "Day"} ${d}`}
                interval={displayedData.length > 20 ? 2 : 1}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#888888" }}
                tickFormatter={formatYAxis}
                width={65}
              />
              <Tooltip content={<CustomTooltip />} />
              {metadata?.currentDay && (
                <ReferenceLine
                  x={metadata.currentDay}
                  stroke="#ffbf00"
                  strokeDasharray="3 3"
                  label={{
                    value: "Today",
                    position: "insideTopLeft",
                    fill: "#ffbf00",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ffbf00"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#goldRevenueGrad)"
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.revenue > 0 || payload.isToday) {
                    return (
                      <circle
                        key={`dot-${payload.dayNum}`}
                        cx={cx}
                        cy={cy}
                        r={payload.isToday ? 5 : 3.5}
                        fill={payload.isToday ? "#ffbf00" : "#ffffff"}
                        stroke="#ffbf00"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <g key={`dot-${payload.dayNum}`} />;
                }}
                activeDot={{
                  r: 6,
                  fill: "#ffbf00",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
