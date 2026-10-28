"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Dynamic imports — below-fold sections load only when scrolled to    */
/* ------------------------------------------------------------------ */
const AboutSection = dynamic(() => import("@/components/home/sections").then((m) => m.AboutSection), { loading: () => <div className="h-96" /> });
const RoomsSection = dynamic(() => import("@/components/home/sections").then((m) => m.RoomsSection), { loading: () => <div className="h-96" /> });
const PrivilegesSection = dynamic(() => import("@/components/home/sections").then((m) => m.PrivilegesSection), { loading: () => <div className="h-80" /> });
const FacilitiesSection = dynamic(() => import("@/components/home/sections").then((m) => m.FacilitiesSection), { loading: () => <div className="h-96" /> });
const ExperiencesSection = dynamic(() => import("@/components/home/sections").then((m) => m.ExperiencesSection), { loading: () => <div className="h-96" /> });
const GallerySection = dynamic(() => import("@/components/home/sections").then((m) => m.GallerySection), { loading: () => <div className="h-96" /> });
const TestimonialsSection = dynamic(() => import("@/components/home/sections").then((m) => m.TestimonialsSection), { loading: () => <div className="h-96" /> });
const FaqSection = dynamic(() => import("@/components/home/sections").then((m) => m.FaqSection), { loading: () => <div className="h-96" /> });
const CtaSection = dynamic(() => import("@/components/home/sections").then((m) => m.CtaSection), { loading: () => <div className="h-64" /> });

import {
  DEFAULT_HOMEPAGE_MEDIA,
  HomepageMediaConfig,
  subscribeHomepageMedia,
} from "@/lib/homepage-media";
import { whatsappLink, bookingMessage } from "@/lib/hotel";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

/* ------------------------------------------------------------------ */
/*  Hero Video Header Component                                       */
/* ------------------------------------------------------------------ */
interface HeroVideoHeaderProps {
  config: HomepageMediaConfig;
}

function HeroVideoHeader({ config }: HeroVideoHeaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const hero = config.hero || DEFAULT_HOMEPAGE_MEDIA.hero;
  const isVideoActive = hero.isVideoEnabled !== false;
  const activeVideoSrc = hero.videoUrl || "/videos/hero.mp4";

  // When activeVideoSrc changes, reload and play
  useEffect(() => {
    if (videoRef.current && isVideoActive) {
      videoRef.current.muted = true;
      videoRef.current.src = activeVideoSrc;
      videoRef.current.load();

      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setVideoLoaded(true);
          })
          .catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          });
      }
    }
  }, [activeVideoSrc, isVideoActive]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      const p = video.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch((err) => {
          console.warn("Home hero play retry with mute:", err);
          video.muted = true;
          setIsMuted(true);
          const p2 = video.play();
          if (p2 !== undefined) {
            p2.then(() => setIsPlaying(true)).catch(() => {});
          }
        });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div
      id="video-header-container"
      data-video-header="true"
      className="video-header-container absolute inset-0 overflow-hidden bg-black"
    >
      {/* Baseline Hero Image Backdrop — preloaded as the LCP element, visible before the video decodes */}
      <Image
        src={hero.posterImage || "/images/exterior-night.jpg"}
        alt="Banky Hotel & Suites Exterior"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center pointer-events-none select-none"
      />

      {/* Video Element */}
      {isVideoActive && (
        <video
          ref={videoRef}
          key={activeVideoSrc}
          src={activeVideoSrc}
          poster={hero.posterImage || "/images/exterior-night.jpg"}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadStart={() => setVideoLoaded(false)}
          onWaiting={() => setVideoLoaded(false)}
          onLoadedData={() => setVideoLoaded(true)}
          onCanPlay={() => setVideoLoaded(true)}
          onPlaying={() => {
            setVideoLoaded(true);
            setIsPlaying(true);
          }}
          className={`w-full h-full object-cover object-center select-none transition-opacity duration-700 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-black/25 pointer-events-none" />

      {/* Hero Header Controls (Right side) */}
      <div className="absolute bottom-4 right-4 sm:right-6 z-30 flex items-center gap-2">
        {/* Video Playback Toggle */}
        {isVideoActive && (
          <button
            id="video-playback-toggle"
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
            aria-label={!videoLoaded ? "Video loading..." : isPlaying ? "Pause video" : "Play video"}
            title={!videoLoaded ? "Video buffering..." : isPlaying ? "Pause video" : "Play video"}
          >
            {!videoLoaded ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
            ) : isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-white" />
            )}
          </button>
        )}

        {/* Audio Toggle */}
        {isVideoActive && (
          <button
            id="video-audio-toggle"
            type="button"
            onClick={toggleMute}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            title={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Homepage Component                                           */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [mediaConfig, setMediaConfig] = useState<HomepageMediaConfig>(DEFAULT_HOMEPAGE_MEDIA);

  useEffect(() => {
    const unsub = subscribeHomepageMedia((live) => {
      setMediaConfig(live);
    });
    return () => unsub();
  }, []);

  const hero = mediaConfig.hero || DEFAULT_HOMEPAGE_MEDIA.hero;

  return (
    <>
      {/* HERO — critical, inlined */}
      <section className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col justify-center lg:justify-end">
        <HeroVideoHeader config={mediaConfig} />
        <div className="container-x relative z-30 flex flex-col justify-center lg:justify-end pt-20 sm:pt-24 lg:pt-28 pb-8 sm:pb-12 my-auto lg:my-0">
          <div className="max-w-3xl pb-0 lg:pb-8 mx-auto lg:mx-0 text-center lg:text-left">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-normal text-white leading-[1.1] text-center lg:text-left">
              {hero.headline || "Banky Hotel & Suites"}
            </h1>
            <p className="mt-3 sm:mt-5 max-w-xl mx-auto lg:mx-0 text-[14px] sm:text-base leading-relaxed text-stone-100 font-normal text-center lg:text-left">
              {hero.tagline || "Quiet luxury in the heart of Ado-Ekiti"}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
              {/* Primary channel: WhatsApp */}
              <a
                href={whatsappLink(bookingMessage({}))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold px-8 py-4 text-xs sm:text-sm inline-flex items-center gap-2.5 shadow-lg shadow-[var(--accent)]/30 font-medium"
              >
                <WhatsAppIcon className="h-4 w-4" />
                <span>Book on WhatsApp</span>
              </a>

              {/* Alternative: full online booking engine */}
              <Link
                href={hero.ctaLink || "/booking"}
                className="px-8 py-4 text-xs sm:text-sm inline-flex items-center gap-2.5 rounded-xl border border-white/40 text-white hover:bg-white/10 hover:border-white/70 transition-colors font-medium backdrop-blur-sm"
              >
                <span>{hero.ctaText || "Book Online"}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BELOW-FOLD — dynamically split into separate chunks */}
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
