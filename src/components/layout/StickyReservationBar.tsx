"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Calendar, Users, ArrowRight, ChevronDown, ChevronUp, X, Sparkles, BedDouble } from "lucide-react";
import { nightsBetween } from "@/lib/hotel";

interface StickyReservationBarProps {
  scrolled?: boolean;
}

export function StickyReservationBar({ scrolled = false }: StickyReservationBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Calculate default dates: check-in tomorrow, check-out day after tomorrow
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const guestButtonRef = useRef<HTMLButtonElement>(null);

  // Initialize dates on client mount to prevent hydration mismatch
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const pad = (n: number) => String(n).padStart(2, "0");
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setCheckIn(toYMD(tomorrow));
    setCheckOut(toYMD(dayAfter));
  }, []);

  // Close guest popover on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        guestButtonRef.current &&
        !guestButtonRef.current.contains(e.target as Node)
      ) {
        setGuestPopoverOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGuestPopoverOpen(false);
        setIsMobileExpanded(false);
      }
    };

    if (guestPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [guestPopoverOpen]);

  // Handle date formatting for UI display
  const formatDateDisplay = useCallback((dateStr: string) => {
    if (!dateStr) return "Select date";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);

  const handleCheckInChange = (newDate: string) => {
    setCheckIn(newDate);
    if (!checkOut || newDate >= checkOut) {
      const parts = newDate.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() + 1);
        const pad = (n: number) => String(n).padStart(2, "0");
        setCheckOut(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
    }
  };

  const handleCheckOutChange = (newDate: string) => {
    if (checkIn && newDate <= checkIn) {
      const parts = checkIn.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() + 1);
        const pad = (n: number) => String(n).padStart(2, "0");
        setCheckOut(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
    } else {
      setCheckOut(newDate);
    }
  };

  const nights = nightsBetween(checkIn, checkOut);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsMobileExpanded(false);
    const params = new URLSearchParams({
      checkIn: checkIn || "",
      checkOut: checkOut || "",
      adults: String(adults),
      children: String(children),
      rooms: String(rooms),
      autosearch: "true",
    });
    router.push(`/booking?${params.toString()}`);
  };

  // If user is already on booking page, hide widget to avoid competing layout
  if (pathname === "/booking" || pathname?.startsWith("/qr")) {
    return null;
  }

  const todayStr = (() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  })();

  const totalGuests = adults + children;

  return (
    <div
      className={`w-full transition-all duration-300 ease-in-out ${
        scrolled
          ? "bg-[#0b1b3d]/95 dark:bg-[#121215]/95 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
          : "bg-[#0b1b3d]/85 dark:bg-[#121215]/90"
      } backdrop-blur-md border-t border-white/10`}
    >
      <div className="container-x">
        {/* DESKTOP WIDGET (lg+) */}
        <div className="hidden lg:block">
          {isCollapsed ? (
            /* Minimized Bar */
            <div className="py-1.5 flex items-center justify-between text-xs text-stone-200">
              <button
                onClick={() => setIsCollapsed(false)}
                className="inline-flex items-center gap-2 text-stone-300 hover:text-white transition-colors group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span className="font-condensed uppercase tracking-wider text-[11px] font-medium">Quick Reservation:</span>
                <span className="text-white font-medium">{formatDateDisplay(checkIn)} &ndash; {formatDateDisplay(checkOut)}</span>
                <span className="text-stone-400">({nights} {nights === 1 ? "night" : "nights"}, {totalGuests} {totalGuests === 1 ? "guest" : "guests"})</span>
                <span className="text-[var(--accent-light)] group-hover:translate-y-[-1px] transition-transform ml-1">
                  <ChevronDown className="h-3.5 w-3.5 inline" /> Expand
                </span>
              </button>
              <button
                onClick={() => handleSubmit()}
                className="btn-gold py-1.5 px-4 text-[11px] font-condensed tracking-wider uppercase font-semibold inline-flex items-center gap-1.5"
              >
                <span>Check Rates</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            /* Expanded Full Luxury Booking Bar */
            <form onSubmit={handleSubmit} className="py-2.5 flex items-center justify-between gap-3">
              {/* Fields Container */}
              <div className="flex-1 flex items-center bg-black/30 dark:bg-black/40 rounded-xl border border-white/15 divide-x divide-white/10 backdrop-blur-sm">
                {/* 1. Check-In */}
                <div className="relative flex-1 px-4 py-2 hover:bg-white/5 transition-colors rounded-l-xl cursor-pointer group">
                  <label className="block text-[9px] font-condensed uppercase tracking-[0.18em] text-[var(--accent-light)] font-semibold mb-0.5">
                    Check-In
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-[13px] font-normal text-white group-hover:text-amber-200 transition-colors">
                      {formatDateDisplay(checkIn)}
                    </span>
                    <Calendar className="h-3.5 w-3.5 text-stone-400 group-hover:text-[var(--accent)] transition-colors shrink-0 ml-2" />
                  </div>
                  <input
                    type="date"
                    min={todayStr}
                    value={checkIn}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Select check-in date"
                  />
                </div>

                {/* 2. Check-Out */}
                <div className="relative flex-1 px-4 py-2 hover:bg-white/5 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[9px] font-condensed uppercase tracking-[0.18em] text-[var(--accent-light)] font-semibold">
                      Check-Out
                    </label>
                    {nights > 0 && (
                      <span className="text-[10px] text-stone-400 font-condensed">
                        {nights} {nights === 1 ? "night" : "nights"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-[13px] font-normal text-white group-hover:text-amber-200 transition-colors">
                      {formatDateDisplay(checkOut)}
                    </span>
                    <Calendar className="h-3.5 w-3.5 text-stone-400 group-hover:text-[var(--accent)] transition-colors shrink-0 ml-2" />
                  </div>
                  <input
                    type="date"
                    min={checkIn || todayStr}
                    value={checkOut}
                    onChange={(e) => handleCheckOutChange(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Select check-out date"
                  />
                </div>

                {/* 3. Guests & Rooms */}
                <div className="relative flex-1 px-4 py-2 hover:bg-white/5 transition-colors cursor-pointer group">
                  <label className="block text-[9px] font-condensed uppercase tracking-[0.18em] text-[var(--accent-light)] font-semibold mb-0.5">
                    Guests &amp; Rooms
                  </label>
                  <button
                    ref={guestButtonRef}
                    type="button"
                    onClick={() => setGuestPopoverOpen(!guestPopoverOpen)}
                    className="w-full flex items-center justify-between text-left"
                    aria-expanded={guestPopoverOpen}
                    aria-haspopup="true"
                  >
                    <span className="text-xs sm:text-[13px] font-normal text-white group-hover:text-amber-200 transition-colors truncate">
                      {totalGuests} {totalGuests === 1 ? "Guest" : "Guests"} &middot; {rooms} {rooms === 1 ? "Room" : "Rooms"}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-stone-400 group-hover:text-[var(--accent)] transition-transform duration-200 shrink-0 ml-2 ${
                        guestPopoverOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Guest Selection Popover */}
                  {guestPopoverOpen && (
                    <div
                      ref={popoverRef}
                      className="absolute top-full right-0 mt-3 w-72 p-5 bg-[#1b1b22] border border-white/20 rounded-2xl shadow-2xl text-white z-50 animate-in fade-in zoom-in-95 duration-150"
                      role="dialog"
                      aria-label="Guest and room selection"
                    >
                      <div className="space-y-4">
                        {/* Adults */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white">Adults</div>
                            <div className="text-[10px] text-stone-400">Ages 13 and above</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setAdults(Math.max(1, adults - 1))}
                              disabled={adults <= 1}
                              className="h-7 w-7 rounded-full border border-white/20 hover:border-white/40 flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-semibold tabular-nums">{adults}</span>
                            <button
                              type="button"
                              onClick={() => setAdults(Math.min(10, adults + 1))}
                              disabled={adults >= 10}
                              className="h-7 w-7 rounded-full border border-white/20 hover:border-white/40 flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Children */}
                        <div className="flex items-center justify-between border-t border-white/10 pt-3">
                          <div>
                            <div className="text-xs font-semibold text-white">Children</div>
                            <div className="text-[10px] text-stone-400">Ages 0 to 12</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setChildren(Math.max(0, children - 1))}
                              disabled={children <= 0}
                              className="h-7 w-7 rounded-full border border-white/20 hover:border-white/40 flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-semibold tabular-nums">{children}</span>
                            <button
                              type="button"
                              onClick={() => setChildren(Math.min(6, children + 1))}
                              disabled={children >= 6}
                              className="h-7 w-7 rounded-full border border-white/20 hover:border-white/40 flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Rooms */}
                        <div className="flex items-center justify-between border-t border-white/10 pt-3">
                          <div>
                            <div className="text-xs font-semibold text-white">Rooms</div>
                            <div className="text-[10px] text-stone-400">Total accommodations</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setRooms(Math.max(1, rooms - 1))}
                              disabled={rooms <= 1}
                              className="h-7 w-7 rounded-full border border-white/20 hover:border-white/40 flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-semibold tabular-nums">{rooms}</span>
                            <button
                              type="button"
                              onClick={() => setRooms(Math.min(8, rooms + 1))}
                              disabled={rooms >= 8}
                              className="h-7 w-7 rounded-full border border-white/20 hover:border-white/40 flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setGuestPopoverOpen(false)}
                            className="w-full btn-gold py-2 text-xs font-condensed tracking-wider uppercase font-semibold text-center"
                          >
                            Apply Guests
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  className="btn-gold h-[42px] px-6 text-xs font-condensed tracking-wider uppercase font-semibold inline-flex items-center gap-2 shadow-lg active:scale-95"
                >
                  <span>Check Availability</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="h-[42px] w-8 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                  aria-label="Collapse reservation bar"
                  title="Collapse reservation bar"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* MOBILE & TABLET COMPACT BAR (< lg) */}
        <div className="lg:hidden py-1.5">
          {!isMobileExpanded ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsMobileExpanded(true)}
                className="flex-1 text-left bg-black/30 dark:bg-black/50 border border-white/15 px-3 py-1.5 rounded-lg flex items-center justify-between text-xs text-stone-200 active:scale-[0.99] transition-transform"
                aria-label="Open date and guest selection"
              >
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                  <span className="truncate font-medium text-white text-[11px]">
                    {formatDateDisplay(checkIn)} &ndash; {formatDateDisplay(checkOut)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-400 text-[10px] shrink-0 font-condensed uppercase tracking-wider ml-1">
                  <span>{totalGuests} {totalGuests === 1 ? "Guest" : "Guests"}</span>
                  <ChevronDown className="h-3 w-3 text-stone-400" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                className="btn-gold py-1.5 px-3.5 text-[11px] font-condensed tracking-wider uppercase font-semibold shrink-0 inline-flex items-center gap-1 shadow-sm"
              >
                <span>Book</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            /* Mobile Expanded Drawer/Card */
            <div className="py-2.5 space-y-3 bg-[#17171e] p-4 rounded-xl border border-white/15 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-condensed uppercase tracking-wider text-xs font-semibold text-[var(--accent-light)]">
                  Reservation Details
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileExpanded(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-white"
                  aria-label="Close reservation panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Check In Mobile */}
                <div className="relative p-2.5 bg-black/40 rounded-lg border border-white/10">
                  <label className="block text-[9px] font-condensed uppercase tracking-wider text-[var(--accent-light)] font-semibold mb-0.5">
                    Check-In
                  </label>
                  <div className="text-xs font-medium text-white truncate">
                    {formatDateDisplay(checkIn)}
                  </div>
                  <input
                    type="date"
                    min={todayStr}
                    value={checkIn}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Check Out Mobile */}
                <div className="relative p-2.5 bg-black/40 rounded-lg border border-white/10">
                  <label className="block text-[9px] font-condensed uppercase tracking-wider text-[var(--accent-light)] font-semibold mb-0.5">
                    Check-Out
                  </label>
                  <div className="text-xs font-medium text-white truncate">
                    {formatDateDisplay(checkOut)}
                  </div>
                  <input
                    type="date"
                    min={checkIn || todayStr}
                    value={checkOut}
                    onChange={(e) => handleCheckOutChange(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Guest Controls Mobile */}
              <div className="bg-black/40 p-3 rounded-lg border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Adults</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="h-6 w-6 rounded-full border border-white/20 flex items-center justify-center text-xs disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-semibold tabular-nums">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(Math.min(10, adults + 1))}
                      disabled={adults >= 10}
                      className="h-6 w-6 rounded-full border border-white/20 flex items-center justify-center text-xs disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-stone-300">Children</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                      className="h-6 w-6 rounded-full border border-white/20 flex items-center justify-center text-xs disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-semibold tabular-nums">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren(Math.min(6, children + 1))}
                      disabled={children >= 6}
                      className="h-6 w-6 rounded-full border border-white/20 flex items-center justify-center text-xs disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-stone-300">Rooms</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRooms(Math.max(1, rooms - 1))}
                      disabled={rooms <= 1}
                      className="h-6 w-6 rounded-full border border-white/20 flex items-center justify-center text-xs disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-semibold tabular-nums">{rooms}</span>
                    <button
                      type="button"
                      onClick={() => setRooms(Math.min(8, rooms + 1))}
                      disabled={rooms >= 8}
                      className="h-6 w-6 rounded-full border border-white/20 flex items-center justify-center text-xs disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsMobileExpanded(false)}
                  className="flex-1 py-2 text-xs font-condensed uppercase tracking-wider text-stone-300 hover:text-white border border-white/20 rounded-lg text-center"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="flex-1 btn-gold py-2 text-xs font-condensed uppercase tracking-wider font-semibold text-center inline-flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span>Search Rooms</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
