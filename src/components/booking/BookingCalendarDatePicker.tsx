"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Ban,
  Check,
  Flame,
} from "lucide-react";
import type { DayInventory, CalendarAvailabilityResult } from "@/lib/booking/types";

interface BookingCalendarDatePickerProps {
  checkIn: string;
  checkOut: string;
  onSelectDates: (checkIn: string, checkOut: string) => void;
  adults: number;
  childrenCount: number;
  roomCount: number;
  minNights?: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DOW_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatShortRate(kobo?: number): string {
  if (!kobo) return "";
  const naira = Math.round(kobo / 100);
  if (naira >= 1000000) {
    return `₦${(naira / 1000000).toFixed(1)}m`;
  }
  if (naira >= 1000) {
    return `₦${Math.round(naira / 1000)}k`;
  }
  return `₦${naira}`;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nightsCount(inDate: string, outDate: string): number {
  if (!inDate || !outDate || outDate <= inDate) return 0;
  const d1 = new Date(inDate + "T12:00:00Z").getTime();
  const d2 = new Date(outDate + "T12:00:00Z").getTime();
  return Math.round((d2 - d1) / 86400000);
}

/* "2026-11-15" → "Sat, 15 Nov" for the stay summary cards */
function formatDayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function BookingCalendarDatePicker({
  checkIn,
  checkOut,
  onSelectDates,
  adults,
  childrenCount,
  roomCount,
  minNights = 1,
}: BookingCalendarDatePickerProps) {
  // Get today's hotel date (UTC+1 Lagos)
  const today = useMemo(() => {
    const lagos = new Date(Date.now() + 60 * 60 * 1000);
    return lagos.toISOString().slice(0, 10);
  }, []);

  // Determine initial viewed month based on checkIn or today
  const initialDate = useMemo(() => {
    if (checkIn && checkIn >= today) {
      const parts = checkIn.split("-");
      return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1 };
    }
    const parts = today.split("-");
    return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1 };
  }, [checkIn, today]);

  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month); // 0-indexed
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Real-time inventory cache & state
  const [inventoryDays, setInventoryDays] = useState<Record<string, DayInventory>>({});
  const [loading, setLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);

  // Compute date range to query (viewed month and next 3 months)
  const queryRange = useMemo(() => {
    const start = new Date(Date.UTC(viewYear, viewMonth, 1));
    const end = new Date(Date.UTC(viewYear, viewMonth + 3, 0));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [viewYear, viewMonth]);

  // Fetch real-time inventory from server
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        startDate: queryRange.startDate,
        endDate: queryRange.endDate,
        adults: String(adults),
        children: String(childrenCount),
        roomCount: String(roomCount),
      });

      const res = await fetch(`/api/booking/calendar?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch inventory (${res.status})`);
      }
      const json = await res.json();
      if (json.ok && json.data?.days) {
        setInventoryDays((prev) => ({ ...prev, ...json.data.days }));
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } else {
        throw new Error(json.message || "Failed to load calendar availability");
      }
    } catch (err: any) {
      console.warn("Calendar inventory sync error:", err);
      setFetchError(err.message || "Unable to sync real-time inventory");
    } finally {
      setLoading(false);
    }
  }, [queryRange.startDate, queryRange.endDate, adults, childrenCount, roomCount]);

  // Trigger fetch when viewed range or guest count changes
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  // Helper to check if going back beyond current month is disallowed
  const isPrevDisabled = useMemo(() => {
    const todayParts = today.split("-");
    const tYear = parseInt(todayParts[0], 10);
    const tMonth = parseInt(todayParts[1], 10) - 1;
    return viewYear < tYear || (viewYear === tYear && viewMonth <= tMonth);
  }, [today, viewYear, viewMonth]);

  // First sold-out date after check-in (to prevent spanning stays over fully sold-out dates)
  const firstSoldOutAfterCheckIn = useMemo(() => {
    if (!checkIn) return null;
    let curr = checkIn;
    for (let i = 0; i < 60; i++) {
      const inv = inventoryDays[curr];
      if (inv && (inv.status === "sold_out" || !inv.hasEligibleRoom || inv.availableRooms < roomCount)) {
        return curr;
      }
      curr = addDaysISO(curr, 1);
    }
    return null;
  }, [checkIn, inventoryDays, roomCount]);

  // Date selection logic
  const handleDateClick = (dateStr: string) => {
    setSelectionWarning(null);

    // If date is in the past, ignore
    if (dateStr < today) return;

    const inv = inventoryDays[dateStr];
    const isSoldOut = inv && (inv.status === "sold_out" || !inv.hasEligibleRoom || inv.availableRooms < roomCount);

    // State 1: We don't have a check-in yet, OR we already have both checkIn & checkOut
    // (start fresh selection with this date as check-in)
    if (!checkIn || (checkIn && checkOut)) {
      if (isSoldOut) {
        setSelectionWarning(`${dateStr} is sold out and cannot be selected as check-in.`);
        return;
      }
      onSelectDates(dateStr, "");
      return;
    }

    // State 2: Check-in is selected, picking check-out
    if (checkIn && !checkOut) {
      if (dateStr === checkIn) {
        // Clicking checkIn again clears checkIn
        onSelectDates("", "");
        return;
      }

      if (dateStr < checkIn) {
        // Clicked date is earlier than check-in -> switch check-in to this date if not sold out
        if (isSoldOut) {
          setSelectionWarning(`${dateStr} is sold out and cannot be selected as check-in.`);
          return;
        }
        onSelectDates(dateStr, "");
        return;
      }

      // Candidate checkOut is > checkIn:
      // Verify every night between checkIn and candidate checkOut is bookable!
      let hasSoldOutNight = false;
      let soldOutNightStr = "";
      let iter = checkIn;
      while (iter < dateStr) {
        const iterInv = inventoryDays[iter];
        if (iterInv && (iterInv.status === "sold_out" || !iterInv.hasEligibleRoom || iterInv.availableRooms < roomCount)) {
          hasSoldOutNight = true;
          soldOutNightStr = iter;
          break;
        }
        iter = addDaysISO(iter, 1);
      }

      if (hasSoldOutNight) {
        setSelectionWarning(
          `Stay cannot span across ${soldOutNightStr} because rooms are completely booked for that night. Please select an earlier departure or different dates.`
        );
        return;
      }

      // Check min nights
      const nights = nightsCount(checkIn, dateStr);
      if (nights < minNights) {
        setSelectionWarning(`A minimum stay of ${minNights} night${minNights > 1 ? "s" : ""} is required.`);
        return;
      }

      onSelectDates(checkIn, dateStr);
    }
  };

  // Quick preset shortcuts
  const applyPreset = (daysInAdvance: number, nights: number) => {
    setSelectionWarning(null);
    const start = addDaysISO(today, daysInAdvance);
    const end = addDaysISO(start, nights);

    // Validate that no night in the preset is sold out
    let curr = start;
    while (curr < end) {
      const inv = inventoryDays[curr];
      if (inv && (inv.status === "sold_out" || !inv.hasEligibleRoom || inv.availableRooms < roomCount)) {
        setSelectionWarning(`The preset dates include sold-out night ${curr}. Please choose available dates.`);
        return;
      }
      curr = addDaysISO(curr, 1);
    }

    onSelectDates(start, end);
    const parts = start.split("-");
    setViewYear(parseInt(parts[0], 10));
    setViewMonth(parseInt(parts[1], 10) - 1);
  };

  // Preset: Next Friday to Sunday
  const applyWeekendPreset = () => {
    const todayObj = new Date(today + "T12:00:00Z");
    const dayOfWeek = todayObj.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    if (daysUntilFriday === 0 && dayOfWeek === 5) {
      // It's Friday today, use next Friday
      daysUntilFriday = 7;
    }
    applyPreset(daysUntilFriday, 2);
  };

  // Helper to generate the days grid for a given year & month
  const renderMonthGrid = (year: number, month: number) => {
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const firstDayOfWeek = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sun ... 6 = Sat

    const cells: React.ReactNode[] = [];

    // Empty blank cells for leading days
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<div key={`blank-${i}`} className="h-14 sm:h-16 pointer-events-none" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isPast = dateStr < today;
      const isToday = dateStr === today;
      const inv = inventoryDays[dateStr];

      const isCheckIn = dateStr === checkIn;
      const isCheckOut = dateStr === checkOut;
      const isInRange = Boolean(checkIn && checkOut && dateStr > checkIn && dateStr < checkOut);

      const isHoveredRange = Boolean(
        checkIn &&
          !checkOut &&
          hoveredDate &&
          hoveredDate > checkIn &&
          dateStr > checkIn &&
          dateStr <= hoveredDate &&
          (!firstSoldOutAfterCheckIn || dateStr <= firstSoldOutAfterCheckIn)
      );

      const isSoldOut = Boolean(inv && (inv.status === "sold_out" || !inv.hasEligibleRoom || inv.availableRooms < roomCount));
      const isLimited = Boolean(inv && inv.status === "limited" && !isSoldOut);

      // When selecting check-out: is this date beyond the first sold-out night?
      const isBlockedBySoldOutNight = Boolean(
        checkIn &&
          !checkOut &&
          firstSoldOutAfterCheckIn &&
          dateStr > firstSoldOutAfterCheckIn
      );

      const isDisabled = Boolean(isPast || (isSoldOut && !checkIn) || isBlockedBySoldOutNight);

      // Background and border styling — clean, borderless cells with pill selection
      let containerClasses = "relative h-14 sm:h-16 flex flex-col items-center justify-between p-1.5 transition-all duration-150 text-xs select-none rounded-xl border border-transparent ";

      if (isCheckIn || isCheckOut) {
        containerClasses += "bg-[var(--accent)] text-white border-transparent shadow-[0_8px_18px_-8px_var(--accent)] z-10 font-bold scale-[1.03] ";
      } else if (isInRange) {
        containerClasses += "bg-[var(--accent)]/15 dark:bg-[var(--accent)]/25 text-stone-800 dark:text-stone-100 rounded-none ";
      } else if (isHoveredRange) {
        containerClasses += "bg-[var(--accent)]/10 dark:bg-[var(--accent)]/20 text-stone-700 dark:text-stone-200 rounded-none ";
      } else if (isPast) {
        containerClasses += "bg-transparent text-stone-300 dark:text-stone-600 cursor-not-allowed ";
      } else if (isSoldOut) {
        containerClasses += "bg-rose-50/70 dark:bg-rose-950/25 text-stone-400 dark:text-stone-500 cursor-not-allowed ";
      } else if (isLimited) {
        containerClasses += "bg-amber-50 dark:bg-amber-950/30 text-stone-800 dark:text-stone-200 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:shadow-sm cursor-pointer ";
      } else {
        containerClasses += "bg-stone-50/70 dark:bg-stone-900/50 text-stone-800 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-800 hover:shadow-[0_6px_16px_-8px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 cursor-pointer ";
      }

      cells.push(
        <button
          key={dateStr}
          type="button"
          disabled={isDisabled}
          onClick={() => handleDateClick(dateStr)}
          onMouseEnter={() => !isDisabled && setHoveredDate(dateStr)}
          onMouseLeave={() => setHoveredDate(null)}
          title={
            isPast
              ? "Past date"
              : isSoldOut
              ? `Unavailable — No rooms available for ${roomCount} room(s)`
              : isLimited
              ? `Limited availability: Only ${inv?.availableRooms} room(s) left!`
              : `Available: ${inv?.availableRooms ?? "Multiple"} rooms from ${formatShortRate(inv?.minRate)}/night`
          }
          aria-label={`${dateStr}: ${
            isCheckIn
              ? "Selected Check-in"
              : isCheckOut
              ? "Selected Check-out"
              : isSoldOut
              ? "Unavailable / Sold out"
              : isLimited
              ? `Limited availability, ${inv?.availableRooms} left`
              : "Available"
          }`}
          className={containerClasses}
        >
          {/* Top row: day number and status badge */}
          <div className="w-full flex items-center justify-between">
            <span
              className={`text-[13px] font-semibold tabular-nums ${
                isCheckIn || isCheckOut
                  ? "text-white"
                  : isPast
                  ? "text-stone-300 dark:text-stone-600"
                  : "text-stone-900 dark:text-stone-100"
              }`}
            >
              {day}
            </span>

            {isToday && !isCheckIn && !isCheckOut && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" title="Today" />
            )}

            {isCheckIn && (
              <span className="text-[9px] uppercase tracking-wider font-bold bg-white/25 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-white">
                In
              </span>
            )}
            {isCheckOut && (
              <span className="text-[9px] uppercase tracking-wider font-bold bg-white/25 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-white">
                Out
              </span>
            )}
          </div>

          {/* Bottom row: Real-time inventory pill or rate indicator */}
          <div className="w-full text-center mt-auto">
            {isCheckIn || isCheckOut ? (
              <span className="text-[10px] text-white/90 font-medium">
                {isCheckIn ? "Arrival" : "Departure"}
              </span>
            ) : isPast ? (
              <span className="text-[9px] text-stone-300 dark:text-stone-600">—</span>
            ) : isSoldOut ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-600 dark:text-rose-400 font-medium leading-none">
                <Ban className="h-2.5 w-2.5 inline" />
                <span>Sold out</span>
              </span>
            ) : isLimited ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 dark:text-amber-300 font-medium leading-none">
                <Flame className="h-2.5 w-2.5 inline text-amber-500" />
                <span>{inv?.availableRooms} left</span>
              </span>
            ) : inv?.minRate ? (
              <span className="text-[9.5px] text-stone-500 dark:text-stone-400 font-mono font-medium">
                {formatShortRate(inv.minRate)}
              </span>
            ) : (
              <span className="inline-block h-1 w-1 rounded-full bg-emerald-500/70" />
            )}
          </div>
        </button>
      );
    }

    return cells;
  };

  // Next month parameters for desktop side-by-side view
  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;

  const totalNights = nightsCount(checkIn, checkOut);

  return (
    <div className="space-y-4" id="booking-calendar-root">
      {/* Real-time Header & Live Sync Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-stone-50/80 dark:bg-stone-900/50 border border-[#ece6dd] dark:border-stone-800">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Real-Time Inventory</span>
          </div>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span className="text-stone-500 dark:text-stone-400 hidden sm:inline">
            Updated live from front-desk &amp; room engine
          </span>
          {lastSyncTime && (
            <span className="text-[11px] text-stone-400 dark:text-stone-500 hidden md:inline">
              ({lastSyncTime})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchInventory()}
            disabled={loading}
            className="text-xs font-condensed uppercase tracking-wider text-stone-600 dark:text-stone-300 hover:text-[var(--accent)] inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#ece6dd] dark:border-stone-700 bg-white dark:bg-stone-800 transition-colors disabled:opacity-50"
            title="Refresh real-time inventory"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
            <span>{loading ? "Checking…" : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* Warning/Error Banner */}
      {(selectionWarning || fetchError) && (
        <div
          role="alert"
          className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300 transition-all"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">{selectionWarning || fetchError}</div>
          <button
            type="button"
            onClick={() => {
              setSelectionWarning(null);
              setFetchError(null);
            }}
            className="text-rose-600 hover:text-rose-800 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Quick Date Presets */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-condensed uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1 mr-1">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" /> Quick Stays:
        </span>
        <button
          type="button"
          onClick={() => applyPreset(0, 1)}
          className="text-xs px-3 py-1 rounded-full border border-stone-200 dark:border-stone-700 hover:border-[var(--accent)] hover:text-[var(--accent)] text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800/70 transition-colors"
        >
          Tonight (1 nt)
        </button>
        <button
          type="button"
          onClick={() => applyPreset(1, 1)}
          className="text-xs px-3 py-1 rounded-full border border-stone-200 dark:border-stone-700 hover:border-[var(--accent)] hover:text-[var(--accent)] text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800/70 transition-colors"
        >
          Tomorrow (1 nt)
        </button>
        <button
          type="button"
          onClick={applyWeekendPreset}
          className="text-xs px-3 py-1 rounded-full border border-stone-200 dark:border-stone-700 hover:border-[var(--accent)] hover:text-[var(--accent)] text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800/70 transition-colors"
        >
          Weekend Getaway (2 nts)
        </button>
        {(checkIn || checkOut) && (
          <button
            type="button"
            onClick={() => {
              onSelectDates("", "");
              setSelectionWarning(null);
            }}
            className="text-xs px-3 py-1 rounded-full text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto"
          >
            Clear Dates
          </button>
        )}
      </div>

      {/* Month Navigation Header */}
      <div className="flex items-center justify-between border-b border-[#ece6dd]/80 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
            <CalendarIcon className="h-4 w-4 text-[var(--accent)]" />
          </span>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-900 dark:text-white font-condensed">
            Select Travel Dates
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            className="h-9 w-9 rounded-full border border-[#ece6dd] dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="h-9 w-9 rounded-full border border-[#ece6dd] dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-all flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Dual Month Calendar View (1 month on mobile, 2 months on tablet/desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Month 1 */}
        <div className="space-y-3">
          <div className="text-center">
            <h5 className="font-display text-lg font-medium tracking-tight text-stone-900 dark:text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h5>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DOW_HEADERS.map((h, i) => (
              <span
                key={h}
                className={`text-[11px] font-condensed uppercase tracking-wider font-semibold py-1 ${
                  i === 0 || i === 6 ? "text-amber-700/80 dark:text-amber-400/80" : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {h}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderMonthGrid(viewYear, viewMonth)}
          </div>
        </div>

        {/* Month 2 (Desktop / Tablet view) */}
        <div className="space-y-3 hidden md:block">
          <div className="text-center">
            <h5 className="font-display text-lg font-medium tracking-tight text-stone-900 dark:text-white">
              {MONTH_NAMES[nextMonth]} {nextMonthYear}
            </h5>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DOW_HEADERS.map((h, i) => (
              <span
                key={h}
                className={`text-[11px] font-condensed uppercase tracking-wider font-semibold py-1 ${
                  i === 0 || i === 6 ? "text-amber-700/80 dark:text-amber-400/80" : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {h}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderMonthGrid(nextMonthYear, nextMonth)}
          </div>
        </div>
      </div>

      {/* Stay Summary Bar & Interactive Status */}
      <div className="p-4 rounded-2xl border border-[#ece6dd] dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Check-in card */}
          <div className="px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 min-w-[7.5rem]">
            <span className="text-[10px] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500 block font-condensed font-semibold">
              Check-in
            </span>
            <span className={`text-sm font-semibold block mt-0.5 ${checkIn ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-stone-500 font-normal"}`}>
              {checkIn ? formatDayLabel(checkIn) : "Add date"}
            </span>
          </div>

          {/* Nights pill */}
          <div className="flex flex-col items-center gap-1">
            <span className="h-px w-6 sm:w-10 bg-stone-200 dark:bg-stone-700" />
            <span
              className={`text-[10px] uppercase font-condensed tracking-wider font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                totalNights > 0
                  ? "bg-[var(--accent)] text-white shadow-[0_6px_14px_-8px_var(--accent)]"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-400"
              }`}
            >
              {totalNights > 0 ? `${totalNights} nt${totalNights > 1 ? "s" : ""}` : "—"}
            </span>
            <span className="h-px w-6 sm:w-10 bg-stone-200 dark:bg-stone-700" />
          </div>

          {/* Check-out card */}
          <div className="px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 min-w-[7.5rem]">
            <span className="text-[10px] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500 block font-condensed font-semibold">
              Check-out
            </span>
            <span className={`text-sm font-semibold block mt-0.5 ${checkOut ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-stone-500 font-normal"}`}>
              {checkOut ? formatDayLabel(checkOut) : "Add date"}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Limited (&le;2 left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Sold Out</span>
          </div>
        </div>
      </div>
    </div>
  );
}
