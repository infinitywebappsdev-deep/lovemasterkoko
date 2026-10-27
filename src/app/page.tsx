"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  Video,
  Upload,
  CheckCircle2,
  Sparkles,
  Smartphone,
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
  saveHomepageMedia,
} from "@/lib/homepage-media";
import { HomeVideoHeaderModal } from "@/components/home/HomeVideoHeaderModal";

/* ------------------------------------------------------------------ */
/*  Hero Video Header Component                                       */
/* ------------------------------------------------------------------ */
interface HeroVideoHeaderProps {
  config: HomepageMediaConfig;
  onOpenModal: () => void;
  onDirectDeviceUpload: (file: File) => void;
  isUploadingDirect: boolean;
}

function HeroVideoHeader({
  config,
  onOpenModal,
  onDirectDeviceUpload,
  isUploadingDirect,
}: HeroVideoHeaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Drag and drop video directly onto hero header
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name))) {
      onDirectDeviceUpload(file);
    }
  };

  return (
    <div
      id="video-header-container"
      data-video-header="true"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="video-header-container absolute inset-0 overflow-hidden bg-black"
    >
      {/* Baseline Hero Image Backdrop — renders immediately as the first visual on the page */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero.posterImage || "/images/exterior-night.jpg"}
        alt="Banky Hotel & Suites Exterior"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
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

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm border-2 border-dashed border-amber-400 p-6 text-center animate-in fade-in duration-200">
          <div className="h-16 w-16 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center mb-3">
            <Upload className="h-8 w-8 animate-bounce" />
          </div>
          <h3 className="text-xl font-medium text-white">Drop Video to Replace Header</h3>
          <p className="text-sm text-stone-300 mt-1 max-w-sm">
            Release your video file (.mp4, .mov, .webm) here to set it directly as the live homepage header.
          </p>
        </div>
      )}

      {/* Direct Device Uploading Indicator */}
      {isUploadingDirect && (
        <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-stone-900/90 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-2 shadow-2xl backdrop-blur-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
          <span>Uploading and optimizing header video from your device...</span>
        </div>
      )}

      {/* Hero Header Controls (Right side) */}
      <div className="absolute bottom-4 right-4 sm:right-6 z-30 flex items-center gap-2">
        {/* Hidden File Input for Direct Device Pick */}
        <input
          ref={quickFileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onDirectDeviceUpload(f);
          }}
          className="hidden"
        />

        {/* Change Video Button (Opens Modal or Quick Picker) */}
        <button
          type="button"
          onClick={onOpenModal}
          className="rounded-full bg-black/70 hover:bg-black/90 border border-amber-400/40 hover:border-amber-400 text-stone-100 hover:text-amber-300 px-3.5 py-2 text-xs font-medium flex items-center gap-2 backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-lg group cursor-pointer"
          title="Change Homepage Header Video"
        >
          <Video className="h-3.5 w-3.5 text-amber-400 group-hover:rotate-6 transition-transform" />
          <span className="hidden sm:inline">Change Video</span>
          <span className="sm:hidden">Video</span>
          <Sparkles className="h-3 w-3 text-amber-400/80" />
        </button>

        {/* Direct Device Pick Shortcut Button (Opens Native File Picker Immediately) */}
        <button
          type="button"
          onClick={() => quickFileInputRef.current?.click()}
          className="rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 px-3 py-2 text-xs font-medium flex items-center gap-1.5 backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
          title="Pick video file directly from this device"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Upload from Device</span>
        </button>

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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isUploadingDirect, setIsUploadingDirect] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeHomepageMedia((live) => {
      setMediaConfig(live);
    });
    return () => unsub();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Direct Device Upload handler triggered from quick button or drag-and-drop
  const handleDirectDeviceUpload = async (file: File) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["mp4", "mov", "webm", "m4v"];
    if (ext && !validExtensions.includes(ext) && !file.type.startsWith("video/")) {
      showToast("Please choose a valid video file (.mp4, .mov, .webm, or .m4v).");
      return;
    }

    setIsUploadingDirect(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("section", "hero-video");
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch("/api/admin/home-media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.ok || !data.assets || data.assets.length === 0) {
        throw new Error(data.error || "Failed to upload video from device.");
      }

      const uploadedAsset = data.assets[0];

      const updatedConfig: HomepageMediaConfig = {
        ...mediaConfig,
        hero: {
          ...mediaConfig.hero,
          videoUrl: uploadedAsset.url,
          isVideoEnabled: true,
          ...(uploadedAsset.posterUrl ? { posterImage: uploadedAsset.posterUrl } : {}),
        },
      };

      await saveHomepageMedia(updatedConfig);
      setMediaConfig(updatedConfig);
      showToast("Header video updated directly from your device!");
    } catch (err: any) {
      console.error("Direct upload error:", err);
      showToast(err.message || "Failed to upload video.");
    } finally {
      setIsUploadingDirect(false);
    }
  };

  const hero = mediaConfig.hero || DEFAULT_HOMEPAGE_MEDIA.hero;

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm px-4 py-3 rounded-xl bg-stone-900 border border-amber-400/40 text-stone-100 text-xs shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HERO — critical, inlined */}
      <section className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col justify-center lg:justify-end">
        <HeroVideoHeader
          config={mediaConfig}
          onOpenModal={() => setIsVideoModalOpen(true)}
          onDirectDeviceUpload={handleDirectDeviceUpload}
          isUploadingDirect={isUploadingDirect}
        />
        <div className="container-x relative z-30 flex flex-col justify-center lg:justify-end pt-20 sm:pt-24 lg:pt-28 pb-8 sm:pb-12 my-auto lg:my-0">
          <div className="max-w-3xl pb-0 lg:pb-8 mx-auto lg:mx-0 text-center lg:text-left">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-normal text-white leading-[1.1] text-center lg:text-left">
              {hero.headline || "Banky Hotel & Suites"}
            </h1>
            <p className="mt-3 sm:mt-5 max-w-xl mx-auto lg:mx-0 text-[14px] sm:text-base leading-relaxed text-stone-100 font-normal text-center lg:text-left">
              {hero.tagline || "Quiet luxury in the heart of Ado-Ekiti"}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
              <Link
                href={hero.ctaLink || "/booking"}
                className="btn-gold px-8 py-4 text-xs sm:text-sm inline-flex items-center gap-2.5 shadow-lg shadow-[var(--accent)]/30 font-medium"
              >
                <span>{hero.ctaText || "Book Now"}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Home Video Header Modal */}
      <HomeVideoHeaderModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        config={mediaConfig}
        onConfigChange={(updated) => setMediaConfig(updated)}
        onSuccessToast={showToast}
      />

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
