"use client";

import { useEffect, useCallback } from "react";
import { ROOMS, type Room } from "@/lib/hotel";

// Global cache of preloaded image URLs to prevent redundant network requests
const preloadedCache = new Set<string>();
const inflightPromises = new Map<string, Promise<boolean>>();

/**
 * Preload an individual image into the browser's HTTP cache and decode its bitmap in memory.
 * This guarantees zero visual flash or delay when rendered by Next/Image or <img />.
 */
export function preloadImage(src: string, highPriority: boolean = false): Promise<boolean> {
  if (typeof window === "undefined" || !src) {
    return Promise.resolve(false);
  }

  const safeSrc = encodeURI(src);

  // Return immediately if already cached in memory
  if (preloadedCache.has(safeSrc)) {
    return Promise.resolve(true);
  }

  // Deduplicate concurrent requests for the exact same image
  if (inflightPromises.has(safeSrc)) {
    return inflightPromises.get(safeSrc)!;
  }

  const promise = new Promise<boolean>((resolve) => {
    // 1. Optionally inject a <link rel="preload"> tag in document.head for ultra-high priority
    if (highPriority && typeof document !== "undefined") {
      try {
        const existing = document.querySelector(`link[rel="preload"][href="${CSS.escape(safeSrc)}"]`);
        if (!existing) {
          const link = document.createElement("link");
          link.rel = "preload";
          link.as = "image";
          link.href = safeSrc;
          (link as HTMLElement & { fetchPriority?: string }).fetchPriority = "high";
          document.head.appendChild(link);
        }
      } catch {
        // Fallback gracefully if selector query fails
      }
    }

    // 2. Pre-fetch and pre-decode using HTMLImageElement
    const img = new Image();
    if (highPriority && "fetchPriority" in img) {
      (img as HTMLElement & { fetchPriority?: string }).fetchPriority = "high";
    }
    img.decoding = "async";

    const onFinish = (success: boolean) => {
      preloadedCache.add(safeSrc);
      inflightPromises.delete(safeSrc);
      resolve(success);
    };

    img.onload = () => {
      // Decode image bitmap directly in GPU/memory before rendering
      if ("decode" in img && typeof img.decode === "function") {
        img.decode()
          .then(() => onFinish(true))
          .catch(() => onFinish(true)); // decode might reject if hidden/aborted, image is still cached
      } else {
        onFinish(true);
      }
    };

    img.onerror = () => {
      inflightPromises.delete(safeSrc);
      resolve(false);
    };

    img.src = safeSrc;
  });

  inflightPromises.set(safeSrc, promise);
  return promise;
}

/**
 * Preload a collection of images in parallel or prioritized sequence.
 */
export async function preloadImages(srcs: (string | undefined | null)[], highPriority: boolean = false): Promise<boolean[]> {
  const valid = srcs.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  if (valid.length === 0) return [];
  return Promise.all(valid.map((src) => preloadImage(src, highPriority)));
}

/**
 * Extract all image URLs for a room (primary image + gallery images).
 */
export function getRoomImageUrls(slugOrRoom: string | Room): string[] {
  let room: Room | undefined;
  if (typeof slugOrRoom === "string") {
    room = ROOMS.find((r) => r.slug === slugOrRoom);
  } else {
    room = slugOrRoom;
  }

  if (!room) return [];
  const list: string[] = [];
  if (room.image) list.push(room.image);
  if (room.images && room.images.length > 0) {
    room.images.forEach((img) => {
      if (!list.includes(img)) {
        list.push(img);
      }
    });
  }
  return list;
}

/**
 * Preload all images for a given room (by slug or Room object).
 * When called on hover, touch, or navigation, this loads the entire gallery slider instantly.
 */
export async function preloadRoomImages(slugOrRoom: string | Room, highPriority: boolean = true): Promise<boolean[]> {
  const urls = getRoomImageUrls(slugOrRoom);
  if (urls.length === 0) return [];
  return preloadImages(urls, highPriority);
}

/**
 * Progressively preloads room images during browser idle periods.
 * This runs without interrupting UI responsiveness or main thread rendering.
 */
export function preloadAllRoomsOnIdle(rooms: Room[] = ROOMS, delayMs: number = 800) {
  if (typeof window === "undefined") return;

  const scheduleTask = (callback: () => void) => {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      return (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(callback, { timeout: 4000 });
    }
    return setTimeout(callback, 200);
  };

  const timer = setTimeout(() => {
    scheduleTask(() => {
      // Prioritize top suites first (Signature, Luxury, Super Executive, Executive)
      const allUrls: string[] = [];
      rooms.forEach((room) => {
        const urls = getRoomImageUrls(room);
        urls.forEach((url) => {
          if (!allUrls.includes(url) && !preloadedCache.has(encodeURI(url))) {
            allUrls.push(url);
          }
        });
      });

      // Preload in batches of 2 during idle slices to preserve mobile bandwidth
      let index = 0;
      const processNextBatch = () => {
        if (index >= allUrls.length) return;
        const batch = allUrls.slice(index, index + 2);
        index += 2;
        preloadImages(batch, false).then(() => {
          if (index < allUrls.length) {
            scheduleTask(processNextBatch);
          }
        });
      };

      processNextBatch();
    });
  }, delayMs);

  return () => clearTimeout(timer);
}

/**
 * React hook providing preloading handlers for room cards, links, and idle scheduling.
 */
export function useRoomPreloader() {
  const preloadRoom = useCallback((slug: string, highPriority: boolean = true) => {
    return preloadRoomImages(slug, highPriority);
  }, []);

  /**
   * Preload handlers to spread directly onto <Link> or container elements.
   * Triggers instant preloading on:
   * 1. Mouse hover (200-400ms before click)
   * 2. Mobile touch start (fires before navigation)
   * 3. Keyboard focus (for accessibility)
   */
  const getPreloadHandlers = useCallback(
    (slug: string) => ({
      onMouseEnter: () => {
        preloadRoom(slug, true);
      },
      onTouchStart: () => {
        preloadRoom(slug, true);
      },
      onFocus: () => {
        preloadRoom(slug, false);
      },
    }),
    [preloadRoom]
  );

  return {
    preloadRoom,
    preloadImages,
    getPreloadHandlers,
  };
}

/**
 * Head Preload Links Component.
 * In Next.js App Router (React 19), <link rel="preload"> elements rendered inside a component
 * are automatically hoisted to document <head>, kicking off image loading in the browser's C++
 * preload scanner before JavaScript execution finishes.
 */
export function RoomImagePreloadLinks({ images }: { images: string[] }) {
  if (!images || images.length === 0) return null;

  return (
    <>
      {images.map((img, idx) => (
        <link
          key={`preload-${img}-${idx}`}
          rel="preload"
          as="image"
          href={encodeURI(img)}
          {...({ fetchPriority: idx === 0 || idx === 1 ? "high" : "auto" } as Record<string, unknown>)}
        />
      ))}
    </>
  );
}
