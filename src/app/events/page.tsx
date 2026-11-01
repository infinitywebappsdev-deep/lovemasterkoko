import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Check, Phone, Users } from "lucide-react";
import { HOTEL, naira, whatsappLink } from "@/lib/hotel";
import { BreadcrumbSchema } from "@/components/seo/StructuredData";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export const metadata: Metadata = {
  title: "Meetings & Events — Banky Hall",
  description:
    "Book Banky Hall for weddings, conferences, and corporate events in Ado-Ekiti. 300-seat air-conditioned banqueting hall with full staging and AV.",
  openGraph: {
    title: "Banky Hall — Events & Banqueting",
    description:
      "A 300-seat banqueting hall for grand weddings, corporate summits, and gala celebrations in Ado-Ekiti.",
    images: ["/images/BankyHall.jpg"],
  },
};

const FEATURES = [
  "Up to 300 seated guests",
  "Air-conditioned climate control",
  "Integrated audio/PA & staging",
  "Crystal chandeliers & drapery",
  "Bridal / VIP dressing suite",
  "Dedicated banquet coordination",
];

const CONFIGURATIONS = [
  { title: "Banqueting & dining", copy: "Round tables of ten, served from the hotel kitchen.", image: "/images/Restaurant 2.jpg" },
  { title: "Arrival & foyer", copy: "A reception lounge for guest welcome and signage.", image: "/images/Reception1.jpg" },
];

export default function EventsPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Events", url: "/events" },
        ]}
      />

      <section className="relative flex min-h-[62vh] items-end overflow-hidden">
        <Image
          src="/images/BankyHall.jpg"
          alt="Banky Hall banqueting and events space"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/45" />
        <div className="container-x relative z-10 pb-10 pt-32 sm:pb-14">
          <p className="text-[0.66rem] font-medium uppercase tracking-[0.28em] text-white/60">
            Banqueting &amp; events
          </p>
          <h1 className="mt-3 font-display text-[2.6rem] leading-[1.03] text-white sm:text-6xl">Banky Hall</h1>
          <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-white/70">
            Three hundred seats, full staging and a team that has run weddings, AGMs and gala nights on the
            same compound for years.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-12 py-16 sm:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <p className="eyebrow">The venue</p>
          <h2 className="display-md mt-3">A room that changes shape with the occasion</h2>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
            A versatile, fully air-conditioned banqueting hall configured for grand weddings, corporate
            summits, AGMs and gala celebrations — with parking, power and catering all on site.
          </p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[0.86rem] text-[var(--text-secondary)]">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-end gap-8 border-t border-[var(--border)] pt-6">
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">Hall hire from</p>
              <p className="mt-1 font-display text-[1.9rem] leading-none">
                {naira(150000)}
                <span className="ml-1.5 font-sans text-[0.68rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  / event
                </span>
              </p>
            </div>
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">Capacity</p>
              <p className="mt-1 inline-flex items-center gap-2 text-[0.9rem]">
                <Users className="h-4 w-4 text-[var(--accent)]" /> 300 seated
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={whatsappLink("Hello, I would like to book Banky Hall for an event.")}
              target="_blank"
              rel="noreferrer"
              className="btn-brand"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Enquire on WhatsApp
            </a>
            <a href={`tel:${HOTEL.phone}`} className="btn-outline">
              <Phone className="h-4 w-4" /> Call the events desk
            </a>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--surface-alt)]">
            <Image
              src="/images/BankyHall.jpg"
              alt="Banky Hall set for an event"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="surface-sand border-y border-[var(--border)]">
        <div className="container-x py-16 sm:py-20">
          <p className="eyebrow">Configurations</p>
          <h2 className="display-md mt-3">Set-ups we run most often</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {CONFIGURATIONS.map((c) => (
              <figure key={c.title} className="overflow-hidden rounded-2xl">
                <div className="relative aspect-[16/10] bg-[var(--surface-alt)]">
                  <Image src={c.image} alt={c.title} fill sizes="(max-width: 640px) 100vw, 45vw" className="object-cover" />
                </div>
                <figcaption className="pt-4">
                  <p className="text-[0.92rem] font-medium">{c.title}</p>
                  <p className="mt-1 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">{c.copy}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
        <div>
          <h2 className="display-sm">Staying the night?</h2>
          <p className="mt-2 max-w-md text-[0.9rem] leading-relaxed text-[var(--text-muted)]">
            Block-book rooms for guests at a group rate and keep everyone on the same compound.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/booking" className="btn-gold">Check room availability</Link>
          <Link href="/contact" className="btn-outline">Contact the hotel</Link>
        </div>
      </section>
    </>
  );
}
