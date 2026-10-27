"use client";

import { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  X,
  Check,
  Clock,
  ArrowRight,
} from "lucide-react";

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "this_month"
  | "last_30_days"
  | "custom";

export interface DateRange {
  preset: DatePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

interface TransactionDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

// Helpers for formatted date strings (YYYY-MM-DD) in local time
function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TransactionDateRangePicker({
  value,
  onChange,
}: TransactionDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate || "");
  const [customEnd, setCustomEnd] = useState(value.endDate || "");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Synchronize internal inputs if value changes from outside
  useEffect(() => {
    setCustomStart(value.startDate || "");
    setCustomEnd(value.endDate || "");
  }, [value.startDate, value.endDate]);

  const selectPreset = (preset: DatePreset) => {
    const now = new Date();
    const todayStr = toISODate(now);

    if (preset === "all") {
      onChange({ preset: "all" });
      setIsOpen(false);
      return;
    }

    if (preset === "today") {
      onChange({ preset: "today", startDate: todayStr, endDate: todayStr });
      setIsOpen(false);
      return;
    }

    if (preset === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = toISODate(yesterday);
      onChange({ preset: "yesterday", startDate: yStr, endDate: yStr });
      setIsOpen(false);
      return;
    }

    if (preset === "this_week") {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startOfWeek.setDate(diff);
      onChange({
        preset: "this_week",
        startDate: toISODate(startOfWeek),
        endDate: todayStr,
      });
      setIsOpen(false);
      return;
    }

    if (preset === "last_7_days") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 6);
      onChange({
        preset: "last_7_days",
        startDate: toISODate(sevenDaysAgo),
        endDate: todayStr,
      });
      setIsOpen(false);
      return;
    }

    if (preset === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      onChange({
        preset: "this_month",
        startDate: toISODate(startOfMonth),
        endDate: todayStr,
      });
      setIsOpen(false);
      return;
    }

    if (preset === "last_30_days") {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 29);
      onChange({
        preset: "last_30_days",
        startDate: toISODate(thirtyDaysAgo),
        endDate: todayStr,
      });
      setIsOpen(false);
      return;
    }

    if (preset === "custom") {
      // Just keep modal open to allow picking dates
    }
  };

  const applyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart && !customEnd) {
      onChange({ preset: "all" });
    } else {
      onChange({
        preset: "custom",
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      });
    }
    setIsOpen(false);
  };

  const clearDateFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ preset: "all" });
    setCustomStart("");
    setCustomEnd("");
  };

  // Label calculation
  const getDisplayLabel = () => {
    switch (value.preset) {
      case "today":
        return `Today (${value.startDate})`;
      case "yesterday":
        return `Yesterday (${value.startDate})`;
      case "this_week":
        return `This Week (${value.startDate} – ${value.endDate})`;
      case "last_7_days":
        return `Last 7 Days (${value.startDate} – ${value.endDate})`;
      case "this_month":
        return `This Month (${value.startDate} – ${value.endDate})`;
      case "last_30_days":
        return `Last 30 Days (${value.startDate} – ${value.endDate})`;
      case "custom":
        if (value.startDate && value.endDate) {
          return `${value.startDate} → ${value.endDate}`;
        }
        if (value.startDate) return `From ${value.startDate}`;
        if (value.endDate) return `Until ${value.endDate}`;
        return "Custom Range";
      case "all":
      default:
        return "All Dates";
    }
  };

  const isFiltered = value.preset !== "all" && (value.startDate || value.endDate);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
          isFiltered
            ? "bg-[var(--accent)]/15 border-[var(--accent)]/50 text-[var(--accent)] font-bold"
            : "bg-white dark:bg-[#1a1815] border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
        }`}
      >
        <CalendarIcon className="h-3.5 w-3.5" />
        <span>{getDisplayLabel()}</span>

        {isFiltered ? (
          <span
            onClick={clearDateFilter}
            className="p-0.5 rounded-full hover:bg-[var(--accent)]/30 text-stone-500 hover:text-stone-900 dark:hover:text-white"
            title="Clear date filter"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3 w-3 opacity-60" />
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 z-50 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#1c1a17] border border-stone-200 dark:border-stone-800 shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
            <span className="font-semibold text-xs text-stone-900 dark:text-white flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Filter by Date Range</span>
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="text-[11px] text-stone-500 hover:text-red-500 transition-colors"
              >
                Reset to All Dates
              </button>
            )}
          </div>

          {/* Preset Buttons Grid */}
          <div>
            <span className="text-[10px] font-mono uppercase text-stone-400 block mb-2">
              Quick Ranges
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "this_week", label: "This Week" },
                { id: "last_7_days", label: "Last 7 Days" },
                { id: "this_month", label: "This Month" },
                { id: "last_30_days", label: "Last 30 Days" },
                { id: "all", label: "All Time" },
              ].map((p) => {
                const active = value.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPreset(p.id as DatePreset)}
                    className={`p-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                      active
                        ? "bg-[var(--accent)] text-stone-950 font-bold"
                        : "bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800"
                    }`}
                  >
                    <span>{p.label}</span>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Form */}
          <form
            onSubmit={applyCustomRange}
            className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3"
          >
            <span className="text-[10px] font-mono uppercase text-stone-400 block">
              Custom Range
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-stone-500 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-[10px] text-stone-500 block mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-gold px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
