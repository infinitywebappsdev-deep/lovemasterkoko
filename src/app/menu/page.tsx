import type { Metadata } from "next";
import Image from "next/image";
import { MenuViewer } from "@/components/menu/MenuViewer";
import { BreadcrumbSchema } from "@/components/seo/StructuredData";
import { Clock, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Restaurant & Bar Menu",
  description:
    "Browse the full restaurant and bar menu of Banky Hotel & Suites in Ado-Ekiti — breakfast, rice dishes, Nigerian soups, grills, platters, desserts and drinks with prices in Naira. Scan the QR code on your table card to view on mobile.",
  alternates: {
    canonical: "/menu",
  },
  openGraph: {
    title: "Restaurant & Bar Menu — Banky Hotel & Suites",
    description:
      "The complete dining menu: breakfast, jollof rice, native soups, grills, platters and bar — with live prices.",
    images: ["/images/dining.jpg"],
  },
};

export default function MenuPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Menu", url: "/menu" },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Hero */}
      <section className="relative pt-32 pb-14 sm:pt-40 sm:pb-16 bg-[#1b1b1b] dark:bg-[#1a1a1d] overflow-hidden">
        <Image
          src="/images/dining.jpg"
          alt="Dining at Banky Hotel & Suites"
          fill
          priority
          referrerPolicy="no-referrer"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b1b] via-[#1b1b1b]/75 to-[#1b1b1b]/85" />
        <div className="container-x relative z-10 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-px w-6 bg-[var(--accent)]" />
            <span className="eyebrow text-[var(--accent)]">Scan · Browse · Order</span>
            <span className="h-px w-6 bg-[var(--accent)]" />
          </div>
          <h1 className="font-display font-normal text-4xl sm:text-5xl md:text-6xl text-white mb-4">
            Restaurant &amp; Bar Menu
          </h1>
          <p className="text-sm sm:text-base text-stone-300 leading-relaxed max-w-2xl mx-auto">
            The complete Banky Kitchen — from sunrise breakfast to late-night grills and cold
            drinks. Everything on our printed menu card, right here on your phone.
          </p>
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-stone-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
              Kitchen open daily
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
              Ado-Ekiti, Ekiti State
            </span>
          </div>
        </div>
      </section>

      {/* Live menu */}
      <section className="bg-white dark:bg-[#202023] pt-4">
        <MenuViewer />
      </section>
    </>
  );
}
