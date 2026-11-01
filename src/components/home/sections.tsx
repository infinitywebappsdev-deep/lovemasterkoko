"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CarFront,
  ChevronDown,
  Coffee,
  ConciergeBell,
  Dumbbell,
  Plane,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Waves,
  Wifi,
  Wine,
} from "lucide-react";
import { naira, whatsappLink, bookingMessage, type Room } from "@/lib/hotel";
import { ROOMS } from "@/lib/hotel";
import { subscribeRooms } from "@/lib/rooms-data";
import {
  DEFAULT_HOMEPAGE_MEDIA,
  subscribeHomepageMedia,
  type HomepageMediaConfig,
} from "@/lib/homepage-media";

/* ------------------------------------------------------------------ */
/*  Shared pieces                                                      */
/* ------------------------------------------------------------------ */

function useHomepageMedia(): HomepageMediaConfig {
  const [media, setMedia] = useState<HomepageMediaConfig>(DEFAULT_HOMEPAGE_MEDIA);
  useEffect(() => subscribeHomepageMedia(setMedia), []);
  return media;
}

function useLiveRooms(): Room[] {
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  useEffect(
    () =>
      subscribeRooms((live) => {
        if (live.length) setRooms(live);
      }),
    [],
  );
  return useMemo(() => rooms.filter((r) => r.status !== "disabled"), [rooms]);
}

function SectionHead({
  eyebrow,
  title,
  copy,
  href,
  linkLabel,
  align = "left",
  invert = false,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  href?: string;
  linkLabel?: string;
  align?: "left" | "center";
  invert?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between ${
        align === "center" ? "text-center sm:flex-col sm:items-center" : ""
      }`}
    >
      <div className={align === "center" ? "max-w-2xl" : "max-w-xl"}>
        <p className={`text-[0.66rem] font-medium uppercase tracking-[0.28em] ${invert ? "text-white/45" : "text-[var(--accent)]"}`}>
          {eyebrow}
        </p>
        <h2 className={`display-lg mt-3 ${invert ? "text-white" : ""}`}>{title}</h2>
        {copy && (
          <p className={`mt-4 text-[0.95rem] leading-relaxed ${invert ? "text-white/60" : "text-[var(--text-secondary)]"}`}>
            {copy}
          </p>
        )}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className={`group inline-flex shrink-0 items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] transition-colors ${
            invert ? "text-white/70 hover:text-white" : "text-[var(--text-primary)] hover:text-[var(--accent)]"
          }`}
        >
          {linkLabel}
          <span className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all group-hover:translate-x-0.5 ${
            invert ? "border-white/25" : "border-[var(--border-strong)]"
          }`}>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  About                                                              */
/* ------------------------------------------------------------------ */

export function AboutSection() {
  const media = useHomepageMedia();
  const about = media.about;

  return (
    <section className="container-x py-20 sm:py-28" id="story">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <div className="flex items-center gap-3">
            <span className="text-[0.66rem] font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
              The house
            </span>
            <span className="h-px w-10 bg-[var(--accent)]" />
          </div>
          <h2 className="display-lg mt-4">{about.heading || "A quieter kind of luxury"}</h2>
          <p className="lede mt-6">{about.description1}</p>
          <p className="mt-4 text-[0.92rem] leading-relaxed text-[var(--text-muted)]">{about.description2}</p>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-[var(--border)] pt-8">
            {[
              { k: "28", v: "Rooms & suites" },
              { k: "300", v: "Seat event hall" },
              { k: "24/7", v: "Power & front desk" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="font-display text-[2rem] leading-none">{s.k}</dt>
                <dd className="mt-2 text-[0.68rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">{s.v}</dd>
              </div>
            ))}
          </dl>

          <Link href="/about" className="btn-outline mt-9">
            Our story
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="lg:col-span-6">
          <div className="grid grid-cols-12 gap-4">
            <div className="relative col-span-8 aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--surface-alt)]">
              <Image
                src={about.image1 || "/images/hotel-front-right.jpg"}
                alt={about.image1Alt || "Banky Hotel exterior"}
                fill
                sizes="(max-width: 1024px) 60vw, 30vw"
                className="object-cover"
              />
            </div>
            <div className="col-span-4 flex flex-col gap-4 pt-10">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--surface-alt)]">
                <Image
                  src={about.image2 || "/images/OpenBar Garden.jpg"}
                  alt={about.image2Alt || "Open-air garden bar"}
                  fill
                  sizes="(max-width: 1024px) 30vw, 15vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-end rounded-2xl bg-[var(--text-primary)] p-5 text-[var(--paper)]">
                <Sparkles className="h-5 w-5 opacity-60" />
                <p className="mt-3 font-display text-lg leading-tight">Book direct, always</p>
                <p className="mt-1 text-[0.7rem] leading-relaxed opacity-60">Best rate, flexible terms, no booking fees.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Rooms                                                              */
/* ------------------------------------------------------------------ */

export function RoomsSection() {
  const rooms = useLiveRooms();
  const featured = rooms.slice(0, 3);

  return (
    <section className="surface-sand border-y border-[var(--border)]">
      <div className="container-x py-20 sm:py-28">
        <SectionHead
          eyebrow="Rooms & suites"
          title="Rest, arranged around you"
          copy="Eight room categories, from a calm standard double to the signature suite with its own parlour. Every stay includes Wi-Fi, power around the clock and daily housekeeping."
          href="/rooms"
          linkLabel="All rooms"
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {featured.map((room) => (
            <Link
              key={room.slug}
              href={`/rooms/${room.slug}`}
              className="group card card-hover overflow-hidden"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-alt)]">
                <Image
                  src={room.image}
                  alt={room.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-white backdrop-blur-md">
                  {room.occupancy || "2 guests"}
                </span>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-[1.4rem] leading-tight">{room.name}</h3>
                  <div className="text-right">
                    <p className="font-display text-lg leading-none">{naira(room.rate)}</p>
                    <p className="mt-1 text-[0.6rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">per night</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-[0.85rem] leading-relaxed text-[var(--text-muted)]">{room.blurb}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <span className="flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    <BedDouble className="h-3.5 w-3.5" />
                    {room.bed || "En-suite"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
                    View room <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Privileges                                                         */
/* ------------------------------------------------------------------ */

const PRIVILEGES = [
  {
    icon: ShieldCheck,
    title: "Best rate, guaranteed",
    copy: "Booking here is always the lowest price — no agency or platform fees on top.",
  },
  {
    icon: ConciergeBell,
    title: "Front desk, on WhatsApp",
    copy: "Message the team directly before you arrive. Requests are handled in the chat, not a form queue.",
  },
  {
    icon: CarFront,
    title: "Secure parking & transfer",
    copy: "Complimentary on-site parking, with airport pick-up arranged for suite guests.",
  },
];

export function PrivilegesSection() {
  return (
    <section className="container-x py-16 sm:py-20">
      <div className="grid gap-8 border-b border-[var(--border)] pb-14 sm:grid-cols-3 sm:gap-10">
        {PRIVILEGES.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="flex gap-4">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-[0.95rem] font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">{copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Facilities                                                         */
/* ------------------------------------------------------------------ */

const FACILITIES = [
  { icon: Wifi, label: "Fibre Wi-Fi", note: "Throughout the property" },
  { icon: UtensilsCrossed, label: "Restaurant", note: "Nigerian & continental" },
  { icon: Wine, label: "Open-air bar", note: "Garden seating" },
  { icon: Waves, label: "Swimming pool", note: "Outdoor, day use" },
  { icon: Dumbbell, label: "Fitness room", note: "Open 06:00–22:00" },
  { icon: Coffee, label: "Breakfast", note: "Served 07:00–10:30" },
  { icon: Plane, label: "Airport transfer", note: "On request" },
  { icon: CarFront, label: "Free parking", note: "Gated, guarded" },
];

export function FacilitiesSection() {
  return (
    <section className="container-x py-20 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-[0.66rem] font-medium uppercase tracking-[0.28em] text-[var(--accent)]">Facilities</p>
          <h2 className="display-md mt-3">Everything you need, quietly in place</h2>
          <p className="mt-4 text-[0.92rem] leading-relaxed text-[var(--text-muted)]">
            Twenty-eight rooms, a full kitchen, a garden bar and a hall that seats three hundred — all on one
            gated compound off the Ado-Iworoko road.
          </p>
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {FACILITIES.map(({ icon: Icon, label, note }) => (
              <div key={label}>
                <Icon className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.5} />
                <p className="mt-3 text-[0.85rem] font-medium leading-tight">{label}</p>
                <p className="mt-1 text-[0.72rem] leading-snug text-[var(--text-muted)]">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Experiences                                                        */
/* ------------------------------------------------------------------ */

const EXPERIENCES = [
  {
    href: "/restaurant",
    image: "/images/Restaurant 2.jpg",
    label: "The Restaurant",
    title: "Ekiti produce, cooked plainly well",
    copy: "Breakfast through dinner, with a menu that changes with the market.",
  },
  {
    href: "/bar",
    image: "/images/OpenBar Garden 2.jpg",
    label: "The Bar",
    title: "An open-air garden after dark",
    copy: "Cocktails, small chops and live sets under the trees.",
  },
  {
    href: "/events",
    image: "/images/Event Hall.jpg",
    label: "Banky Hall",
    title: "Weddings, boards and conferences",
    copy: "300 seated guests, dedicated power and an events team on site.",
  },
];

export function ExperiencesSection() {
  return (
    <section className="surface-ink">
      <div className="container-x py-20 sm:py-28">
        <SectionHead
          invert
          eyebrow="Around the house"
          title="Dining, drinks, and room to gather"
          copy="Three reasons guests stay on the property long after check-in."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {EXPERIENCES.map((exp) => (
            <Link key={exp.href} href={exp.href} className="group relative overflow-hidden rounded-2xl">
              <div className="relative aspect-[4/5] bg-black/40">
                <Image
                  src={exp.image}
                  alt={exp.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover opacity-85 transition-all duration-700 group-hover:scale-[1.05] group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.24em] text-white/60">{exp.label}</p>
                <h3 className="mt-2 font-display text-[1.45rem] leading-tight text-white">{exp.title}</h3>
                <p className="mt-2 max-w-[26ch] text-[0.82rem] leading-relaxed text-white/70">{exp.copy}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-[0.66rem] font-medium uppercase tracking-[0.18em] text-white">
                  Explore
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Gallery                                                            */
/* ------------------------------------------------------------------ */

export function GallerySection() {
  const media = useHomepageMedia();
  const shots = media.gallery.filter((g) => g.active !== false).slice(0, 6);
  if (!shots.length) return null;

  return (
    <section className="container-x py-20 sm:py-28">
      <SectionHead
        eyebrow="Gallery"
        title="A look around before you arrive"
        href="/gallery"
        linkLabel="Full gallery"
      />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {shots.map((shot, i) => (
          <Link
            key={shot.id}
            href="/gallery"
            className={`group relative overflow-hidden rounded-2xl bg-[var(--surface-alt)] ${
              i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-[4/5]"
            }`}
          >
            <Image
              src={shot.url}
              alt={shot.title}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {shot.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */

const QUOTES = [
  {
    quote:
      "The quietest night's sleep I've had in Ekiti. The team remembered our names by the second morning.",
    name: "Adaeze O.",
    detail: "Stayed in a Luxury Suite",
  },
  {
    quote:
      "We hosted ninety guests in Banky Hall. Power never flickered and the food came out hot — twice.",
    name: "Tunde A.",
    detail: "Conference, March",
  },
  {
    quote:
      "Booked directly on WhatsApp in about four minutes. No card, confirmation straight back.",
    name: "Grace E.",
    detail: "Weekend stay",
  },
];

export function TestimonialsSection() {
  return (
    <section className="surface-sand border-y border-[var(--border)]">
      <div className="container-x py-20 sm:py-24">
        <SectionHead
          eyebrow="Guest notes"
          title="What people say after they leave"
          align="center"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {QUOTES.map((q) => (
            <figure key={q.name} className="card flex h-full flex-col justify-between p-6 sm:p-7">
              <blockquote className="text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-6 border-t border-[var(--border)] pt-4">
                <p className="text-[0.85rem] font-medium">{q.name}</p>
                <p className="mt-0.5 text-[0.7rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">{q.detail}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: "What time is check-in and check-out?",
    a: "Check-in opens at 2:00 PM and check-out is 12:00 PM. Early arrival and late departure can be arranged with the front desk, subject to availability.",
  },
  {
    q: "How do I pay for my stay?",
    a: "You can pay online by card, USSD or bank transfer through Paystack, settle by direct bank transfer, or pay at the front desk on arrival. Every reservation is held while you decide.",
  },
  {
    q: "Is breakfast included?",
    a: "Breakfast is included on selected rate plans and can be added at checkout. It is served in the restaurant daily from 7:00 to 10:30 AM.",
  },
  {
    q: "Do you have parking and airport transfers?",
    a: "Parking is free, gated and guarded. Airport pick-up from Ado-Ekiti can be arranged when you book — add it as an extra or ask the front desk.",
  },
  {
    q: "Can I cancel or change my booking?",
    a: "Free cancellation applies up to the deadline shown on your rate plan. Non-refundable rates are marked clearly before payment, and changes are handled by the front desk.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="container-x py-20 sm:py-28">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-[0.66rem] font-medium uppercase tracking-[0.28em] text-[var(--accent)]">Questions</p>
          <h2 className="display-md mt-3">Before you book</h2>
          <p className="mt-4 text-[0.9rem] leading-relaxed text-[var(--text-muted)]">
            Still unsure about something? The front desk answers on WhatsApp within minutes.
          </p>
          <a
            href={whatsappLink(bookingMessage({}))}
            target="_blank"
            rel="noreferrer"
            className="btn-outline mt-6"
          >
            Ask on WhatsApp
          </a>
        </div>

        <div className="lg:col-span-8">
          <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="text-[0.95rem] font-medium">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="-mt-1 max-w-2xl pb-6 text-[0.88rem] leading-relaxed text-[var(--text-muted)]">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <Link href="/faqs" className="btn-quiet mt-6">
            All policies <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Closing CTA                                                        */
/* ------------------------------------------------------------------ */

export function CtaSection() {
  return (
    <section className="container-x pb-20 sm:pb-28">
      <div className="relative overflow-hidden rounded-3xl">
        <Image
          src="/images/exterior-night.jpg"
          alt="Banky Hotel & Suites at night"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30" />
        <div className="relative grid gap-8 p-8 sm:p-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-[0.64rem] font-medium uppercase tracking-[0.28em] text-white/50">Reservations</p>
            <h2 className="display-lg mt-3 text-white">Your room is ready when you are</h2>
            <p className="mt-4 max-w-md text-[0.92rem] leading-relaxed text-white/65">
              Live availability, instant confirmation, and a front desk that answers. Book direct for the best
              available rate.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <Link href="/booking" className="btn-gold">
              Check availability
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappLink(bookingMessage({}))}
              target="_blank"
              rel="noreferrer"
              className="btn-outline-white"
            >
              WhatsApp the desk
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
