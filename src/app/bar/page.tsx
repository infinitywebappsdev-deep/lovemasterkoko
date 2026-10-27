import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { whatsappLink, HOTEL } from "@/lib/hotel";
import { BreadcrumbSchema } from "@/components/seo/StructuredData";
import { LazyAspectImage } from "@/components/common/LazyAspectImage";
import { PhoneSolidIcon } from "@/components/icons/PhoneSolidIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  Wine,
  Sparkles,
  Clock,
  Flame,
  Tv,
  CheckCircle2,
  Utensils,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The Bar — Open-Air Bar & Lounge | Banky Hotel & Suites",
  description:
    "Experience The Bar at Banky Hotel & Suites, Ado-Ekiti. Featuring the breezy Open-Air Bar with garden terrace and the sophisticated Indoor Lounge with billiards, top-shelf single malts, and handcrafted cocktails.",
  openGraph: {
    title: "The Bar: Open-Air Bar & Lounge — Banky Hotel & Suites",
    description:
      "Handcrafted cocktails, single malts, outdoor suya grill, billiards, and relaxed evenings under the Ekiti stars.",
    images: ["/images/OpenBar Garden.jpg"],
  },
};

export default function BarPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "The Bar", url: "/bar" },
  ];

  const barReservationMessage =
    `Hello ${HOTEL.name}, I would like to reserve a table/cabana at The Bar (Open-Air Bar & Lounge).\n` +
    `Date & Time: \n` +
    `Section Preference (Open-Air Garden or Indoor Lounge): \n` +
    `Party Size: `;

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 bg-[#18181b] dark:bg-[#141416] overflow-hidden">
        <Image
          src="/images/OpenBar Garden.jpg"
          alt="Open-Air Bar and Lounge at Banky Hotel"
          fill
          priority
          referrerPolicy="no-referrer"
          className="object-cover opacity-35 filter brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] dark:from-[#1b1b1e] via-[#18181b]/70 to-[#18181b]/80" />
        <div className="container-x relative z-10 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-px w-6 bg-[var(--accent)]" />
            <span className="eyebrow text-[var(--accent)]">Cocktails &middot; Spirits &middot; Starlit Evenings</span>
            <span className="h-px w-6 bg-[var(--accent)]" />
          </div>
          <h1 className="font-display font-normal text-4xl sm:text-5xl md:text-6xl text-white mb-3">
            The Bar
          </h1>
          <p className="text-xl sm:text-2xl font-serif text-[var(--accent-light)] font-normal mb-4">
            Open-Air Bar &amp; Lounge
          </p>
          <p className="text-sm sm:text-base text-stone-300 font-normal leading-relaxed max-w-2xl mx-auto">
            A twin sanctuary of nightlife and relaxation: unwind under the Ekiti stars in our lush Open-Air Garden Terrace, or retreat to our intimate Indoor Lounge with tournament billiards, bespoke mixology, and top-shelf single malts.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href={whatsappLink(barReservationMessage)}
              target="_blank"
              rel="noreferrer"
              className="btn-gold px-7 py-3 text-xs inline-flex items-center gap-2 shadow-lg"
            >
              <WhatsAppIcon text="Reserve Lounge / Garden Table" iconClassName="h-3.5 w-3.5" />
            </a>
            <a
              href={`tel:${HOTEL.phone}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-condensed tracking-wider uppercase font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm transition-all"
            >
              <PhoneSolidIcon className="h-3.5 w-3.5 text-amber-300" />
              <span>Call The Bar</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Experience Body */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#202023]">
        <div className="container-x max-w-5xl">
          {/* Dual Structure Concept Banner */}
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="eyebrow text-[var(--accent)]">The Dual Concept</span>
            <h2 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6]">
              Two Distinct Ambiances. One Unforgettable Bar.
            </h2>
            <p className="text-sm text-[#666] dark:text-[#a8a29e] leading-relaxed">
              The Bar at Banky Hotel comprises two harmoniously paired settings tailored to every mood: the breezy, vibrant al fresco energy of our <strong>Open-Air Garden Bar</strong>, and the refined, climate-controlled comfort of our <strong>Indoor Executive Lounge</strong>.
            </p>
          </div>

          {/* PART 1: The Open-Air Bar & Garden Terrace */}
          <div className="grid gap-12 md:grid-cols-2 items-center mb-24">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-condensed tracking-wider uppercase font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Part 1 &middot; Al Fresco Atmosphere
              </div>
              <h3 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6]">
                The Open-Air Bar &amp; Garden Terrace
              </h3>
              <p className="text-sm text-[#666] dark:text-[#a8a29e] leading-relaxed">
                Step outside into the gentle evening breeze of Ado-Ekiti. Surrounded by sculpted greenery, ambient courtyard lighting, and comfortable open-air sit-outs, the Open-Air Bar is the heartbeat of our evening social scene.
              </p>
              <p className="text-sm text-[#666] dark:text-[#a8a29e] leading-relaxed">
                Catch thrilling live football fixtures (Premier League, UEFA Champions League) on high-definition outdoor displays while enjoying crisp draft lagers, signature palm wine punches, and sizzling meat straight from the open flame.
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3">
                  <Flame className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Live Suya &amp; Grill Pit: Tender beef suya, spicy asun, and grilled fish
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Tv className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Big Screen Live Match Broadcasts &amp; Matchday Vibe
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Garden Cabanas &amp; Private Sit-out Lounges for Groups
                  </span>
                </div>
              </div>
            </div>
            <div className="relative group overflow-hidden rounded-2xl border border-[#ece6dd] dark:border-[#3a3a42] shadow-xl">
              <LazyAspectImage
                src="/images/OpenBar Garden.jpg"
                alt="Open-Air Garden Bar at Banky Hotel"
                className="w-full"
                imgClassName="hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-20 backdrop-blur-md bg-stone-950/80 border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-condensed tracking-widest uppercase font-semibold shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Starlit Garden Terrace</span>
              </div>
            </div>
          </div>

          {/* PART 2: The Indoor Lounge & Billiards Bar */}
          <div className="grid gap-12 md:grid-cols-2 items-center mb-24">
            <div className="relative md:order-1 group overflow-hidden rounded-2xl border border-[#ece6dd] dark:border-[#3a3a42] shadow-xl">
              <LazyAspectImage
                src="/images/lounge.jpg"
                alt="Indoor VIP Lounge at Banky Hotel"
                className="w-full"
                imgClassName="hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5 z-20 backdrop-blur-md bg-stone-950/80 border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-condensed tracking-widest uppercase font-semibold shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                <span>VIP Indoor Lounge</span>
              </div>
            </div>
            <div className="space-y-5 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px] font-condensed tracking-wider uppercase font-bold">
                <Wine className="h-3.5 w-3.5 text-[var(--accent)]" />
                Part 2 &middot; Executive Sanctuary
              </div>
              <h3 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6]">
                The Indoor Lounge &amp; Billiards Bar
              </h3>
              <p className="text-sm text-[#666] dark:text-[#a8a29e] leading-relaxed">
                For a more intimate, sophisticated rendezvous, step into the air-conditioned elegance of our Indoor Lounge. Featuring plush leather seating, warm mahogany wood tones, and soft background music, it is the premier meeting spot for executives and dignitaries.
              </p>
              <p className="text-sm text-[#666] dark:text-[#a8a29e] leading-relaxed">
                Center stage is our full-size tournament billiards table, inviting guests to enjoy leisurely games of pool alongside rare single malts, aged cognacs, and bespoke cocktails stirred by our resident mixologists.
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Tournament Billiards &amp; Pool Table for friendly games
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Curated Spirits: The Macallan, Glenfiddich, Hennessy XO &amp; Martell
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Deep Leather Booths for Confidential Business Conversations
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bar Operating Hours & Atmosphere */}
          <div className="p-8 sm:p-10 rounded-3xl bg-[#1e1e24] dark:bg-[#18181b] text-white shadow-xl mb-20 border border-white/10">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <Clock className="h-5 w-5" />
                  <span className="font-condensed text-xs uppercase tracking-widest font-semibold">Service Hours</span>
                </div>
                <h4 className="font-display text-2xl text-white">Daily 12:00 PM – Late</h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Open 7 days a week. Drinks, cocktails, and chilled beverages served midday till the early hours.
                </p>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
                <div className="flex items-center gap-2 text-amber-400">
                  <Flame className="h-5 w-5" />
                  <span className="font-condensed text-xs uppercase tracking-widest font-semibold">Nightly Suya Pit</span>
                </div>
                <h4 className="font-display text-2xl text-white">04:00 PM – Late Night</h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Fresh beef suya skewers, roasted chicken, spicy asun, and peppered snails off the coals all evening.
                </p>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
                <div className="flex items-center gap-2 text-amber-400">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-condensed text-xs uppercase tracking-widest font-semibold">Happy Hour</span>
                </div>
                <h4 className="font-display text-2xl text-white">05:00 PM – 07:00 PM</h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Complimentary bar bites with select cocktails and special rates on draft beers Monday through Thursday.
                </p>
              </div>
            </div>
          </div>

          {/* Curated Cocktail & Spirit Menu Preview */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <span className="eyebrow text-[var(--accent)] block mb-1">Curated Libations</span>
              <h3 className="font-display font-normal text-2xl sm:text-3xl text-[#222] dark:text-[#f4efe6]">
                Signature Mixology &amp; Premium Pours
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cocktails */}
              <div className="p-6 sm:p-7 rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#fdfbf7] dark:bg-[#25252a]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200 dark:border-stone-800">
                  <span className="font-condensed text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
                    House Signature Cocktails
                  </span>
                  <span className="text-[10px] uppercase font-condensed px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                    Handcrafted
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Banky Sunset Spritz</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦5,500</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Spiced gold rum, passionfruit purée, freshly squeezed pineapple juice, lime, and Angostura bitters.
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Ekiti Hibiscus Zobo Fizz</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦5,000</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Artisanal dry gin steeped with organic hibiscus flower, fresh ginger juice, sparkling tonic, and lime twist.
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Smoked Oak Old Fashioned</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦6,500</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Premium bourbon, demarara sugar, aromatic and orange bitters, presented in a smoked cedar glass.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bar Bites & Suya Grill */}
              <div className="p-6 sm:p-7 rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#fdfbf7] dark:bg-[#25252a]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200 dark:border-stone-800">
                  <span className="font-condensed text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
                    Suya Grill &amp; Evening Chops
                  </span>
                  <span className="text-[10px] uppercase font-condensed px-2 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-300 font-medium">
                    Hot Off The Grill
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Classic Beef Suya Platter</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦4,500</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Thinly sliced prime beef marinated in traditional yaji spices, fire-grilled, with sweet red onions and tomatoes.
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Fiery Asun (Spiced Goat Chops)</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦5,500</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Tender roasted goat meat tossed in crushed Scotch bonnet peppers, sweet bell peppers, and local herbs.
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Crispy Peppered Snails</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦8,000</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Jumbo garden snails sautéed with spicy chili-tomato reduction, served with roasted plantain chips.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Gallery: Open-Air Bar & Lounge Spaces */}
          <div className="mb-20">
            <div className="text-center mb-8">
              <span className="eyebrow text-[var(--accent)] block mb-1">Spaces &amp; Vibe</span>
              <h3 className="font-display font-normal text-2xl sm:text-3xl text-[#222] dark:text-[#f4efe6]">
                Explore The Bar Spaces
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { src: "/images/OpenBar Garden.jpg", title: "Open-Air Bar Garden Terrace", area: "Outdoor" },
                { src: "/images/lounge.jpg", title: "Executive Indoor Lounge Bar", area: "Indoor" },
                { src: "/images/Ballard Table.jpg", title: "Tournament Billiards Table", area: "Indoor" },
                { src: "/images/OpenBar Garden 2.jpg", title: "Garden Sit-Out Courtyard", area: "Outdoor" },
                { src: "/images/open air bar sitout.jpg", title: "Covered Al Fresco Pavilion", area: "Outdoor" },
                { src: "/images/OpenBar Garden 3.jpg", title: "Private Garden Cabanas", area: "Outdoor" },
              ].map((item, idx) => (
                <div key={idx} className="group relative rounded-2xl overflow-hidden border border-[#ece6dd] dark:border-[#2e2b26] shadow-sm">
                  <LazyAspectImage
                    src={item.src}
                    alt={item.title}
                    aspectClass="aspect-[4/3]"
                    imgClassName="group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-4 bg-white dark:bg-[#25252a] border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-sm text-stone-900 dark:text-stone-100">{item.title}</h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">{item.area}</p>
                    </div>
                    <span className="text-[10px] font-condensed uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      Banky Bar
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cross Link: The Restaurant */}
          <div className="p-8 rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#faf8f5] dark:bg-[#28282d] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <span className="eyebrow text-[var(--accent)]">Fine Dining Experience</span>
              <h3 className="font-display text-2xl text-stone-900 dark:text-stone-100">
                Joining Us for Breakfast, Lunch or Dinner?
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-lg leading-relaxed">
                Discover our signature Restaurant serving authentic Nigerian culinary heritage, continental specialties, and 24-hour in-room dining for hotel guests.
              </p>
            </div>
            <Link
              href="/restaurant"
              className="shrink-0 btn-gold px-7 py-3 text-xs inline-flex items-center gap-2"
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>Explore The Restaurant</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
