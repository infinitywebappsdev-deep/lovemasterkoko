import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, UtensilsCrossed, BedDouble, HeartHandshake, ShieldCheck } from "lucide-react";
import { BreadcrumbSchema } from "@/components/seo/StructuredData";
import { LazyAspectImage } from "@/components/common/LazyAspectImage";

export const metadata: Metadata = {
  title: "About Us | Where Every Stay Becomes a Story",
  description:
    "Banky is not merely a hotel, it is a living chapter of history, lovingly preserved and gracefully re-imagined for the modern traveler in Ado-Ekiti.",
  openGraph: {
    title: "About Banky Hotel & Suites — Where Every Stay Becomes a Story",
    description:
      "A living legacy of hospitality where timeless architecture meets modern indulgence in Ado-Ekiti.",
    images: ["/images/Hotel Lobby.jpg"],
  },
};

export default function AboutPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Hero Header */}
      <section className="relative pt-36 pb-24 sm:pt-44 sm:pb-32 bg-[#1b1b1b] dark:bg-[#1a1a1d] overflow-hidden">
        <Image
          src="/images/Hotel Lobby.jpg"
          alt="Banky Hotel Grand Lobby"
          fill
          priority
          referrerPolicy="no-referrer"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b1b] dark:from-[#202023] via-[#1b1b1b]/70 to-[#1b1b1b]/80" />

        <div className="container-x relative z-10 text-center max-w-4xl mx-auto">
          <span className="eyebrow text-[var(--accent)] block mb-3 tracking-[0.25em]">
            A Living Legacy
          </span>
          <h1 className="font-display font-normal text-4xl sm:text-5xl md:text-6xl text-white mb-6 leading-[1.15]">
            Where Every Stay Becomes a Story
          </h1>
          <p className="text-base sm:text-lg text-stone-200 font-normal leading-relaxed max-w-3xl mx-auto">
            Banky is not merely a hotel, it is a living chapter of history, lovingly preserved and gracefully re-imagined for the modern traveler. Within these storied walls, grand architecture and timeless elegance whisper tales of a bygone era, while every comfort of contemporary luxury awaits. From the moment you step through our doors, you are not just a guest, but a keeper of a legacy which one is written in craftsmanship, character, and genuine care.
          </p>
        </div>
      </section>

      {/* Main Narrative Body */}
      <div className="bg-white dark:bg-[#202023] py-20 sm:py-28">
        <div className="container-x max-w-6xl space-y-24 sm:space-y-32">

          {/* Section 1: Where Heritage Meets Warmth */}
          <section className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-condensed uppercase tracking-wider font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Enduring Grace</span>
              </div>
              <h2 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6] leading-[1.2]">
                Where Heritage Meets Warmth
              </h2>
              <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 font-normal leading-relaxed">
                True luxury is not found in newness, but in things that endure and Banky is a testament to that enduring grace. Ornate details, sweeping staircases, and interiors steeped in old-world charm meet the warmth of a team devoted to hospitality passed down through generations. Here, history is not distant or untouchable, it is alive in every handcrafted fixture, every polished floor, every quiet corner that has welcomed travelers for years past. Luxury at Banky is warm, storied, and deeply personal.
              </p>
            </div>
            <LazyAspectImage
              src="/images/Reception.jpg"
              alt="Banky Reception & Welcome Lounge"
              aspectClass="aspect-[16/10] sm:aspect-video"
              className="w-full rounded-2xl border border-[#ece6dd] dark:border-[#2e2b26] shadow-xl group"
              imgClassName="transition-transform duration-700 group-hover:scale-105"
              useNextImage={true}
            />
          </section>

          {/* Section 2: Love, Warmth, and Timeless Experiences */}
          <section className="grid gap-12 lg:grid-cols-2 items-center">
            <LazyAspectImage
              src="/images/OpenBar Garden.jpg"
              alt="Banky Garden and Courtyard Sitout"
              aspectClass="aspect-[16/10] sm:aspect-video"
              className="order-2 lg:order-1 w-full rounded-2xl border border-[#ece6dd] dark:border-[#2e2b26] shadow-xl group"
              imgClassName="transition-transform duration-700 group-hover:scale-105"
              useNextImage={true}
            />
            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-condensed uppercase tracking-wider font-bold">
                <HeartHandshake className="h-3.5 w-3.5" />
                <span>Devoted Hospitality</span>
              </div>
              <h2 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6] leading-[1.2]">
                Love, Warmth, and Timeless Experiences
              </h2>
              <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 font-normal leading-relaxed">
                A stay at Banky is shaped by moments that feel both nostalgic and new — a welcome as gracious as it was decades ago, staff who carry forward a tradition of genuine care, and quiet indulgences that connect you to the past while comforting you in the present. Whether it&apos;s a sunrise glimpsed from a heritage balcony, an evening walk through gardens that have bloomed for generations, or simply the reassurance of being looked after with old-fashioned devotion, Banky invites you to slow down and feel the weight and warmth of history.
              </p>
            </div>
          </section>

          {/* Section 3: Dining: A Feast Steeped in Tradition */}
          <section className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-condensed uppercase tracking-wider font-bold">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>Culinary Heritage</span>
              </div>
              <h2 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6] leading-[1.2]">
                Dining: A Feast Steeped in Tradition
              </h2>
              <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 font-normal leading-relaxed">
                At Banky, dining is a journey through time. Our chefs honor time-honored recipes and classic techniques, layering them with refined modern touches to create dishes that pay homage to the past while delighting the present-day palate. Savor a candlelit dinner beneath century-old chandeliers, linger over a leisurely brunch in a sunlit courtyard that has hosted travelers for generations, or enjoy a quiet in-room dining experience infused with heritage flavor. Every meal at Banky is a toast to tradition, served with contemporary grace.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/restaurant"
                  className="inline-flex items-center gap-2 font-condensed uppercase tracking-wider text-xs font-bold text-[var(--accent)] hover:underline"
                >
                  <span>Explore The Restaurant</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-stone-300 dark:text-stone-700">&bull;</span>
                <Link
                  href="/bar"
                  className="inline-flex items-center gap-2 font-condensed uppercase tracking-wider text-xs font-bold text-[var(--accent)] hover:underline"
                >
                  <span>The Bar &amp; Lounge</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            <LazyAspectImage
              src="/images/dining.jpg"
              alt="Banky Fine Dining Restaurant"
              aspectClass="aspect-[16/10] sm:aspect-video"
              className="w-full rounded-2xl border border-[#ece6dd] dark:border-[#2e2b26] shadow-xl group"
              imgClassName="transition-transform duration-700 group-hover:scale-105"
              useNextImage={true}
            />
          </section>

          {/* Section 4: Wellness: A Sanctuary Rooted in Old-World Calm */}
          <section className="grid gap-12 lg:grid-cols-2 items-center">
            <LazyAspectImage
              src="/images/OpenBar sitout.jpg"
              alt="Courtyard and Serene Relaxation Area"
              aspectClass="aspect-[16/10] sm:aspect-video"
              className="order-2 lg:order-1 w-full rounded-2xl border border-[#ece6dd] dark:border-[#2e2b26] shadow-xl group"
              imgClassName="transition-transform duration-700 group-hover:scale-105"
              useNextImage={true}
            />
            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-condensed uppercase tracking-wider font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Rest &amp; Renewal</span>
              </div>
              <h2 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6] leading-[1.2]">
                Wellness: A Sanctuary Rooted in Old-World Calm
              </h2>
              <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 font-normal leading-relaxed">
                Long before modern spas existed, rest and restoration were considered sacred rituals and at Banky, that philosophy remains at our core. Unwind with treatments inspired by time-honored wellness traditions, practice quiet reflection in spaces designed for stillness, or take a peaceful dip in a pool framed by classic architecture. Our wellness sanctuary is a place where the modern world fades, and the timeless art of rest and renewal takes its place.
              </p>
            </div>
          </section>

          {/* Section 5: Rooms & Suites: Where the Past Meets Comfort */}
          <section className="p-8 sm:p-12 lg:p-16 rounded-2xl bg-stone-50 dark:bg-[#181613] border border-[#ece6dd] dark:border-[#2e2b26]">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-condensed uppercase tracking-wider font-bold">
                  <BedDouble className="h-3.5 w-3.5" />
                  <span>Residences of Distinction</span>
                </div>
                <h2 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6] leading-[1.2]">
                  Rooms &amp; Suites: Where the Past Meets Comfort
                </h2>
                <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 font-normal leading-relaxed">
                  Each room and suite at Banky tells its own story. Adorned with heritage-inspired furnishings, rich textures, and architectural details preserved from another era, our accommodations blend old-world elegance with modern-day comfort. Sink into plush, perfectly dressed beds beneath high ceilings and vintage-inspired lighting, or unwind in a suite where classic charm meets thoughtful modern amenities, climate control, premium linens, and every convenience today&apos;s traveler expects. Whether you choose an intimate heritage room or a grand historic suite, each space is designed to make you feel like part of Banky&apos;s continuing story.
                </p>
                <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 font-normal leading-relaxed italic">
                  At Banky, we don&apos;t just offer a stay, we offer a passage through time, wrapped in love, warmth, and timeless hospitality, where history and comfort meet to create an experience that stays with you long after you&apos;ve gone.
                </p>
                <div className="pt-2">
                  <Link
                    href="/rooms"
                    className="btn-gold px-8 py-3.5 text-xs inline-flex items-center gap-2 rounded-xl"
                  >
                    <span>View All Suites</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LazyAspectImage
                  src="/images/signature suite room.jpg"
                  alt="Luxury Suite"
                  aspectClass="aspect-[16/10]"
                  className="rounded-xl border border-[#ece6dd] dark:border-[#2e2b26] shadow-md"
                  imgClassName="hover:scale-105 transition-transform duration-700"
                  useNextImage={true}
                />
                <LazyAspectImage
                  src="/images/executive.jpg"
                  alt="Executive Suite"
                  aspectClass="aspect-[16/10]"
                  className="rounded-xl border border-[#ece6dd] dark:border-[#2e2b26] shadow-md"
                  imgClassName="hover:scale-105 transition-transform duration-700"
                  useNextImage={true}
                />
              </div>
            </div>
          </section>

          {/* Pillars of Hospitality */}
          <div className="grid sm:grid-cols-3 gap-8 text-center py-8 border-y border-[#ece6dd] dark:border-[#2e2b26]">
            <div>
              <span className="font-display text-4xl text-[var(--accent)] block mb-1">28</span>
              <span className="eyebrow text-[#666] dark:text-[#a8a29e]">Bespoke Residences</span>
            </div>
            <div>
              <span className="font-display text-4xl text-[var(--accent)] block mb-1">300</span>
              <span className="eyebrow text-[#666] dark:text-[#a8a29e]">Guest Event Capacity</span>
            </div>
            <div>
              <span className="font-display text-4xl text-[var(--accent)] block mb-1">24/7</span>
              <span className="eyebrow text-[#666] dark:text-[#a8a29e]">Power &amp; Dedicated Concierge</span>
            </div>
          </div>

        </div>
      </div>

      {/* Epilogue & Call to Action */}
      <section className="relative py-24 sm:py-32 bg-[#0a2777] dark:bg-[#1a1a1d] text-white text-center overflow-hidden border-t border-[var(--accent)]/30">
        <div className="container-x relative z-10 max-w-4xl mx-auto space-y-8">
          <span className="eyebrow text-[var(--accent-light)] block tracking-[0.25em]">
            Timeless Invitation
          </span>

          <h2 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-white leading-[1.2]">
            Banky — A Living Legacy of Hospitality
          </h2>

          <p className="text-base sm:text-lg text-stone-100 font-normal leading-relaxed max-w-3xl mx-auto">
            Step into a story century in the making. At Banky, timeless architecture meets modern indulgence, where heritage charm and heartfelt warmth welcome you like family. Savor tradition-inspired dining beneath chandeliers that have witnessed generations, unwind in a wellness sanctuary rooted in old-world calm, and rest in rooms where history and comfort meet in perfect harmony. This isn&apos;t just a stay, it&apos;s a passage through time, wrapped in warmth, elegance, and unforgettable moments.
          </p>

          <div className="py-4">
            <blockquote className="font-display italic text-xl sm:text-2xl text-[var(--accent-light)] max-w-2xl mx-auto">
              &ldquo;Banky. Where history lives, and every guest becomes part of the story.&rdquo;
            </blockquote>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/booking"
              className="btn-gold px-9 py-4 text-xs font-condensed uppercase tracking-wider font-bold rounded-xl inline-flex items-center gap-2"
            >
              <span>Book Your Stay</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/rooms"
              className="btn-outline-white px-9 py-4 text-xs font-condensed uppercase tracking-wider font-bold rounded-xl inline-flex items-center gap-2"
            >
              <span>Explore Accommodations</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
