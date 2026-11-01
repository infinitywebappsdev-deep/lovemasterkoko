"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BedDouble, SlidersHorizontal, Users } from "lucide-react";
import { naira, type Room } from "@/lib/hotel";
import { ROOMS } from "@/lib/hotel";
import { subscribeRooms } from "@/lib/rooms-data";
import { BookingSearchBar } from "@/components/booking/BookingSearchBar";

type Sort = "recommended" | "price-asc" | "price-desc";

const SORTS: { key: Sort; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "price-asc", label: "Lowest price" },
  { key: "price-desc", label: "Highest price" },
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [sort, setSort] = useState<Sort>("recommended");

  useEffect(
    () =>
      subscribeRooms((live) => {
        if (live.length) setRooms(live);
      }),
    [],
  );

  const visible = useMemo(() => {
    const list = rooms.filter((r) => r.status !== "disabled");
    if (sort === "price-asc") return [...list].sort((a, b) => a.rate - b.rate);
    if (sort === "price-desc") return [...list].sort((a, b) => b.rate - a.rate);
    return list;
  }, [rooms, sort]);

  const fromRate = visible.length ? Math.min(...visible.map((r) => r.rate)) : 30000;

  return (
    <>
      {/* Header band */}
      <section className="border-b border-[var(--border)] bg-[var(--surface)] pb-10 pt-28 sm:pb-14 sm:pt-36">
        <div className="container-x">
          <nav className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <Link href="/" className="transition-colors hover:text-[var(--text-primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Rooms</span>
          </nav>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-[0.66rem] font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
                Accommodation
              </p>
              <h1 className="display-lg mt-3">Rooms &amp; suites</h1>
              <p className="lede mt-4">
                Twenty-eight rooms across eight categories — from calm standard doubles to the signature
                suite. Rates start at {naira(fromRate)} per night, taxes included at checkout.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] p-1">
              <span className="pl-3 pr-1 text-[var(--text-muted)]">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </span>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={`rounded-full px-3.5 py-2 text-[0.66rem] font-medium uppercase tracking-[0.12em] transition-colors ${
                    sort === s.key
                      ? "bg-[var(--text-primary)] text-[var(--surface)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <BookingSearchBar />
          </div>
        </div>
      </section>

      {/* Listing */}
      <section className="container-x py-14 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {visible.map((room) => (
            <article key={room.slug} className="group grid gap-6 sm:grid-cols-2 sm:items-center">
              <Link
                href={`/rooms/${room.slug}`}
                className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--surface-alt)]"
              >
                <Image
                  src={room.image}
                  alt={room.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </Link>

              <div>
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
                  {room.qty > 1 ? `${room.qty} rooms available` : "One-of-one"}
                </p>
                <h2 className="mt-2 font-display text-[1.7rem] leading-tight">{room.name}</h2>
                <p className="mt-2 line-clamp-3 text-[0.85rem] leading-relaxed text-[var(--text-muted)]">
                  {room.blurb}
                </p>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.72rem] text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {room.occupancy || "2 guests"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" /> {room.bed || "En-suite"}
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between border-t border-[var(--border)] pt-4">
                  <div>
                    <p className="font-display text-xl leading-none">{naira(room.rate)}</p>
                    <p className="mt-1 text-[0.6rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      per night
                    </p>
                  </div>
                  <Link
                    href={`/rooms/${room.slug}`}
                    className="inline-flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                  >
                    View room
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!visible.length && (
          <div className="card p-10 text-center">
            <h2 className="display-sm">No room categories are published right now</h2>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Please call the front desk and we will find you a room directly.
            </p>
          </div>
        )}
      </section>

      {/* Closing band */}
      <section className="surface-sand border-t border-[var(--border)]">
        <div className="container-x flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="display-md">Not sure which room?</h2>
            <p className="mt-2 max-w-md text-[0.9rem] leading-relaxed text-[var(--text-muted)]">
              Tell the front desk who is travelling and how long for — they will recommend the right
              category and hold it while you decide.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/booking" className="btn-gold">Check availability</Link>
            <Link href="/contact" className="btn-outline">Talk to the desk</Link>
          </div>
        </div>
      </section>
    </>
  );
}
