import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { whatsappLink, HOTEL } from "@/lib/hotel";
import { BreadcrumbSchema } from "@/components/seo/StructuredData";
import { LazyAspectImage } from "@/components/common/LazyAspectImage";
import { PhoneSolidIcon } from "@/components/icons/PhoneSolidIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  Utensils,
  Clock,
  QrCode,
  Sparkles,
  ArrowRight,
  Wine,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The Restaurant — Fine Dining & Authentic Delicacies | Banky Hotel & Suites",
  description:
    "Indulge in culinary artistry at The Restaurant in Banky Hotel & Suites, Ado-Ekiti. Authentic Nigerian delicacies, refined continental cuisine, gourmet breakfast, and 24-hour in-room dining.",
  openGraph: {
    title: "The Restaurant — Fine Dining at Banky Hotel & Suites",
    description:
      "A feast steeped in tradition. Master chef curated Nigerian heritage dishes and continental classics in an intimate four-star dining ambiance.",
    images: ["/images/dining.jpg"],
  },
};

export default function RestaurantPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "The Restaurant", url: "/restaurant" },
  ];

  const diningReservationMessage =
    `Hello ${HOTEL.name}, I would like to reserve a table at The Restaurant.\n` +
    `Date & Time: \n` +
    `Number of Guests: \n` +
    `Special Requests: `;

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 bg-[#1b1b1b] dark:bg-[#1a1a1d] overflow-hidden">
        <Image
          src="/images/dining.jpg"
          alt="Fine Dining Restaurant at Banky Hotel"
          fill
          priority
          referrerPolicy="no-referrer"
          className="object-cover opacity-35 filter brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b1b] dark:from-[#202023] via-[#1b1b1b]/70 to-[#1b1b1b]/80" />
        <div className="container-x relative z-10 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-px w-6 bg-[var(--accent)]" />
            <span className="eyebrow text-[var(--accent)]">Four-Star Culinary Experience</span>
            <span className="h-px w-6 bg-[var(--accent)]" />
          </div>
          <h1 className="font-display font-normal text-4xl sm:text-5xl md:text-6xl text-white mb-4">
            The Restaurant
          </h1>
          <p className="text-sm sm:text-base text-stone-300 font-normal leading-relaxed max-w-2xl mx-auto">
            A feast steeped in tradition. From time-honored Nigerian delicacies to refined continental cuisine, every plate is prepared with fresh local ingredients and gracious hospitality.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href={whatsappLink(diningReservationMessage)}
              target="_blank"
              rel="noreferrer"
              className="btn-gold px-7 py-3 text-xs inline-flex items-center gap-2 shadow-lg"
            >
              <WhatsAppIcon text="Reserve a Table" iconClassName="h-3.5 w-3.5" />
            </a>
            <Link
              href="/qr"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-condensed tracking-wider uppercase font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm transition-all"
            >
              <QrCode className="h-3.5 w-3.5 text-amber-300" />
              <span>Interactive Digital Menu</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#202023]">
        <div className="container-x max-w-5xl">
          {/* Overview & Philosophy */}
          <div className="grid gap-12 md:grid-cols-2 items-center mb-20">
            <div className="space-y-5">
              <span className="eyebrow text-[var(--accent)]">Culinary Heritage</span>
              <h2 className="font-display font-normal text-3xl sm:text-4xl text-[#222] dark:text-[#f4efe6]">
                Dining: A Feast Steeped in Tradition
              </h2>
              <p className="text-sm text-[#666] dark:text-[#a8a29e] leading-relaxed">
                At Banky Hotel &amp; Suites, dining is celebrated as an intimate journey through authentic Nigerian heritage and global culinary artistry. Our executive culinary team honors generational recipes and traditional slow-simmered flavors while plating with four-star precision.
              </p>
              <p className="text-sm text-[#666] dark:text-[#a8a29e] leading-relaxed">
                Whether you are savoring our signature whole catfish pepper soup infused with fragrant native utazi herbs or enjoying a tender grilled ribeye steak with seasoned garlic butter, every meal is prepared to order using the finest farm-fresh local produce.
              </p>
              <div className="pt-2 grid grid-cols-2 gap-4 border-t border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">Fresh Farm Ingredients</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">Halal &amp; Custom Dietary Prep</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">24-Hour Room Service</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">Private Dining Options</span>
                </div>
              </div>
            </div>
            <div className="relative group overflow-hidden rounded-2xl border border-[#ece6dd] dark:border-[#3a3a42] shadow-xl">
              <LazyAspectImage
                src="/images/dining.jpg"
                alt="Banky Hotel Restaurant Fine Dining"
                className="w-full"
                imgClassName="hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5 z-20 backdrop-blur-md bg-stone-950/85 text-white p-3.5 sm:p-4 rounded-xl shadow-xl border border-white/20 hidden sm:block max-w-[240px]">
                <span className="text-[10px] font-condensed uppercase tracking-widest text-[var(--accent-light)] block mb-1">
                  Executive Chef
                </span>
                <p className="text-xs font-serif italic text-stone-200">
                  &ldquo;We cook with patience, respecting tradition and delighting modern palates.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Service Hours Grid */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <span className="eyebrow text-[var(--accent)] block mb-1">Meal Periods &amp; Services</span>
              <h3 className="font-display font-normal text-2xl sm:text-3xl text-[#222] dark:text-[#f4efe6]">
                Serving Breakfast Through Dinner
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[#faf8f5] dark:bg-[#28282d] border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-[var(--accent)] flex items-center justify-center">
                  <Utensils className="h-5 w-5" />
                </div>
                <span className="text-xs font-condensed tracking-wider uppercase font-semibold text-[var(--accent)] block">
                  Morning Service
                </span>
                <h4 className="font-display text-xl text-stone-900 dark:text-stone-100">Gourmet Breakfast</h4>
                <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-condensed">
                  <Clock className="h-3.5 w-3.5" />
                  <span>07:00 AM – 10:30 AM Daily</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Complimentary for all hotel guests. Savor Nigerian breakfast staples (hot akara, boiled yam with garden egg sauce) alongside continental fruit platters, eggs to order, and fresh brewed coffee.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#faf8f5] dark:bg-[#28282d] border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-[var(--accent)] flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-xs font-condensed tracking-wider uppercase font-semibold text-[var(--accent)] block">
                  Midday Service
                </span>
                <h4 className="font-display text-xl text-stone-900 dark:text-stone-100">Executive Lunch</h4>
                <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-condensed">
                  <Clock className="h-3.5 w-3.5" />
                  <span>12:00 PM – 04:00 PM Daily</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Ideal for business meetings, government delegates, and leisurely afternoons. Features our express lunch platters, soups of the day, pastas, and crisp garden salads.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#faf8f5] dark:bg-[#28282d] border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-[var(--accent)] flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-xs font-condensed tracking-wider uppercase font-semibold text-[var(--accent)] block">
                  Evening Service
                </span>
                <h4 className="font-display text-xl text-stone-900 dark:text-stone-100">Chef&apos;s Dinner</h4>
                <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-condensed">
                  <Clock className="h-3.5 w-3.5" />
                  <span>06:00 PM – 10:30 PM Daily</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Candlelit evening service showcasing our signature chef specials, decadent heritage stews, seafood creations, and wine pairings. 24-hour room service continues through the night.
                </p>
              </div>
            </div>
          </div>

          {/* Curated Culinary Highlights */}
          <div className="mb-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="eyebrow text-[var(--accent)] block mb-1">Menu Preview</span>
                <h3 className="font-display font-normal text-2xl sm:text-3xl text-[#222] dark:text-[#f4efe6]">
                  Signature Culinary Creations
                </h3>
              </div>
              <Link
                href="/qr"
                className="inline-flex items-center gap-2 text-xs font-condensed uppercase tracking-wider text-[var(--accent)] hover:underline font-bold"
              >
                <span>Browse Full Digital Menu with Prices</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category 1: Nigerian Heritage */}
              <div className="p-6 sm:p-7 rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#fdfbf7] dark:bg-[#25252a]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200 dark:border-stone-800">
                  <span className="font-condensed text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
                    Nigerian Heritage Specials
                  </span>
                  <span className="text-[10px] uppercase font-condensed px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                    Chef&apos;s Pride
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Banky Royal Egusi &amp; Pounded Yam</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦8,500</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      Fluffy pounded yam served with rich melon seed soup, slow-braised beef, stockfish, dried fish, and fresh bitterleaf.
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Fresh Catfish Native Pepper Soup</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦9,000</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      Fresh whole point-and-kill catfish simmered in a steaming broth of calabash nutmeg, uda pod, and fragrant scent leaves.
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Smoky Party Jollof &amp; Suya Spiced Chicken</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦7,000</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      Long-grain parboiled rice cooked in rich tomato-pepper stock with authentic firewood aroma, sweet fried dodo, and grilled chicken.
                    </p>
                  </div>
                </div>
              </div>

              {/* Category 2: Continental & Grills */}
              <div className="p-6 sm:p-7 rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#fdfbf7] dark:bg-[#25252a]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200 dark:border-stone-800">
                  <span className="font-condensed text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
                    Continental &amp; Chef Classics
                  </span>
                  <span className="text-[10px] uppercase font-condensed px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
                    À La Carte
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Grilled Ribeye Steak &amp; Herb Mash</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦16,500</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      Prime cut seared to preference, served with creamy roasted garlic mashed potatoes, butter-glazed baby carrots, and green peppercorn jus.
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Seafood Fettuccine Alfredo</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦12,000</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      Al dente ribbon pasta tossed with sautéed jumbo tiger prawns, calamari, rich aged parmesan cream, and fresh parsley.
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-display text-base text-stone-900 dark:text-stone-100">Pan-Seared Croaker Fish &amp; Basmati</h4>
                      <span className="text-xs font-serif font-semibold text-stone-700 dark:text-stone-300">₦11,500</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      Crisp-skinned fresh croaker fillet basted with lemon-herb butter, served over fragrant vegetable basmati rice.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ambience & Gallery Showcase */}
          <div className="mb-20">
            <div className="text-center mb-8">
              <span className="eyebrow text-[var(--accent)] block mb-1">Atmosphere</span>
              <h3 className="font-display font-normal text-2xl sm:text-3xl text-[#222] dark:text-[#f4efe6]">
                Restaurant Spaces &amp; Banqueting
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { src: "/images/dining.jpg", title: "Main Fine Dining Room", subtitle: "Intimate and ambient" },
                { src: "/images/Restaurant 2.jpg", title: "Dining Hall & Banquet Seating", subtitle: "Spacious layout" },
                { src: "/images/restaurant14.jpg", title: "Private Dining Table Setup", subtitle: "Celebrations & delegates" },
              ].map((item, idx) => (
                <div key={idx} className="group relative rounded-2xl overflow-hidden border border-[#ece6dd] dark:border-[#2e2b26] shadow-sm">
                  <LazyAspectImage
                    src={item.src}
                    alt={item.title}
                    aspectClass="aspect-[4/3]"
                    imgClassName="group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-4 bg-white dark:bg-[#25252a] border-t border-stone-100 dark:border-stone-800">
                    <h4 className="font-display text-base text-stone-900 dark:text-stone-100">{item.title}</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive QR Menu Promo Banner */}
          <div className="p-8 sm:p-10 rounded-3xl bg-[#0a2777] text-white shadow-xl mb-16 relative overflow-hidden">
            <div className="relative z-10 grid gap-8 md:grid-cols-12 items-center">
              <div className="md:col-span-8 space-y-3">
                <span className="text-[11px] font-condensed tracking-[0.25em] uppercase text-[var(--accent-light)] font-semibold block">
                  Modern Tableside Experience
                </span>
                <h3 className="font-display text-2xl sm:text-3xl md:text-4xl text-white">
                  Order from Your Phone with Our Digital QR Menu
                </h3>
                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-xl">
                  Scan any table QR code or launch our digital menu directly on your device. Browse high-resolution dish photos, verify ingredient details, order room service, or track your meal progress in real time.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link
                    href="/qr"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-condensed tracking-wider uppercase font-bold text-[#0a2777] bg-white hover:bg-stone-100 transition-colors shadow-md"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Open Interactive Digital Menu</span>
                  </Link>
                  <span className="text-xs text-stone-300 font-condensed">No app installation needed</span>
                </div>
              </div>
              <div className="md:col-span-4 flex justify-center md:justify-end">
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center max-w-[200px]">
                  <div className="w-28 h-28 mx-auto mb-2 bg-white rounded-xl p-2 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-stone-900" />
                  </div>
                  <span className="text-[11px] font-condensed uppercase tracking-wider text-amber-200 block font-medium">
                    Scan At Your Table
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cross Link: The Bar (Open-Air Bar & Lounge) */}
          <div className="p-8 rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#faf8f5] dark:bg-[#28282d] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <span className="eyebrow text-[var(--accent)]">Evening Cocktails &amp; Starlit Nights</span>
              <h3 className="font-display text-2xl text-stone-900 dark:text-stone-100">
                The Bar: Open-Air Bar &amp; Lounge
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-lg leading-relaxed">
                Looking for crafted cocktails, single malts, suya fresh from the grill, or a game of billiards under the stars? Discover our dedicated Bar comprising the scenic Garden Terrace and VIP Lounge.
              </p>
            </div>
            <Link
              href="/bar"
              className="shrink-0 btn-gold px-7 py-3 text-xs inline-flex items-center gap-2"
            >
              <Wine className="h-3.5 w-3.5" />
              <span>Explore The Bar</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
