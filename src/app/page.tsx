"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Loader2, Pause, Play, Star, Volume2, VolumeX } from "lucide-react";
import {
  DEFAULT_HOMEPAGE_MEDIA,
  type HomepageMediaConfig,
  subscribeHomepageMedia,
} from "@/lib/homepage-media";
import { BookingSearchBar } from "@/components/booking/BookingSearchBar";
import { whatsappLink, bookingMessage } from "@/lib/hotel";

const AboutSection = dynamic(() => import("@/components/home/sections").then((m) => m.AboutSection), {
  loading: () => <div className="h-96" />,
});
const RoomsSection = dynamic(() => import("@/components/home/sections").then((m) => m.RoomsSection), {
  loading: () => <div className="h-96" />,
});
const PrivilegesSection = dynamic(
  () => import("@/components/home/sections").then((m) => m.PrivilegesSection),
  { loading: () => <div className="h-40" /> },
);
const FacilitiesSection = dynamic(
  () => import("@/components/home/sections").then((m) => m.FacilitiesSection),
  { loading: () => <div className="h-96" /> },
);
const ExperiencesSection = dynamic(
  () => import("@/components/home/sections").then((m) => m.ExperiencesSection),
  { loading: () => <div className="h-96" /> },
);
const GallerySection = dynamic(
  () => import("@/components/home/sections").then((m) => m.GallerySection),
  { loading: () => <div className="h-96" /> },
);
const TestimonialsSection = dynamic(
  () => import("@/components/home/sections").then((m) => m.TestimonialsSection),
  { loading: () => <div className="h-96" /> },
);
const FaqSection = dynamic(() => import("@/components/home/sections").then((m) => m.FaqSection), {
  loading: () => <div className="h-96" />,
});
const CtaSection = dynamic(() => import("@/components/home/sections").then((m) => m.CtaSection), {
  loading: () => <div className="h-64" />,
});

function HeroBackdrop({ config }: { config: HomepageMediaConfig }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hero = config.hero || DEFAULT_HOMEPAGE_MEDIA.hero;
  const videoActive = hero.isVideoEnabled !== false;
  const src = hero.videoUrl || "/videos/hero.mp4";
  const poster = hero.posterImage || "/images/exterior-night.jpg";

  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoActive) return;
    video.muted = true;
    const attempt = video.play();
    attempt?.then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [src, videoActive]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <>
      <Image
        src={poster}
        alt="Banky Hotel & Suites"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {videoActive && (
        <video
          ref={videoRef}
          key={src}
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setLoaded(true)}
          onCanPlay={() => setLoaded(true)}
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/85" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent,rgba(0,0,0,0.45))]" />

      {videoActive && (
        <div className="absolute bottom-5 right-4 z-20 flex gap-2 sm:right-6">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause background video" : "Play background video"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55"
          >
            {!loaded ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : playing ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute background video" : "Mute background video"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [media, setMedia] = useState<HomepageMediaConfig>(DEFAULT_HOMEPAGE_MEDIA);

  useEffect(() => subscribeHomepageMedia(setMedia), []);

  const hero = media.hero || DEFAULT_HOMEPAGE_MEDIA.hero;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <HeroBackdrop config={media} />

        <div className="container-x relative z-10 pb-8 pt-28 sm:pb-12 sm:pt-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[#e7c08a]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
              </span>
              <span className="text-[0.66rem] font-medium uppercase tracking-[0.24em] text-white/60">
                Ado-Ekiti · Ekiti State
              </span>
            </div>

            <h1 className="mt-5 font-display text-[2.9rem] leading-[1.02] text-white sm:text-6xl lg:text-[4.6rem]">
              {hero.headline || "Quiet luxury in the heart of Ado-Ekiti"}
            </h1>
            <p className="mt-5 max-w-lg text-[0.95rem] leading-relaxed text-white/70 sm:text-base">
              {hero.tagline ||
                "Twenty-eight rooms and suites, a garden bar, and a kitchen that cooks Ekiti produce plainly well."}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href={hero.ctaLink || "/booking"} className="btn-gold">
                {hero.ctaText || "Book a stay"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={whatsappLink(bookingMessage({}))}
                target="_blank"
                rel="noreferrer"
                className="btn-outline-white"
              >
                WhatsApp the front desk
              </a>
            </div>
          </div>

          <div className="mt-10 sm:mt-14">
            <BookingSearchBar variant="hero" />
          </div>
        </div>
      </section>

      <AboutSection />
      <RoomsSection />
      <PrivilegesSection />
      <FacilitiesSection />
      <ExperiencesSection />
      <GallerySection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
