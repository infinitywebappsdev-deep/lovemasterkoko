"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Image from "next/image";
import { ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { preloadImages } from "@/lib/image-preloader";

interface RoomImageSliderProps {
  images: string[];
  alt: string;
  aspectClass?: string;
  autoSlideInterval?: number; // ms, default 5000
  showControls?: boolean;
  pauseOnHover?: boolean;
  onExpand?: (index: number) => void;
  priority?: boolean;
}

export const RoomImageSlider = memo(function RoomImageSlider({
  images,
  alt,
  aspectClass = "aspect-[16/13.5]",
  autoSlideInterval = 5000,
  showControls = true,
  pauseOnHover = false,
  onExpand,
  priority = false,
}: RoomImageSliderProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const total = images.length;
  const isMulti = total > 1;

  // Preload and pre-decode all images in the slider immediately
  useEffect(() => {
    if (images && images.length > 0) {
      preloadImages(images, priority);
    }
  }, [images, priority]);

  const next = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setCurrentIdx((prev) => (prev + 1) % total);
    },
    [total]
  );

  const prev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setCurrentIdx((prev) => (prev - 1 + total) % total);
    },
    [total]
  );

  // Smooth continuous auto-sliding when multiple images exist
  useEffect(() => {
    if (!isMulti) return;
    if (pauseOnHover && isHovered) return;
    const timer = setInterval(() => {
      setCurrentIdx((prevIdx) => (prevIdx + 1) % total);
    }, autoSlideInterval);
    return () => clearInterval(timer);
  }, [isMulti, isHovered, total, autoSlideInterval, pauseOnHover]);

  if (!isMulti) {
    const singleSrc = images[0] || "/images/hero.jpg";
    return (
      <div
        className={`overflow-hidden relative w-full group ${aspectClass} ${onExpand && showControls ? "cursor-pointer" : ""} bg-stone-200 dark:bg-stone-800`}
        {...({ loading: "lazy" } as any)}
        onClick={() => {
          if (showControls) onExpand?.(0);
        }}
      >
        {/* Blurred placeholder background using CSS filter: blur(20px) while full image loads */}
        <div
          className="img-blur-bg absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-500"
          style={{
            backgroundImage: `url(${encodeURI(singleSrc)})`,
            filter: "blur(20px)",
            WebkitFilter: "blur(20px)",
            transform: "scale(1.15)",
          }}
          data-placeholder="blur"
          aria-hidden="true"
        />
        <Image
          src={encodeURI(singleSrc)}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="relative z-10 object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          onLoad={(e) => {
            const sibling = e.currentTarget.previousElementSibling as HTMLElement | null;
            if (sibling) {
              sibling.style.opacity = "0";
              sibling.classList.add("is-loaded");
            }
          }}
        />
        {onExpand && (
          <button
            type="button"
            aria-label="Click to zoom and inspect room details"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExpand(0);
            }}
            className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white/90 border border-white/20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[11px] font-condensed tracking-wider uppercase cursor-pointer"
            title="Click to zoom & inspect textures in full-screen modal"
          >
            <ZoomIn className="h-3.5 w-3.5 text-amber-300" />
            <span>Zoom In</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden relative w-full select-none group ${aspectClass} ${onExpand ? "cursor-pointer" : ""} bg-stone-200 dark:bg-stone-800`}
      {...({ loading: "lazy" } as any)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onExpand?.(currentIdx)}
    >
      {/* Blurred placeholder background using CSS filter: blur(20px) while full image loads */}
      <div
        className="img-blur-bg absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-500"
        style={{
          backgroundImage: `url(${encodeURI(images[currentIdx] || images[0] || "/images/hero.jpg")})`,
          filter: "blur(20px)",
          WebkitFilter: "blur(20px)",
          transform: "scale(1.15)",
        }}
        data-placeholder="blur"
        aria-hidden="true"
      />

      {/* Slides with smooth crossfade and zero delay */}
      {images.map((img, idx) => {
        const isActive = idx === currentIdx;
        const safeSrc = encodeURI(img);
        // Eagerly load if priority is set, or if it's the current slide, or the upcoming next slide
        const isUpcoming = idx === (currentIdx + 1) % total;
        const shouldEagerLoad = priority || isActive || isUpcoming;

        return (
          <div
            key={img}
            className={`absolute inset-0 transition-opacity duration-[1800ms] ease-in-out ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <Image
              src={safeSrc}
              alt={`${alt} — Photo ${idx + 1}`}
              fill
              priority={priority && idx === 0}
              loading={shouldEagerLoad ? "eager" : "lazy"}
              decoding="async"
              className={`object-cover transition-transform duration-[6500ms] ease-out ${
                isActive ? "scale-105" : "scale-100"
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onLoad={(e) => {
                if (idx === 0) {
                  const container = e.currentTarget.closest('[class*="aspect-"]');
                  const placeholder = container?.querySelector('.img-blur-bg, [data-placeholder]') as HTMLElement | null;
                  if (placeholder) {
                    placeholder.style.opacity = "0";
                    placeholder.classList.add("is-loaded");
                  }
                }
              }}
            />
          </div>
        );
      })}

      {/* Interactive Previous / Next Slide Controls */}
      {showControls && isMulti && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={prev}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-md"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={next}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-md"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots Indicator & Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/15">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Jump to photo ${idx + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIdx(idx);
                }}
                className={`transition-all rounded-full cursor-pointer ${
                  idx === currentIdx
                    ? "w-4 h-1.5 bg-amber-300"
                    : "w-1.5 h-1.5 bg-white/50 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Expand/zoom button only when onExpand is provided and showControls is true */}
      {showControls && onExpand && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            aria-label="Click to zoom and inspect room details"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExpand(currentIdx);
            }}
            className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 flex items-center gap-1.5 transition-colors text-[11px] font-condensed tracking-wider uppercase cursor-pointer"
            title="Click to zoom & inspect textures in full-screen modal"
          >
            <ZoomIn className="h-3 w-3 text-amber-300" />
            <span className="hidden sm:inline">Zoom</span>
          </button>
        </div>
      )}
    </div>
  );
});
