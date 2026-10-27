import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BreadcrumbSchema } from "@/components/seo/StructuredData";
import { LazyAspectImage } from "@/components/common/LazyAspectImage";
import { Utensils, Wine, ArrowRight, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Restaurant & Bar — Culinary & Nightlife | Banky Hotel & Suites",
  description:
    "Explore dining and nightlife at Banky Hotel & Suites in Ado-Ekiti. Choose between The Restaurant for authentic fine dining and The Bar comprising the Open-Air Bar & Lounge.",
  openGraph: {
    title: "Restaurant & Bar — Banky Hotel & Suites",
    description:
      "Fine dining and open-air nightlife in Ado-Ekiti. Discover The Restaurant and The Bar (Open-Air Bar & Lounge).",
    images: ["/images/dining.jpg"],
  },
};

export default function DiningHubPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Dining & Bar", url: "/dining" },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 bg-[#1b1b1b] dark:bg-[#1a1a1d] overflow-hidden">
        <Image
          src="/images/dining.jpg"
          alt="Restaurant and Bar at Banky Hotel"
          fill
          priority
          referrerPolicy="no-referrer"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b1b] dark:from-[#202023] via-[#1b1b1b]/70 to-[#1b1b1b]/80" />
        <div className="container-x relative z-10 text-center max-w-3xl mx-auto">
          <span className="eyebrow text-[var(--accent)] block mb-3">Culinary &amp; Nightlife</span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white mb-4">
            Restaurant &amp; Bar
          </h1>
          <p className="text-sm sm:text-base text-stone-300 font-normal leading-relaxed max-w-2xl mx-auto">
            Banky Hotel &amp; Suites welcomes you to two dedicated experiences: our celebrated fine dining Restaurant and our lively Bar comprising the Open-Air Bar &amp; Lounge.
          </p>
        </div>
      </section>

      {/* Gateway Grid */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#202023]">
        <div className="container-x max-w-5xl">
          <div className="text-center mb-12">
            <span className="eyebrow text-[var(--accent)] block mb-2">Choose Your Experience</span>
            <h2 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6]">
              Explore Our Distinct Venues
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* The Restaurant Card */}
            <div className="group rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-[#fdfbf7] dark:bg-[#25252a] shadow-lg flex flex-col justify-between hover:border-[var(--accent)] transition-all">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src="/images/dining.jpg"
                  alt="The Restaurant"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  referrerPolicy="no-referrer"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-condensed tracking-widest uppercase bg-[var(--accent)]/90 text-white px-2.5 py-1 rounded-full font-semibold">
                    Fine Dining
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl text-white mt-1">The Restaurant</h3>
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    A feast steeped in tradition. Master chef curated Nigerian heritage delicacies (pounded yam, fresh catfish pepper soup, egusi, firewood jollof) and refined continental classics.
                  </p>
                  <ul className="text-xs text-stone-500 dark:text-stone-400 space-y-1.5 font-medium">
                    <li>&bull; Gourmet Breakfast: 07:00 AM &ndash; 10:30 AM</li>
                    <li>&bull; Executive Lunch: 12:00 PM &ndash; 04:00 PM</li>
                    <li>&bull; Chef&apos;s Dinner: 06:00 PM &ndash; 10:30 PM</li>
                    <li>&bull; 24-Hour In-Room Dining Service</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
                  <Link
                    href="/restaurant"
                    className="w-full btn-gold py-3 text-xs inline-flex items-center justify-center gap-2"
                  >
                    <Utensils className="h-4 w-4" />
                    <span>View The Restaurant</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* The Bar Card */}
            <div className="group rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-[#fdfbf7] dark:bg-[#25252a] shadow-lg flex flex-col justify-between hover:border-[var(--accent)] transition-all">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src="/images/OpenBar Garden.jpg"
                  alt="The Bar: Open-Air Bar & Lounge"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  referrerPolicy="no-referrer"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-condensed tracking-widest uppercase bg-amber-600/90 text-white px-2.5 py-1 rounded-full font-semibold">
                    Nightlife &middot; Cocktails &middot; Lounge
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl text-white mt-1">The Bar</h3>
                  <span className="text-xs text-amber-200 font-condensed uppercase tracking-wider block">
                    Open-Air Bar &amp; Lounge
                  </span>
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    The bar comprises two unique spaces: our breezy <strong>Open-Air Garden Bar</strong> with outdoor suya grill and big-screen sports, and our cozy <strong>Indoor Lounge</strong> with tournament billiards and single malts.
                  </p>
                  <ul className="text-xs text-stone-500 dark:text-stone-400 space-y-1.5 font-medium">
                    <li>&bull; Open Daily: 12:00 PM &ndash; Late Night (02:00 AM)</li>
                    <li>&bull; Live Suya &amp; Chops Grill: 04:00 PM &ndash; Late</li>
                    <li>&bull; Happy Hour: 05:00 PM &ndash; 07:00 PM</li>
                    <li>&bull; Tournament Billiards Table &amp; VIP Seating</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
                  <Link
                    href="/bar"
                    className="w-full btn-gold py-3 text-xs inline-flex items-center justify-center gap-2"
                  >
                    <Wine className="h-4 w-4" />
                    <span>View The Bar (Open-Air &amp; Lounge)</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
