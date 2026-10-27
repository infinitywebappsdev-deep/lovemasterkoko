import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

export interface HeroMediaConfig {
  videoUrl: string;
  videoSecondaryUrl?: string;
  posterImage: string;
  isVideoEnabled: boolean;
  slideshowImages: string[];
  headline: string;
  tagline: string;
  ctaText: string;
  ctaLink: string;
}

export interface AboutMediaConfig {
  image1: string;
  image2: string;
  image1Alt: string;
  image2Alt: string;
  heading: string;
  description1: string;
  description2: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  title: string;
  category: string;
  active: boolean;
  order: number;
}

export interface ExperienceItem {
  id: string;
  img: string;
  title: string;
  tag: string;
  copy: string;
  href: string;
}

export interface FeaturedVideoItem {
  id: string;
  title: string;
  url: string;
  poster?: string;
  description?: string;
  active: boolean;
}

export interface HomepageMediaConfig {
  hero: HeroMediaConfig;
  about: AboutMediaConfig;
  gallery: GalleryItem[];
  experiences: ExperienceItem[];
  featuredVideos?: FeaturedVideoItem[];
  updatedAt: string;
}

export const DEFAULT_HOMEPAGE_MEDIA: HomepageMediaConfig = {
  hero: {
    videoUrl: "/videos/hero.mp4",
    videoSecondaryUrl: "/videos/executive-room.mp4",
    posterImage: "/images/exterior-night.jpg",
    isVideoEnabled: true,
    slideshowImages: [
      "/images/exterior-night.jpg",
      "/images/Hotel Lobby.jpg",
      "/images/Presidential.jpg",
      "/images/OpenBar Garden.jpg",
    ],
    headline: "Banky Hotel & Suites",
    tagline: "Quiet luxury in the heart of Ado-Ekiti",
    ctaText: "Book Now",
    ctaLink: "/booking",
  },
  about: {
    image1: "/images/hotel-front-right.jpg",
    image2: "/images/OpenBar Garden.jpg",
    image1Alt: "Hotel exterior",
    image2Alt: "Garden bar",
    heading: "Enjoy a Calm Haven in Ado-Ekiti",
    description1:
      "Step into a story century in the making. At Banky, timeless architecture meets modern indulgence, where heritage charm and heartfelt warmth welcome you like family. Savor tradition-inspired dining beneath chandeliers that have witnessed generations, unwind in a wellness sanctuary rooted in old-world calm, and rest in rooms where history and comfort meet in perfect harmony. This isn't just a stay, it's a passage through time, wrapped in warmth, elegance, and unforgettable moments",
    description2:
      "Our 28 bespoke rooms and suites feature quiet climate control, unbroken high-speed Wi-Fi, and 24/7 dedicated generator power grid.",
  },
  gallery: [
    { id: "gal-1", url: "/images/Hotel Lobby.jpg", title: "Grand Reception & Lounge", category: "Lobby", active: true, order: 1 },
    { id: "gal-2", url: "/images/Restaurant 2.jpg", title: "Fine Dining Restaurant", category: "Dining", active: true, order: 2 },
    { id: "gal-3", url: "/images/lounge.jpg", title: "Executive VIP Lounge", category: "Lounge", active: true, order: 3 },
    { id: "gal-4", url: "/images/corridor-hallway.jpg", title: "Serene Room Corridors", category: "Interior", active: true, order: 4 },
    { id: "gal-5", url: "/images/dining.jpg", title: "Gourmet Culinary Service", category: "Dining", active: true, order: 5 },
    { id: "gal-6", url: "/images/BankyHall.jpg", title: "Banky Banqueting Hall", category: "Events", active: true, order: 6 },
    { id: "gal-7", url: "/images/Reception.jpg", title: "24/7 Front Desk Concierge", category: "Lobby", active: true, order: 7 },
    { id: "gal-8", url: "/images/Presidential.jpg", title: "Presidential Luxury Suite", category: "Rooms", active: true, order: 8 },
  ],
  experiences: [
    {
      id: "exp-1",
      img: "/images/dining.jpg",
      title: "A Feast Steeped in Tradition",
      tag: "The Restaurant",
      copy: "Nigerian classics and continental plates, served breakfast through dinner.",
      href: "/restaurant",
    },
    {
      id: "exp-2",
      img: "/images/OpenBar Garden.jpg",
      title: "Open-Air Bar & Lounge",
      tag: "The Bar",
      copy: "Handcrafted cocktails, single malts, and relaxed evenings under the stars.",
      href: "/bar",
    },
    {
      id: "exp-3",
      img: "/images/BankyHall.jpg",
      title: "Banky Hall",
      tag: "Banqueting & Events",
      copy: "Lustrous hall with seating for up to 300 guests for weddings and conferences.",
      href: "/events",
    },
  ],
  featuredVideos: [
    {
      id: "vid-1",
      title: "Homepage Hero Tour",
      url: "/videos/hero.mp4",
      poster: "/images/exterior-night.jpg",
      description: "Main atmospheric loop showing the hotel exterior and grounds.",
      active: true,
    },
    {
      id: "vid-2",
      title: "Presidential & Executive Suites",
      url: "/videos/presidential-suite.mp4",
      poster: "/images/Presidential.jpg",
      description: "Walkthrough of our signature luxury accommodation.",
      active: true,
    },
    {
      id: "vid-3",
      title: "Deluxe Comfort Showcase",
      url: "/videos/deluxe.mp4",
      poster: "/images/deluxe.jpg",
      description: "Teaser video highlighting modern amenities and cozy ambiance.",
      active: true,
    },
  ],
  updatedAt: new Date(0).toISOString(),
};

const LOCAL_STORAGE_KEY = "banky_homepage_media_cache";
const SETTINGS_COLLECTION = "site_settings";
const SETTINGS_DOC_ID = "homepage_media";

/**
 * Normalizes homepage media config ensuring all properties are present and valid
 */
export function normalizeHomepageMedia(data: any): HomepageMediaConfig {
  if (!data || typeof data !== "object") {
    return { ...DEFAULT_HOMEPAGE_MEDIA };
  }

  const hero: HeroMediaConfig = {
    videoUrl: typeof data.hero?.videoUrl === "string" && data.hero.videoUrl ? data.hero.videoUrl : DEFAULT_HOMEPAGE_MEDIA.hero.videoUrl,
    videoSecondaryUrl: typeof data.hero?.videoSecondaryUrl === "string" ? data.hero.videoSecondaryUrl : DEFAULT_HOMEPAGE_MEDIA.hero.videoSecondaryUrl,
    posterImage: typeof data.hero?.posterImage === "string" && data.hero.posterImage ? data.hero.posterImage : DEFAULT_HOMEPAGE_MEDIA.hero.posterImage,
    isVideoEnabled: typeof data.hero?.isVideoEnabled === "boolean" ? data.hero.isVideoEnabled : true,
    slideshowImages: Array.isArray(data.hero?.slideshowImages) && data.hero.slideshowImages.length > 0 ? data.hero.slideshowImages : DEFAULT_HOMEPAGE_MEDIA.hero.slideshowImages,
    headline: typeof data.hero?.headline === "string" ? data.hero.headline : DEFAULT_HOMEPAGE_MEDIA.hero.headline,
    tagline: typeof data.hero?.tagline === "string" ? data.hero.tagline : DEFAULT_HOMEPAGE_MEDIA.hero.tagline,
    ctaText: typeof data.hero?.ctaText === "string" ? data.hero.ctaText : DEFAULT_HOMEPAGE_MEDIA.hero.ctaText,
    ctaLink: typeof data.hero?.ctaLink === "string" ? data.hero.ctaLink : DEFAULT_HOMEPAGE_MEDIA.hero.ctaLink,
  };

  const about: AboutMediaConfig = {
    image1: typeof data.about?.image1 === "string" && data.about.image1 ? data.about.image1 : DEFAULT_HOMEPAGE_MEDIA.about.image1,
    image2: typeof data.about?.image2 === "string" && data.about.image2 ? data.about.image2 : DEFAULT_HOMEPAGE_MEDIA.about.image2,
    image1Alt: typeof data.about?.image1Alt === "string" ? data.about.image1Alt : DEFAULT_HOMEPAGE_MEDIA.about.image1Alt,
    image2Alt: typeof data.about?.image2Alt === "string" ? data.about.image2Alt : DEFAULT_HOMEPAGE_MEDIA.about.image2Alt,
    heading: typeof data.about?.heading === "string" ? data.about.heading : DEFAULT_HOMEPAGE_MEDIA.about.heading,
    description1: typeof data.about?.description1 === "string" ? data.about.description1 : DEFAULT_HOMEPAGE_MEDIA.about.description1,
    description2: typeof data.about?.description2 === "string" ? data.about.description2 : DEFAULT_HOMEPAGE_MEDIA.about.description2,
  };

  const gallery: GalleryItem[] = Array.isArray(data.gallery) && data.gallery.length > 0
    ? data.gallery.map((g: any, idx: number) => ({
        id: g.id || `gal-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
        url: typeof g.url === "string" ? g.url : "/images/Hotel Lobby.jpg",
        title: typeof g.title === "string" ? g.title : `Hotel Photo ${idx + 1}`,
        category: typeof g.category === "string" ? g.category : "General",
        active: typeof g.active === "boolean" ? g.active : true,
        order: typeof g.order === "number" ? g.order : idx + 1,
      }))
    : DEFAULT_HOMEPAGE_MEDIA.gallery;

  const experiences: ExperienceItem[] = Array.isArray(data.experiences) && data.experiences.length > 0
    ? data.experiences.map((e: any, idx: number) => ({
        id: e.id || `exp-${idx + 1}`,
        img: typeof e.img === "string" ? e.img : DEFAULT_HOMEPAGE_MEDIA.experiences[idx]?.img || "/images/dining.jpg",
        title: typeof e.title === "string" ? e.title : `Experience ${idx + 1}`,
        tag: typeof e.tag === "string" ? e.tag : "Featured",
        copy: typeof e.copy === "string" ? e.copy : "",
        href: typeof e.href === "string" ? e.href : "/restaurant",
      }))
    : DEFAULT_HOMEPAGE_MEDIA.experiences;

  const featuredVideos: FeaturedVideoItem[] = Array.isArray(data.featuredVideos) && data.featuredVideos.length > 0
    ? data.featuredVideos.map((v: any, idx: number) => ({
        id: v.id || `vid-${idx + 1}`,
        title: typeof v.title === "string" ? v.title : `Video ${idx + 1}`,
        url: typeof v.url === "string" ? v.url : "/videos/hero.mp4",
        poster: typeof v.poster === "string" ? v.poster : undefined,
        description: typeof v.description === "string" ? v.description : "",
        active: typeof v.active === "boolean" ? v.active : true,
      }))
    : DEFAULT_HOMEPAGE_MEDIA.featuredVideos || [];

  return {
    hero,
    about,
    gallery,
    experiences,
    featuredVideos,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Gets cached homepage media from localStorage (SSR-safe, returns default on server)
 */
export function getCachedHomepageMedia(): HomepageMediaConfig {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return normalizeHomepageMedia(parsed);
      }
    } catch {}
  }
  return { ...DEFAULT_HOMEPAGE_MEDIA };
}

/**
 * Saves homepage media to localStorage cache
 */
export function cacheHomepageMedia(config: HomepageMediaConfig): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }
}

/**
 * Subscribes to live homepage media configuration from Firestore and local updates
 * Returns an unsubscribe callback function
 */
export function subscribeHomepageMedia(callback: (config: HomepageMediaConfig) => void): () => void {
  // Always trigger immediately with cached or default config for zero hydration mismatch
  const initial = getCachedHomepageMedia();
  callback(initial);

  const handleLocalUpdate = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail) {
      callback(normalizeHomepageMedia(custom.detail));
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("banky_homepage_media_updated", handleLocalUpdate);
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const liveConfig = normalizeHomepageMedia(docSnap.data());
          cacheHomepageMedia(liveConfig);
          callback(liveConfig);
        } else {
          callback(getCachedHomepageMedia());
        }
      },
      (error) => {
        console.warn("Firestore homepage_media listener notice:", error.message);
        callback(getCachedHomepageMedia());
      }
    );

    return () => {
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("banky_homepage_media_updated", handleLocalUpdate);
      }
    };
  } catch (err) {
    console.warn("Failed to subscribe to homepage_media in Firestore:", err);
    callback(getCachedHomepageMedia());
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("banky_homepage_media_updated", handleLocalUpdate);
      }
    };
  }
}

/**
 * Saves homepage media configuration to Firestore, local storage, and local dispatch
 */
export async function saveHomepageMedia(config: HomepageMediaConfig): Promise<void> {
  const updated: HomepageMediaConfig = {
    ...normalizeHomepageMedia(config),
    updatedAt: new Date().toISOString(),
  };

  cacheHomepageMedia(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("banky_homepage_media_updated", { detail: updated }));
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn("Failed to write homepage_media to Firestore:", err);
  }

  // Also notify server-side fallback
  try {
    await fetch("/api/admin/home-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  } catch {}
}

/**
 * Fetches homepage media once
 */
export async function fetchHomepageMedia(): Promise<HomepageMediaConfig> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const config = normalizeHomepageMedia(snap.data());
      cacheHomepageMedia(config);
      return config;
    }
  } catch (e) {
    console.warn("Fetch homepage_media error:", e);
  }

  return getCachedHomepageMedia();
}

/**
 * Resets homepage media to pristine factory defaults
 */
export async function resetHomepageMediaToDefaults(): Promise<HomepageMediaConfig> {
  const resetConfig: HomepageMediaConfig = {
    ...DEFAULT_HOMEPAGE_MEDIA,
    updatedAt: new Date().toISOString(),
  };
  await saveHomepageMedia(resetConfig);
  return resetConfig;
}
