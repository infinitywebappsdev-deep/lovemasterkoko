"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Minus, Plus, Search, Users } from "lucide-react";

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function humanDate(iso: string) {
  if (!iso) return "Add date";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "Add date";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
  /** "hero" sits on top of imagery, "panel" sits on paper. */
  variant?: "hero" | "panel";
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultAdults?: number;
  defaultChildren?: number;
  defaultRooms?: number;
  className?: string;
};

/**
 * The single availability entry point for the whole site: home hero, rooms
 * listing and room detail all hand off to /booking with the same query
 * contract the checkout already understands (checkIn, checkOut, adults,
 * children, rooms, autosearch).
 */
export function BookingSearchBar({
  variant = "panel",
  defaultCheckIn = "",
  defaultCheckOut = "",
  defaultAdults = 2,
  defaultChildren = 0,
  defaultRooms = 1,
  className = "",
}: Props) {
  const router = useRouter();
  const today = useMemo(todayISO, []);
  const [checkIn, setCheckIn] = useState(defaultCheckIn || today);
  const [checkOut, setCheckOut] = useState(
    defaultCheckOut || addDaysISO(defaultCheckIn || today, 2),
  );
  const [adults, setAdults] = useState(Math.max(1, defaultAdults));
  const [children, setChildren] = useState(Math.max(0, defaultChildren));
  const [rooms, setRooms] = useState(Math.max(1, defaultRooms));
  const [guestsOpen, setGuestsOpen] = useState(false);

  const nights = useMemo(() => {
    const a = new Date(`${checkIn}T12:00:00`).getTime();
    const b = new Date(`${checkOut}T12:00:00`).getTime();
    const n = Math.round((b - a) / 86_400_000);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [checkIn, checkOut]);

  const submit = () => {
    const params = new URLSearchParams({
      checkIn,
      checkOut: nights > 0 ? checkOut : addDaysISO(checkIn, 1),
      adults: String(adults),
      children: String(children),
      rooms: String(rooms),
      autosearch: "true",
    });
    router.push(`/booking?${params.toString()}`);
  };

  const onHero = variant === "hero";

  const labelCls = onHero ? "text-white/55" : "text-[var(--text-muted)]";
  const valueCls = onHero ? "text-white" : "text-[var(--text-primary)]";
  const shellCls = onHero
    ? "border-white/25 bg-black/35 backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]"
    : "border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lift)]";
  const dividerCls = onHero ? "border-white/15" : "border-[var(--border)]";

  return (
    <div className={className}>
      <div className={`rounded-2xl border p-2 sm:rounded-full ${shellCls}`}>
        <div className="flex flex-col sm:flex-row sm:items-center">
          {/* Check-in */}
          <label className={`group relative flex-1 cursor-pointer rounded-xl px-4 py-2.5 sm:px-6 ${onHero ? "hover:bg-white/5" : "hover:bg-[var(--surface-alt)]"}`}>
            <span className={`block text-[0.6rem] font-medium uppercase tracking-[0.22em] ${labelCls}`}>
              Check in
            </span>
            <span className={`mt-0.5 flex items-center gap-2 text-[0.92rem] font-medium ${valueCls}`}>
              <CalendarDays className={`h-4 w-4 ${onHero ? "text-white/50" : "text-[var(--accent)]"}`} />
              {humanDate(checkIn)}
            </span>
            <input
              aria-label="Check-in date"
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => {
                const next = e.target.value;
                setCheckIn(next);
                if (!next) return;
                const minOut = addDaysISO(next, 1);
                if (!checkOut || checkOut <= next) setCheckOut(minOut);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>

          <span className={`hidden h-9 w-px sm:block ${onHero ? "bg-white/15" : "bg-[var(--border)]"}`} />
          <span className={`mx-4 h-px sm:hidden ${dividerCls}`} />

          {/* Check-out */}
          <label className={`group relative flex-1 cursor-pointer rounded-xl px-4 py-2.5 sm:px-6 ${onHero ? "hover:bg-white/5" : "hover:bg-[var(--surface-alt)]"}`}>
            <span className={`block text-[0.6rem] font-medium uppercase tracking-[0.22em] ${labelCls}`}>
              Check out
            </span>
            <span className={`mt-0.5 flex items-center gap-2 text-[0.92rem] font-medium ${valueCls}`}>
              <CalendarDays className={`h-4 w-4 ${onHero ? "text-white/50" : "text-[var(--accent)]"}`} />
              {humanDate(checkOut)}
            </span>
            <input
              aria-label="Check-out date"
              type="date"
              value={checkOut}
              min={addDaysISO(checkIn || today, 1)}
              onChange={(e) => setCheckOut(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>

          <span className={`hidden h-9 w-px sm:block ${onHero ? "bg-white/15" : "bg-[var(--border)]"}`} />
          <span className={`mx-4 h-px sm:hidden ${dividerCls}`} />

          {/* Guests */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setGuestsOpen((v) => !v)}
              aria-expanded={guestsOpen}
              className={`flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left sm:min-w-[170px] sm:px-6 ${onHero ? "hover:bg-white/5" : "hover:bg-[var(--surface-alt)]"}`}
            >
              <Users className={`h-4 w-4 shrink-0 ${onHero ? "text-white/50" : "text-[var(--accent)]"}`} />
              <span className="min-w-0">
                <span className={`block text-[0.6rem] font-medium uppercase tracking-[0.22em] ${labelCls}`}>
                  Guests
                </span>
                <span className={`mt-0.5 block truncate text-[0.92rem] font-medium ${valueCls}`}>
                  {adults + children} guest{adults + children > 1 ? "s" : ""} · {rooms} room{rooms > 1 ? "s" : ""}
                </span>
              </span>
            </button>

            {guestsOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[290px] animate-sheet rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lift)]">
                {(
                  [
                    { key: "adults", label: "Adults", min: 1, max: 12, value: adults, set: setAdults },
                    { key: "children", label: "Children", min: 0, max: 8, value: children, set: setChildren },
                    { key: "rooms", label: "Rooms", min: 1, max: 6, value: rooms, set: setRooms },
                  ] as const
                ).map((row) => (
                  <div key={row.key} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-[var(--text-primary)]">{row.label}</span>
                    <span className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Fewer ${row.label.toLowerCase()}`}
                        onClick={() => row.set(Math.max(row.min, row.value - 1))}
                        disabled={row.value <= row.min}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-4 text-center text-sm tabular-nums">{row.value}</span>
                      <button
                        type="button"
                        aria-label={`More ${row.label.toLowerCase()}`}
                        onClick={() => row.set(Math.min(row.max, row.value + 1))}
                        disabled={row.value >= row.max}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setGuestsOpen(false)}
                  className="btn-outline mt-3 w-full py-2.5"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={submit}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-white transition-all hover:-translate-y-px sm:mt-0 sm:ml-2 sm:rounded-full"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Search className="h-4 w-4" />
            <span>Check availability</span>
          </button>
        </div>
      </div>
      {nights > 0 && (
        <p className={`mt-2 px-1 text-[0.72rem] ${onHero ? "text-white/60" : "text-[var(--text-muted)]"}`}>
          {nights} night{nights > 1 ? "s" : ""} · rates shown per room, taxes included at checkout
        </p>
      )}
    </div>
  );
}
