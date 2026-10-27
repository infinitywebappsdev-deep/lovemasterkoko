"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type GalleryItem = { src: string; alt: string; category: string };

const GALLERY: GalleryItem[] = [
  // Exterior & Facade
  { src: "/images/hero.jpg", alt: "Banky Hotel & Suites front view", category: "Exterior & Grounds" },
  { src: "/images/hotel-front-left.jpg", alt: "Hotel exterior west wing", category: "Exterior & Grounds" },
  { src: "/images/hotel-front-right.jpg", alt: "Hotel facade and grand entrance", category: "Exterior & Grounds" },

  // Lobby & Reception
  { src: "/images/Hotel Lobby.jpg", alt: "Hotel lobby with chandelier", category: "Lobby & Reception" },
  { src: "/images/Reception.jpg", alt: "Grand reception desk", category: "Lobby & Reception" },
  { src: "/images/Reception1.jpg", alt: "Reception arrival lounge", category: "Lobby & Reception" },
  { src: "/images/corridor-hallway.jpg", alt: "Elegant corridors", category: "Lobby & Reception" },
  { src: "/images/corridor-hallway-2.jpg", alt: "Hallway details", category: "Lobby & Reception" },

  // Rooms & Suites
  { src: "/images/signature suite room.jpg", alt: "Luxury Suite", category: "Rooms & Suites" },
  { src: "/images/Presidential.jpg", alt: "Luxury room master parlor", category: "Rooms & Suites" },
  { src: "/images/presidential 17.jpg", alt: "Luxury room VIP appointments", category: "Rooms & Suites" },
  { src: "/images/presidential23.jpg", alt: "Luxury room stately ambiance", category: "Rooms & Suites" },
  { src: "/images/presidential3.jpg", alt: "Luxury room luxury interior", category: "Rooms & Suites" },
  { src: "/images/superexecutive.jpg", alt: "Super Executive room", category: "Rooms & Suites" },
  { src: "/images/EXECUTIVE Main.jpeg", alt: "Executive room — Master bed and ambient paneling", category: "Rooms & Suites" },
  { src: "/images/EXECUTIVE MAIN2.jpeg", alt: "Executive room — Marble media wall and dressing suite", category: "Rooms & Suites" },
  { src: "/images/Standard PLUS.jpeg", alt: "Standard Plus room — Master bed and ambient lighting", category: "Rooms & Suites" },
  { src: "/images/STANDARD PLUS MAIN .jpeg", alt: "Standard Plus room — Suite interior and appointments", category: "Rooms & Suites" },
  { src: "/images/Suite1.jpg", alt: "Studio suite", category: "Rooms & Suites" },
  { src: "/images/Standard room.jpg", alt: "Standard room — Sanctuary bed and mood lighting", category: "Rooms & Suites" },
  { src: "/images/standard.jpg", alt: "Standard room — Contemporary appointments and workstation", category: "Rooms & Suites" },

  // Restaurant
  { src: "/images/dining.jpg", alt: "Fine dining restaurant main hall", category: "Restaurant" },
  { src: "/images/Restaurant 2.jpg", alt: "Restaurant setting & table service", category: "Restaurant" },
  { src: "/images/restaurant14.jpg", alt: "Private dining & banqueting setup", category: "Restaurant" },

  // The Bar & Lounge
  { src: "/images/OpenBar Garden.jpg", alt: "Open-air bar & garden terrace", category: "The Bar & Lounge" },
  { src: "/images/lounge.jpg", alt: "VIP indoor cocktail lounge & spirits bar", category: "The Bar & Lounge" },
  { src: "/images/Ballard Table.jpg", alt: "Billiards & lounge recreation", category: "The Bar & Lounge" },
  { src: "/images/OpenBar Garden 2.jpg", alt: "Garden bar evening courtyard", category: "The Bar & Lounge" },
  { src: "/images/OpenBar Garden 3.jpg", alt: "Open-air bar lounge pavilion", category: "The Bar & Lounge" },
  { src: "/images/OpenBar sitout.jpg", alt: "Evening garden sit-out", category: "The Bar & Lounge" },
  { src: "/images/open air bar sitout.jpg", alt: "Open-air bar sitout lounge", category: "The Bar & Lounge" },

  // Events & Banqueting
  { src: "/images/BankyHall.jpg", alt: "Banky Hall 300-seat banqueting venue", category: "Events & Banqueting" },
];

const CATEGORIES = ["All", ...Array.from(new Set(GALLERY.map((g) => g.category)))];

export default function GalleryPage() {
  const [active, setActive] = useState("All");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const filtered = active === "All" ? GALLERY : GALLERY.filter((g) => g.category === active);
  const lightboxItem = lightboxIdx !== null ? filtered[lightboxIdx] : null;

  const nextImg = useCallback(() => {
    setLightboxIdx((p) => (p !== null ? (p + 1) % filtered.length : null));
  }, [filtered.length]);

  const prevImg = useCallback(() => {
    setLightboxIdx((p) => (p !== null ? (p - 1 + filtered.length) % filtered.length : null));
  }, [filtered.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") nextImg();
      if (e.key === "ArrowLeft") prevImg();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, nextImg, prevImg]);

  // Lock body scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = lightboxIdx !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxIdx]);

  return (
    <>
      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 bg-[#1b1b1b] dark:bg-[#1a1a1d] overflow-hidden">
        {/* Baseline Gallery Header Image — guaranteed first visual to show immediately */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Hotel Lobby.jpg"
          alt="Banky Hotel Gallery"
          className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b1b1b]/80 dark:from-[#202023]/80 via-[#1b1b1b]/90 to-[#1b1b1b]" />
        <div className="container-x relative z-10 text-center">
          <span className="eyebrow text-[var(--accent)] block mb-3">Visual Tour</span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white">Photo Gallery</h1>
          <p className="mt-4 text-sm text-stone-400 max-w-lg mx-auto">
            Explore Banky Hotel &amp; Suites through our curated collection — {GALLERY.length} photos across {CATEGORIES.length - 1} categories.
          </p>
        </div>
      </section>

      {/* Gallery with categories */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#202023]">
        <div className="container-x">
          {/* Category tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActive(cat); setLightboxIdx(null); }}
                className={`px-4 py-2 text-xs font-condensed uppercase tracking-wider transition-all duration-300 border ${
                  active === cat
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "border-[#ece6dd] dark:border-[#2e2b26] text-[#666] dark:text-[#a8a29e] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Image count */}
          <p className="text-center text-xs text-[#999] dark:text-[#666] mb-8">
            Showing {filtered.length} photo{filtered.length !== 1 ? "s" : ""}
          </p>

          {/* Uniform Landscape Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item, i) => (
              <button
                key={item.src}
                onClick={() => setLightboxIdx(i)}
                className="overflow-hidden rounded-2xl border border-[#ece6dd] dark:border-[#2e2b26] group cursor-pointer block w-full text-left shadow-sm aspect-[16/10] relative bg-stone-200 dark:bg-stone-800"
              >
                {/* Blurred placeholder background using CSS filter: blur(20px) while full image loads */}
                <div
                  className="img-blur-bg absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-700"
                  style={{
                    backgroundImage: `url(${encodeURI(item.src)})`,
                    filter: "blur(20px)",
                    WebkitFilter: "blur(20px)",
                    transform: "scale(1.15)",
                  }}
                  data-placeholder="blur"
                  aria-hidden="true"
                />
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  referrerPolicy="no-referrer"
                  className="relative z-10 object-cover group-hover:scale-105 transition-transform duration-700"
                  onLoad={(e) => {
                    const sibling = e.currentTarget.previousElementSibling as HTMLElement | null;
                    if (sibling) {
                      sibling.style.opacity = "0";
                      sibling.classList.add("is-loaded");
                    }
                  }}
                />
                <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/35 transition-all duration-300 flex items-end justify-between p-3 opacity-0 group-hover:opacity-100">
                  <span className="text-white text-xs font-condensed uppercase tracking-wider font-medium">{item.category}</span>
                  <span className="text-[var(--accent)] text-xs font-condensed font-medium bg-black/40 px-2 py-0.5 rounded">View</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/booking" className="btn-gold px-9 py-4 text-xs inline-flex items-center gap-2">
              Book Your Stay
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 z-[110] h-10 w-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prevImg(); }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[110] h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center border border-white/20 bg-black/40 backdrop-blur-sm text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); nextImg(); }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[110] h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center border border-white/20 bg-black/40 backdrop-blur-sm text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Image */}
          <div className="max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl shadow-2xl border border-white/10">
              <Image
                src={lightboxItem.src}
                alt={lightboxItem.alt}
                width={1400}
                height={900}
                priority
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
              />
            </div>
            <div className="mt-3 text-center">
              <p className="text-white text-sm font-display">{lightboxItem.alt}</p>
              <p className="text-white/40 text-xs mt-1">
                {lightboxItem.category} &middot; {lightboxIdx! + 1} / {filtered.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
