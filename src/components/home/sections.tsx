"use client";
import { memo, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Shield,
  Wifi,
  Coffee,
  Utensils,
  GlassWater,
  CalendarCheck,
  Bed,
  Users,
  ShieldCheck,
  Sparkles,
  Clock,
  Zap,
  Award,
  Phone,
  MessageSquare,
} from "lucide-react";
import { PhoneSolidIcon } from "@/components/icons/PhoneSolidIcon";
import { RoomImageSlider } from "@/components/common/RoomImageSlider";
import { ROOMS, HOTEL, naira, Room, whatsappLink, bookingMessage } from "@/lib/hotel";
import { subscribeRooms, getCachedRooms } from "@/lib/rooms-data";
import { useRoomPreloader, preloadAllRoomsOnIdle } from "@/lib/image-preloader";
import { DEFAULT_HOMEPAGE_MEDIA, HomepageMediaConfig, subscribeHomepageMedia } from "@/lib/homepage-media";

const FACILITIES = [
  { icon: Utensils, title: "Restaurant & Dining", desc: "Authentic Nigerian delicacies and international breakfast served daily by master chefs." },
  { icon: GlassWater, title: "Garden Bar & Sit-out", desc: "Refreshing cocktails, cold beverages, and an open-air breeze in the private garden lounge." },
  { icon: CalendarCheck, title: "Banky Hall & Events", desc: "Air-conditioned 300-seat banqueting hall for wedding receptions and seminars." },
  { icon: Wifi, title: "High-Speed Wi-Fi", desc: "Complimentary unbroken fiber internet throughout all rooms and public lounges." },
  { icon: Shield, title: "24/7 Security & Power", desc: "Continuous multi-generator power backup and uniformed professional security." },
  { icon: Coffee, title: "Room Service", desc: "Attentive in-room dining and concierge assistance whenever you desire." },
];

const FAQS = [
  { q: "What are your check-in and check-out times?", a: "Standard check-in begins at 2:00 PM and check-out is by 12:00 noon. Early check-in or late check-out can be requested subject to room availability." },
  { q: "Is complimentary breakfast included?", a: "Yes, all room reservations include complimentary gourmet breakfast served daily in our fine dining restaurant." },
  { q: "Where is Banky Hotel & Suites located?", a: "We are located at Km 5 NDLEA Junction Ado-Iworoko Road, Adebayo, Ado-Ekiti, Ekiti State, Nigeria." },
  { q: "Do you have 24/7 security and uninterrupted power?", a: "Yes, we provide round-the-clock armed professional security, CCTV surveillance, and full multi-tier generator power backup." },
];

/* ------------------------------------------------------------------ */
/*  About                                                              */
/* ------------------------------------------------------------------ */
export const AboutSection = memo(function AboutSection() {
  const [media, setMedia] = useState<HomepageMediaConfig>(DEFAULT_HOMEPAGE_MEDIA);

  useEffect(() => {
    const unsub = subscribeHomepageMedia((live) => {
      setMedia(live);
    });
    return () => unsub();
  }, []);

  const about = media.about || DEFAULT_HOMEPAGE_MEDIA.about;

  return (
    <section className="bg-[#f8f5f0] dark:bg-[#25252a] py-20 sm:py-28 border-b border-[#ece6dd] dark:border-[#3a3a42]" style={{ contentVisibility: "auto", containIntrinsicSize: "0 800px" }}>
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-2">
              <span className="h-px w-8 bg-[var(--accent)]" />
              <span className="eyebrow text-[var(--accent)]">Banky Hotel &amp; Suites</span>
            </div>
            <h2 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-[#222] dark:text-[#f4efe6] leading-[1.12]">
              {about.heading || "Enjoy a Calm Haven in Ado-Ekiti"}
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-stone-700 dark:text-stone-200 font-normal">
              {about.description1 || "Step into a story century in the making. At Banky, timeless architecture meets modern indulgence, where heritage charm and heartfelt warmth welcome you like family. Savor tradition-inspired dining beneath chandeliers that have witnessed generations, unwind in a wellness sanctuary rooted in old-world calm, and rest in rooms where history and comfort meet in perfect harmony. This isn't just a stay, it's a passage through time, wrapped in warmth, elegance, and unforgettable moments"}
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-stone-700 dark:text-stone-200 font-normal">
              {about.description2 || "Our 28 bespoke rooms and suites feature quiet climate control, unbroken high-speed Wi-Fi, and 24/7 dedicated generator power grid."}
            </p>
            <div className="pt-4 flex flex-col lg:flex-row items-center lg:justify-between gap-5 border-t border-[#ece6dd] dark:border-[#3a3a42]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full border border-[var(--accent)] flex items-center justify-center text-[var(--accent)]"><PhoneSolidIcon className="h-5 w-5" /></div>
                <div>
                  <span className="font-condensed uppercase tracking-wider text-xs text-[var(--accent)] font-medium block">Reservation Hotline</span>
                  <a href={`tel:${HOTEL.phone}`} className="font-display text-2xl sm:text-3xl text-stone-900 dark:text-white font-normal hover:text-[var(--accent)] transition-colors">{HOTEL.phone}</a>
                </div>
              </div>
              <Link href="/booking" className="btn-gold px-8 py-3.5 text-xs sm:text-sm font-medium inline-flex items-center justify-center text-center mx-auto lg:mx-0 shadow-md">Check Availability</Link>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 relative">
              <div className="overflow-hidden rounded-2xl border border-[#ece6dd] dark:border-[#3a3a42] shadow-lg aspect-[16/19] relative">
                <Image src={about.image1 || "/images/hotel-front-right.jpg"} alt={about.image1Alt || "Hotel exterior"} fill className="object-cover hover:scale-105 transition-transform duration-700" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#ece6dd] dark:border-[#3a3a42] shadow-lg aspect-[16/19] relative">
                <Image src={about.image2 || "/images/OpenBar Garden.jpg"} alt={about.image2Alt || "Garden bar"} fill className="object-cover hover:scale-105 transition-transform duration-700" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  Rooms                                                              */
/* ------------------------------------------------------------------ */
export const RoomsSection = memo(function RoomsSection() {
  const { getPreloadHandlers } = useRoomPreloader();
  const [rooms, setRooms] = useState<Room[]>(ROOMS);

  useEffect(() => {
    const unsub = subscribeRooms((liveRooms) => {
      setRooms(liveRooms);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const cancelIdle = preloadAllRoomsOnIdle(rooms.length > 0 ? rooms : ROOMS, 800);
    return () => {
      cancelIdle?.();
    };
  }, [rooms]);

  const displayRooms = rooms.length > 0 ? rooms.slice(0, 8) : ROOMS.slice(0, 8);

  return (
    <section
      id="rooms-catalog-section"
      className="py-20 sm:py-28 bg-white dark:bg-[#202023] relative border-b border-[#ece6dd] dark:border-[#3a3a42]"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 1200px" }}
    >
      <div className="container-x">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-6 bg-[var(--accent)]" />
            <span className="eyebrow text-[var(--accent)]">Luxury Accommodations</span>
            <span className="h-px w-6 bg-[var(--accent)]" />
          </div>
          <h2 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-[#222] dark:text-[#f4efe6]">
            Rooms &amp; Suites
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-600 dark:text-stone-300 font-normal max-w-lg mx-auto">
            Discover our collection of 28 bespoke rooms and executive suites, designed for restful luxury and modern comfort in Ado-Ekiti.
          </p>
        </div>

        <div className="grid gap-6 sm:gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {displayRooms.map((room) => {
            const imagesList = room.images && room.images.length > 0 ? room.images : [room.image];
            return (
              <Link
                key={room.slug}
                href={`/rooms/${room.slug}`}
                {...getPreloadHandlers(room.slug)}
                className="group flex flex-col border border-[#ece6dd] dark:border-[#3a3a42] bg-white dark:bg-[#28282d] overflow-hidden rounded-2xl hover:shadow-xl transition-all duration-300 hover:border-[var(--accent)]"
              >
                {/* Auto-sliding room showcase box with NO guest buttons */}
                <div className="overflow-hidden bg-stone-100 dark:bg-stone-900">
                  <RoomImageSlider
                    images={imagesList}
                    alt={room.name}
                    aspectClass="aspect-[16/11]"
                    autoSlideInterval={5000}
                    showControls={false}
                    pauseOnHover={false}
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="font-display font-normal text-xl text-stone-900 dark:text-white group-hover:text-[var(--accent)] transition-colors">
                        {room.name}
                      </h3>
                      {room.qty && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold shrink-0">
                          {room.qty} {room.qty === 1 ? "unit" : "units"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] text-stone-500 dark:text-stone-400 mb-2.5">
                      <span className="flex items-center gap-1">
                        <Bed className="h-3 w-3 text-[var(--accent)]" /> {room.bed || "King Bed"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-[var(--accent)]" /> {room.occupancy || "2 Guests"}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-2 mb-4 font-normal">
                      {room.blurb}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <span className="font-display text-xl text-[var(--accent)] font-semibold">
                        {naira(room.rate)}
                      </span>
                      <span className="text-[10px] uppercase font-condensed tracking-wider text-stone-500 dark:text-stone-400 ml-1">
                        / night
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-[var(--accent)] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      <span>Explore</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-4">
          <Link
            id="book-direct-cta-btn"
            href="/booking"
            className="btn-gold px-9 py-4 text-xs sm:text-sm font-medium inline-flex items-center gap-2 shadow-md hover:scale-105 transition-all"
          >
            <span id="book-direct-save-label">Book Direct &amp; Save</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/rooms"
            className="btn-outline-gold px-8 py-3.5 text-xs sm:text-sm font-medium inline-flex items-center gap-2 rounded-full hover:bg-[var(--accent)] hover:text-white transition-all"
          >
            <span>View All Categories</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  Direct Booking Privileges (NEW SECTION)                           */
/* ------------------------------------------------------------------ */
export const PrivilegesSection = memo(function PrivilegesSection() {
  const privileges = [
    {
      icon: Award,
      title: "Guaranteed Best Direct Rate",
      desc: "Lock in our lowest available rate with zero booking fees, instant room guarantee, and no third-party markups.",
      badge: "Best Rate",
    },
    {
      icon: Utensils,
      title: "Complimentary Daily Breakfast",
      desc: "Savor a complimentary gourmet Nigerian or continental breakfast prepared fresh each morning by our culinary team.",
      badge: "Included Daily",
    },
    {
      icon: Clock,
      title: "Flexible Early Arrival & Late Checkout",
      desc: "Enjoy extended check-in hours and complimentary late check-out on request, subject to availability.",
      badge: "Priority Access",
    },
    {
      icon: Zap,
      title: "Unbroken 24/7 Power Grid",
      desc: "Stay comfortable around the clock with dual industrial generators and dedicated on-site power regulation.",
      badge: "100% Guaranteed",
    },
    {
      icon: Wifi,
      title: "Commercial High-Speed Fiber",
      desc: "Blazing fast Wi-Fi throughout all rooms and suites, ideal for seamless video conferences, work, and streaming.",
      badge: "Fiber Connected",
    },
    {
      icon: ShieldCheck,
      title: "Direct Concierge & QR Bedside Care",
      desc: "Scan the in-room QR code for immediate room service dining or connect with our 24/7 WhatsApp concierge desk.",
      badge: "24/7 Support",
    },
  ];

  return (
    <section
      id="direct-booking-privileges-section"
      className="py-20 sm:py-28 bg-[#fdfbf7] dark:bg-[#1a1a1e] relative border-b border-[#ece6dd] dark:border-[#3a3a42] overflow-hidden"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 800px" }}
    >
      {/* Subtle luxury ambient accent glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container-x relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-6 bg-[var(--accent)]" />
            <span className="eyebrow text-[var(--accent)]">The Banky Advantage</span>
            <span className="h-px w-6 bg-[var(--accent)]" />
          </div>
          <h2 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-[#222] dark:text-[#f4efe6]">
            Direct Guest Privileges
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-600 dark:text-stone-300 font-normal leading-relaxed">
            Booking directly with Banky Hotel &amp; Suites gives you exclusive benefits and personalized hospitality from the moment you reserve.
          </p>
        </div>

        {/* 6 Privileges Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {privileges.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                id={`privilege-card-${idx + 1}`}
                className="group relative bg-white dark:bg-[#25252a] p-7 sm:p-8 rounded-2xl border border-[#ece6dd] dark:border-[#3a3a42] hover:border-[var(--accent)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="h-12 w-12 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-colors duration-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] uppercase font-condensed tracking-wider px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[var(--accent)] font-semibold border border-stone-200/60 dark:border-stone-700">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="font-display text-lg sm:text-xl text-stone-900 dark:text-white font-normal mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-normal leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center text-xs font-semibold text-[var(--accent)] group-hover:translate-x-1 transition-transform">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  <span>Exclusive Direct Guest Benefit</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* VIP Concierge Banner */}
        <div className="mt-12 sm:mt-16 bg-white dark:bg-[#25252a] rounded-2xl border border-[var(--accent)]/30 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-[11px] font-condensed uppercase tracking-widest text-[var(--accent)] font-bold block">
                Personalized Hospitality
              </span>
              <h3 className="font-display text-xl sm:text-2xl text-stone-900 dark:text-white font-normal">
                Planning an extended stay or special delegation?
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-xl">
                Our resident guest manager will assist with tailored suite allocations, airport transfers, and customized banqueting arrangements.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <a
                href={whatsappLink(bookingMessage({ room: "VIP Inquiry", rate: 0 }))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold px-6 py-3 text-xs sm:text-sm font-medium inline-flex items-center gap-2 shadow-sm"
              >
                <MessageSquare className="h-4 w-4" />
                <span>WhatsApp Guest Care</span>
              </a>
              <a
                href={`tel:${HOTEL.phone}`}
                className="btn-outline-gold px-5 py-3 text-xs sm:text-sm font-medium inline-flex items-center gap-2 rounded-full"
              >
                <Phone className="h-4 w-4" />
                <span>Call {HOTEL.phone}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  Facilities                                                         */
/* ------------------------------------------------------------------ */
export const FacilitiesSection = memo(function FacilitiesSection() {
  return (
    <section className="bg-[#f8f5f0] dark:bg-[#25252a] py-20 sm:py-28 border-y border-[#ece6dd] dark:border-[#3a3a42]" style={{ contentVisibility: "auto", containIntrinsicSize: "0 700px" }}>
      <div className="container-x">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-6 bg-[var(--accent)]" />
            <span className="eyebrow text-[var(--accent)]">Our Services</span>
            <span className="h-px w-6 bg-[var(--accent)]" />
          </div>
          <h2 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-[#222] dark:text-[#f4efe6]">Hotel Facilities</h2>
        </div>
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FACILITIES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                id={`facilities-card-${i + 1}`}
                className="border border-[#ece6dd] dark:border-[#3a3a42] bg-white dark:bg-[#28282d] p-8 transition-all duration-300 hover:border-[var(--accent)] hover:shadow-md rounded-2xl"
              >
                <div
                  id={`facilities-icon-${i + 1}`}
                  className="h-14 w-14 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] mb-6 rounded-xl"
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg sm:text-xl text-stone-800 dark:text-stone-100 font-normal mb-2">{f.title}</h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-normal leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  Experiences                                                        */
/* ------------------------------------------------------------------ */
export const ExperiencesSection = memo(function ExperiencesSection() {
  const [media, setMedia] = useState<HomepageMediaConfig>(DEFAULT_HOMEPAGE_MEDIA);

  useEffect(() => {
    const unsub = subscribeHomepageMedia((live) => {
      setMedia(live);
    });
    return () => unsub();
  }, []);

  const experiences = media.experiences?.length > 0 ? media.experiences : DEFAULT_HOMEPAGE_MEDIA.experiences;

  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-[#202023]" style={{ contentVisibility: "auto", containIntrinsicSize: "0 700px" }}>
      <div className="container-x">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-6 bg-[var(--accent)]" />
            <span className="eyebrow text-[var(--accent)]">Explore The Grounds</span>
            <span className="h-px w-6 bg-[var(--accent)]" />
          </div>
          <h2 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-[#222] dark:text-[#f4efe6]">Dining &amp; Banqueting</h2>
        </div>
        <div id="experiences-cards-grid" className="grid gap-6 sm:gap-8 lg:grid-cols-3 w-full lg:max-w-[80%] mx-auto">
          {experiences.map((c, i) => (
            <Link
              key={c.id || c.title}
              href={c.href || "/restaurant"}
              id={`experiences-card-${i + 1}`}
              className="group relative overflow-hidden rounded-2xl border border-[#ece6dd] dark:border-[#3a3a42] block shadow-md w-full h-[380px] sm:h-[440px]"
            >
              <Image
                id={`experiences-img-${i + 1}`}
                src={c.img}
                alt={c.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 768px) 80vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div
                id={`experiences-box-${i + 1}`}
                className="absolute inset-x-3 sm:inset-x-4 bottom-3 sm:bottom-4 border border-white/15 bg-[#0a2777] dark:bg-[#28282d]/95 p-4 sm:p-5 text-white rounded-xl"
              >
                <span className="font-condensed text-[0.7rem] sm:text-xs tracking-[0.24em] uppercase text-[var(--accent-light)] font-medium block mb-1">{c.tag}</span>
                <h3 id={`experiences-title-${i + 1}`} className="text-xl sm:text-2xl font-display text-white font-normal leading-snug">{c.title}</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-stone-100 font-normal line-clamp-2">{c.copy}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  Gallery                                                            */
/* ------------------------------------------------------------------ */
export const GallerySection = memo(function GallerySection() {
  const [media, setMedia] = useState<HomepageMediaConfig>(DEFAULT_HOMEPAGE_MEDIA);

  useEffect(() => {
    const unsub = subscribeHomepageMedia((live) => {
      setMedia(live);
    });
    return () => unsub();
  }, []);

  const activeGallery = media.gallery?.filter((g) => g.active !== false) || DEFAULT_HOMEPAGE_MEDIA.gallery;
  const displayItems = activeGallery.length > 0 ? activeGallery : DEFAULT_HOMEPAGE_MEDIA.gallery;

  return (
    <section className="py-20 sm:py-28 bg-[#f8f5f0] dark:bg-[#25252a] border-t border-[#ece6dd] dark:border-[#3a3a42]" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}>
      <div className="container-x">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="eyebrow text-[var(--accent)] block mb-2">Hotel Atmosphere</span>
          <h2 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-[#222] dark:text-[#f4efe6]">Photo Gallery</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {displayItems.map((item, i) => (
            <div key={item.id || i} className="overflow-hidden rounded-2xl border border-[#ece6dd] dark:border-[#3a3a42] aspect-[16/13.5] relative shadow-sm group">
              <Image src={item.url} alt={item.title || "Gallery"} fill className="object-cover hover:scale-105 transition-transform duration-700" sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw" />
              {item.title && (
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[11px] text-white font-medium block truncate drop-shadow">{item.title}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            id="view-gallery-btn"
            href="/gallery"
            className="btn-outline-gold px-8 py-3.5 text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all rounded-full"
          >
            <span>View Full Photo Gallery</span><ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */
export const TestimonialsSection = memo(function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28 bg-blue-900 dark:bg-[#202023] text-white" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}>
      <div className="container-x text-center">
        <span className="eyebrow text-[var(--accent-light)] block mb-2">What Our Guests Say</span>        <h2 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl mb-12 text-white">Testimonials</h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {[
            { name: "Chief Adeleke", text: "An outstanding luxury experience. The Luxury Suite exceeded every expectation — the butler service and attention to detail were world-class.", rating: 5 },
            { name: "Mrs. Oluwaseun", text: "We held our wedding reception at Banky Hall and it was absolutely perfect. The coordination team made our day seamless and magical.", rating: 5 },
            { name: "Dr. Adebayo", text: "Best hotel in Ado-Ekiti by far. The executive rooms are immaculate, the Wi-Fi is genuinely fast, and the restaurant serves the best jollof rice in town.", rating: 5 },
          ].map((t) => (
            <div key={t.name} className="p-8 border border-white/10 bg-white/5 dark:bg-[#28282d] text-left rounded-2xl">
              <div className="flex gap-1 text-[var(--accent-light)] mb-4">
                {Array.from({ length: t.rating }).map((_, i) => <span key={i}>★</span>)}
              </div>
              <p className="text-base text-stone-100 font-normal leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
              <span className="font-condensed text-xs uppercase tracking-[0.2em] text-[var(--accent-light)] font-medium">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
export const FaqSection = memo(function FaqSection() {
  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-[#202023]" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}>
      <div className="container-x max-w-3xl">
        <div className="text-center mb-14">
          <span className="eyebrow text-[var(--accent)] block mb-2">Questions &amp; Answers</span>
          <h2 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-[#222] dark:text-[#f4efe6]">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">            {FAQS.map((f, i) => (
              <details key={i} className="group border border-[#ece6dd] dark:border-[#3a3a42] bg-transparent dark:bg-[#28282d] p-6">                <summary className="font-display text-lg sm:text-[1.18rem] font-normal text-stone-800 dark:text-stone-100 cursor-pointer list-none flex items-center justify-between">
                {f.q}
                <span className="text-[var(--accent)] group-open:rotate-45 transition-transform text-xl font-condensed font-normal">+</span>
              </summary>                <p className="mt-3.5 text-sm sm:text-[0.9375rem] text-stone-600 dark:text-stone-300 font-normal leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  CTA                                                                */
/* ------------------------------------------------------------------ */
export const CtaSection = memo(function CtaSection() {
  return (
    <section className="py-20 sm:py-24 bg-blue-900 dark:bg-[#202023] text-white text-center border-t border-[var(--accent)]/30">
      <div className="container-x max-w-2xl mx-auto space-y-5">
        <span className="font-condensed text-xs uppercase tracking-[0.3em] font-medium text-[var(--accent-light)] block">Direct Reservation Privilege</span>
        <h2 className="text-3xl sm:text-5xl font-display font-normal text-white leading-tight">Book Your Next Stay in Ado-Ekiti</h2>
        <p className="text-sm sm:text-base text-stone-100 font-normal leading-relaxed max-w-lg mx-auto">
          Experience serene luxury with immediate room confirmation, dedicated concierge assistance, and guaranteed best rates when booking direct.
        </p>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link href="/booking" className="btn-gold px-9 py-4 text-xs sm:text-sm font-medium inline-flex items-center gap-2 shadow-lg">
            <span>Check Availability &amp; Book</span><ArrowRight className="h-4 w-4" />
          </Link>
          <a id="cta-phone-btn" href={`tel:${HOTEL.phone}`} className="btn-outline-white px-9 py-4 text-xs sm:text-sm font-medium inline-flex items-center gap-2 rounded-full">
            <PhoneSolidIcon className="h-4 w-4" /><span>+234 903 587 9708</span>
          </a>
        </div>
      </div>
    </section>
  );
});
