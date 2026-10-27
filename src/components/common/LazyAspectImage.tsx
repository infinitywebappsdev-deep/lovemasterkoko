"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

export interface LazyAspectImageProps {
  src: string;
  alt: string;
  aspectClass?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  useNextImage?: boolean;
  children?: React.ReactNode;
  sizes?: string;
  onClick?: () => void;
}

/**
 * LazyAspectImage component for .aspect-[16/10] containers.
 * Integrates IntersectionObserver viewport detection, native loading="lazy",
 * decoding="async", subtle shimmer animation overlay, and smooth blurred placeholder fade.
 */
export function LazyAspectImage({
  src,
  alt,
  aspectClass = "aspect-[16/10]",
  className = "",
  imgClassName = "",
  priority = false,
  useNextImage = true,
  children,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  onClick,
}: LazyAspectImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(priority);

  useEffect(() => {
    if (priority) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const safeSrc = encodeURI(src);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      data-image-loaded={isLoaded ? "true" : "false"}
      className={`relative overflow-hidden bg-stone-200 dark:bg-stone-800 ${aspectClass} ${className}`}
    >
      {/* Blurred placeholder background using CSS filter: blur(20px) while full image loads */}
      <div
        className={`img-blur-bg absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-700 ${
          isLoaded ? "opacity-0 is-loaded" : "opacity-100"
        }`}
        style={{
          backgroundImage: `url(${safeSrc})`,
          filter: "blur(20px)",
          WebkitFilter: "blur(20px)",
          transform: "scale(1.15)",
        }}
        data-placeholder="blur"
        aria-hidden="true"
      />

      {/* Render Image once near viewport (or immediate if priority), with native lazy & async decoding */}
      {(isInView || priority) && (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          decoding="async"
          sizes={sizes}
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          className={`relative z-10 object-cover ${imgClassName} transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {children}
    </div>
  );
}

export default LazyAspectImage;
