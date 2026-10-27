"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { HOTEL, naira, whatsappLink, bookingMessage, Room, ROOMS } from "@/lib/hotel";
import { subscribeRooms } from "@/lib/rooms-data";
import {
  ArrowRight,
  Check,
  Volume2,
  VolumeX,
  Phone,
  MessageSquare,
  Bed,
  Users,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";
import { RoomSchema } from "@/components/seo/StructuredData";
import { RoomImageSlider } from "@/components/common/RoomImageSlider";

export default function RoomDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [allRooms, setAllRooms] = useState<Room[]>(ROOMS);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Subscribe to live room data from Firestore (reflecting backend category edits & additions)
  useEffect(() => {
    const unsub = subscribeRooms((rooms) => {
      setAllRooms(rooms);
    });
    return () => unsub();
  }, []);

  // Find active room by slug (with aliases for presidential & signature suite)
  const room =
    allRooms.find(
      (r) =>
        r.slug === slug ||
        (slug === "signature-suite" && r.slug === "luxury-suite") ||
        (slug === "presidential-suite" && r.slug === "luxury")
    ) ||
    allRooms[0];

  const defaultRoomImages = room.images && room.images.length > 0 ? room.images : [room.image];
  const roomImages = defaultRoomImages;

  // Video source
  const videoSrc = room.video || `/videos/${room.slug}-room.mp4`;

  // Autoplay video muted smoothly on mount
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.play().catch(() => {});
    }
  }, [videoSrc]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Other accommodations to explore
  const otherRooms = allRooms.filter((r) => r.slug !== room.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-[#202023] text-stone-900 dark:text-stone-100">
      <RoomSchema slug={room.slug} />

      {/* ─────────────────────────────────────────────────────────────
          1. DEDICATED SEPARATE VIDEO / IMAGE HEADER SECTION (CLEAN DIV)
          Pure cinematic visual tour without cluttered text or buttons
         ───────────────────────────────────────────────────────────── */}
      <div
        id="room-video-header-section"
        className="relative w-full h-[45vh] sm:h-[55vh] md:h-[62vh] min-h-[340px] max-h-[660px] bg-stone-950 overflow-hidden"
      >
        {/* Baseline Room Photo Backdrop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={room.image}
          alt={`${room.name} tour banner`}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        />

        {/* Ambient Video Header Tour */}
        {videoSrc && (
          <video
            ref={videoRef}
            key={videoSrc}
            src={videoSrc}
            poster={room.image}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="auto"
            onLoadedData={() => setVideoLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
              videoLoaded ? "opacity-90" : "opacity-0"
            }`}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}

        {/* Cinematic ambient dark film gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

        {/* Discreet audio toggle placed cleanly in bottom-right corner */}
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute room video tour" : "Mute room video tour"}
            title={isMuted ? "Unmute room sound" : "Mute sound"}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white hover:text-[#ffbf00] backdrop-blur-md border border-white/20 transition-all shadow-lg cursor-pointer"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SEPARATE ROOM CONTENT SECTION (CLEAN & LESS CLUTTERED)
         ───────────────────────────────────────────────────────────── */}
      <main className="container-x py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-4">
          <Link href="/" className="hover:text-stone-900 dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
          <Link href="/rooms" className="hover:text-stone-900 dark:hover:text-white transition-colors">
            Rooms &amp; Suites
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
          <span className="text-[#ffbf00] font-semibold">{room.name}</span>
        </nav>

        {/* Room Header Title & Nightly Rate Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800 mb-8">
          <div>
            <span className="text-[11px] font-condensed uppercase tracking-widest text-[#ffbf00] font-bold block mb-1">
              Banky Hotel &amp; Suites • Premium Accommodation
            </span>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-normal text-stone-900 dark:text-white">
              {room.name}
            </h1>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl sm:text-4xl font-normal text-[#ffbf00]">
              {naira(room.rate)}
            </span>
            <span className="text-xs uppercase font-condensed tracking-wider text-stone-500 dark:text-stone-400">
              / night
            </span>
          </div>
        </div>

        {/* ── Two-Column Layout: Visual Slider & Details ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column (7 cols): Single Image Slider & Story */}
          <div className="lg:col-span-7 space-y-8">
            {/* ── One Slider Image Box (No buttons shown to guest as requested) ── */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 shadow-md bg-stone-100 dark:bg-stone-900">
              <RoomImageSlider
                images={roomImages}
                alt={room.name}
                aspectClass="aspect-[16/10]"
                autoSlideInterval={5000}
                showControls={false}
                pauseOnHover={false}
                priority={true}
              />
            </div>

            {/* Room Description & Blurb */}
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-normal text-stone-900 dark:text-white">
                About The {room.name}
              </h2>
              <p className="text-base leading-relaxed text-stone-600 dark:text-stone-300 font-normal">
                {room.blurb}
              </p>
            </div>

            {/* Room Specifications Quick Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-stone-50 dark:bg-[#28282d] border border-stone-200 dark:border-stone-800 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#ffbf00]/15 text-[#ffbf00]">
                  <Bed className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-stone-500 dark:text-stone-400 block text-[10px] uppercase tracking-wider">Bedding</span>
                  <span className="font-semibold text-stone-900 dark:text-white">{room.bed || "King Bed"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#ffbf00]/15 text-[#ffbf00]">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-stone-500 dark:text-stone-400 block text-[10px] uppercase tracking-wider">Capacity</span>
                  <span className="font-semibold text-stone-900 dark:text-white">{room.occupancy || "2 Guests"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#ffbf00]/15 text-[#ffbf00]">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-stone-500 dark:text-stone-400 block text-[10px] uppercase tracking-wider">Dining</span>
                  <span className="font-semibold text-stone-900 dark:text-white">24/7 QR Room Service</span>
                </div>
              </div>
            </div>

            {/* Room Features & Amenities */}
            <div className="space-y-3">
              <h3 className="font-display text-xl font-normal text-stone-900 dark:text-white">
                Room Features &amp; Amenities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {room.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 text-xs sm:text-sm text-stone-700 dark:text-stone-200"
                  >
                    <Check className="h-4 w-4 text-[#ffbf00] shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Sticky Reservation & Booking Box */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#28282d] p-6 sm:p-8 shadow-md space-y-6">
              <div className="text-center pb-4 border-b border-stone-200 dark:border-stone-800">
                <span className="text-[11px] font-condensed uppercase tracking-widest text-stone-500 dark:text-stone-400 block mb-1 font-semibold">
                  Direct Reservation
                </span>
                <div className="font-display text-4xl font-normal text-[#ffbf00]">
                  {naira(room.rate)}
                </div>
                <span className="text-xs font-condensed uppercase tracking-wider text-stone-500 dark:text-stone-400 block mt-1">
                  Per Night • Best Rate Guaranteed
                </span>
              </div>

              {/* Check-in / Check-out Times */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <div>
                  <span className="text-stone-500 dark:text-stone-400 block text-[10px] uppercase tracking-wider">
                    Check-in
                  </span>
                  <span className="font-bold text-stone-900 dark:text-white">{HOTEL.checkIn}</span>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-stone-400 block text-[10px] uppercase tracking-wider">
                    Check-out
                  </span>
                  <span className="font-bold text-stone-900 dark:text-white">{HOTEL.checkOut}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Link
                  href={`/booking?room=${room.slug}`}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#ffbf00] hover:bg-[#e09e00] text-white font-semibold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>Book This Room</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href={whatsappLink(bookingMessage({ room: room.name, rate: room.rate }))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl border-2 border-[#ffbf00] text-[#ffbf00] hover:bg-[#ffbf00] hover:text-white font-semibold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>WhatsApp Inquiry</span>
                </a>

                <a
                  href={`tel:${HOTEL.phone}`}
                  className="w-full py-2.5 text-xs text-stone-600 dark:text-stone-300 hover:text-[#ffbf00] flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-[#ffbf00]" />
                  <span>Call to Reserve: {HOTEL.phone}</span>
                </a>
              </div>

              {/* Trust badges */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2 text-[11px] text-stone-500 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Instant confirmation &amp; front-desk settlement available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#ffbf00] shrink-0" />
                  <span>Free high-speed Wi-Fi &amp; complimentary breakfast</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. EXPLORE OTHER ROOM CATEGORIES
         ───────────────────────────────────────────────────────────── */}
      {otherRooms.length > 0 && (
        <section className="py-14 sm:py-20 bg-stone-50 dark:bg-[#1a1a1d] border-t border-stone-200 dark:border-stone-800">
          <div className="container-x">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
              <div>
                <span className="text-[11px] font-condensed uppercase tracking-widest text-[#ffbf00] font-bold block mb-1">
                  More Accommodations
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-normal text-stone-900 dark:text-white">
                  Explore Other Room Categories
                </h3>
              </div>
              <Link
                href="/rooms"
                className="text-xs font-semibold text-[#ffbf00] hover:underline inline-flex items-center gap-1"
              >
                <span>View All Accommodations</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {otherRooms.map((other) => (
                <Link
                  key={other.slug}
                  href={`/rooms/${other.slug}`}
                  className="group block rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#28282d] hover:border-[#ffbf00] shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <RoomImageSlider
                    images={other.images && other.images.length > 0 ? other.images : [other.image]}
                    alt={other.name}
                    aspectClass="aspect-[16/10]"
                    autoSlideInterval={6000}
                    showControls={false}
                    pauseOnHover={false}
                  />
                  <div className="p-5">
                    <h4 className="font-display text-xl font-normal text-stone-900 dark:text-white mb-1">
                      {other.name}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mb-3">
                      {other.blurb}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
                      <span className="font-display text-lg font-medium text-[#ffbf00]">
                        {naira(other.rate)}{" "}
                        <span className="text-[10px] font-sans text-stone-500">/ night</span>
                      </span>
                      <span className="text-xs font-semibold text-[#ffbf00] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
