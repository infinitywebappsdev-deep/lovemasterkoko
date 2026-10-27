"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { naira, Room, ROOMS } from "@/lib/hotel";
import { subscribeRooms } from "@/lib/rooms-data";
import { ArrowRight, Bed, Users, Sparkles } from "lucide-react";
import { RoomImageSlider } from "@/components/common/RoomImageSlider";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [activeFilter, setActiveFilter] = useState<"all" | "suites" | "executive" | "standard">("all");

  // Subscribe to live room categories from Firestore
  useEffect(() => {
    const unsub = subscribeRooms((liveRooms) => {
      setRooms(liveRooms);
    });
    return () => unsub();
  }, []);

  const filteredRooms = rooms.filter((r) => {
    if (activeFilter === "all") return true;
    const nameLower = r.name.toLowerCase();
    if (activeFilter === "suites") {
      return nameLower.includes("suite") || nameLower.includes("presidential") || nameLower.includes("penthouse");
    }
    if (activeFilter === "executive") {
      return nameLower.includes("executive") || nameLower.includes("deluxe") || nameLower.includes("luxury");
    }
    if (activeFilter === "standard") {
      return nameLower.includes("standard") || nameLower.includes("studio");
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#202023]">
      {/* ─────────────────────────────────────────────────────────────
          1. DEDICATED SEPARATE VIDEO / IMAGE HEADER SECTION
         ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[40vh] sm:h-[50vh] min-h-[300px] bg-stone-950 overflow-hidden flex items-center justify-center">
        {/* Baseline Header Photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/exterior-night.jpg"
          alt="Rooms & Suites at Banky Hotel"
          className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none select-none"
        />
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/images/exterior-night.jpg"
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
          <source src="/videos/executive-room.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60 pointer-events-none" />

        <div className="container-x relative z-10 text-center py-12">
          <span className="text-[11px] font-condensed uppercase tracking-widest text-[#ffbf00] font-bold block mb-2">
            Luxury Accommodations
          </span>
          <h1 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-white mb-3">
            Rooms &amp; Suites
          </h1>
          <p className="text-sm sm:text-base text-stone-200 font-normal max-w-xl mx-auto leading-relaxed">
            Twenty-eight appointed residences, each designed for comfort, elegance, and an unforgettable stay in Ado-Ekiti.
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ROOM CATEGORIES CATALOG SECTION
         ───────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20">
        <div className="container-x">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800 mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeFilter === "all"
                    ? "bg-[#ffbf00] text-white shadow-sm"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                All Categories ({rooms.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("suites")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeFilter === "suites"
                    ? "bg-[#ffbf00] text-white shadow-sm"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                Suites &amp; Penthouse
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("executive")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeFilter === "executive"
                    ? "bg-[#ffbf00] text-white shadow-sm"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                Executive &amp; Deluxe
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("standard")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeFilter === "standard"
                    ? "bg-[#ffbf00] text-white shadow-sm"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                Standard &amp; Studio
              </button>
            </div>

            <div className="text-xs text-stone-500">
              Showing <strong>{filteredRooms.length}</strong> room {filteredRooms.length === 1 ? "category" : "categories"}
            </div>
          </div>

          {/* Room Cards Grid */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => {
              const imagesList = room.images && room.images.length > 0 ? room.images : [room.image];
              return (
                <Link
                  key={room.slug}
                  href={`/rooms/${room.slug}`}
                  className="group block border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#28282d] overflow-hidden rounded-2xl hover:shadow-xl transition-all duration-300 hover:border-[#ffbf00]"
                >
                  {/* Slider with NO BUTTONS visible to guests as requested */}
                  <div className="overflow-hidden bg-stone-100 dark:bg-stone-900">
                    <RoomImageSlider
                      images={imagesList}
                      alt={room.name}
                      aspectClass="aspect-[16/10]"
                      autoSlideInterval={5500}
                      showControls={false}
                      pauseOnHover={false}
                    />
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h2 className="font-display text-2xl font-normal text-stone-900 dark:text-white group-hover:text-[#ffbf00] transition-colors">
                        {room.name}
                      </h2>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold">
                        {room.qty} {room.qty === 1 ? "unit" : "units"}
                      </span>
                    </div>

                    <p className="text-sm text-stone-600 dark:text-stone-300 font-normal leading-relaxed line-clamp-2 mb-4">
                      {room.blurb}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
                      <div>
                        <span className="font-display text-2xl font-normal text-[#ffbf00]">
                          {naira(room.rate)}
                        </span>
                        <span className="text-[11px] uppercase font-condensed tracking-wider text-stone-500 dark:text-stone-400 ml-1">
                          / night
                        </span>
                      </div>

                      <span className="px-3.5 py-1.5 rounded-lg bg-[#ffbf00] hover:bg-[#e09e00] text-white text-xs font-semibold inline-flex items-center gap-1.5 group-hover:translate-x-0.5 transition-all shadow-sm">
                        <span>View Details</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
