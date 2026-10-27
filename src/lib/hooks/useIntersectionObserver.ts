"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface IntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | Document | null;
  rootMargin?: string;
  triggerOnce?: boolean;
  enabled?: boolean;
}

/**
 * Custom hook providing an Intersection Observer for .aspect-[16/10] and media containers.
 * Prioritizes native browser-based lazy loading while providing fine-grained viewport awareness.
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.01,
  root = null,
  rootMargin = "150px",
  triggerOnce = true,
  enabled = true,
}: IntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsIntersecting(true);
      return;
    }

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      // Fallback: immediately treat as intersecting if IntersectionObserver is unsupported
      setIsIntersecting(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            observer.unobserve(node);
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, triggerOnce, enabled]);

  return { ref, isIntersecting };
}

/**
 * Specialized hook for .aspect-[16/10] lazy-loaded images with blurred placeholder fade.
 */
export function useLazyImage<T extends HTMLElement = HTMLDivElement>(options?: IntersectionObserverOptions) {
  const { ref, isIntersecting } = useIntersectionObserver<T>(options);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const handleImageLoad = useCallback((e?: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    if (e?.currentTarget) {
      const parent = e.currentTarget.closest('[class*="aspect-"]') || e.currentTarget.parentElement;
      if (parent) {
        parent.setAttribute("data-image-loaded", "true");
        const placeholder = parent.querySelector(".img-blur-bg, [data-placeholder]") as HTMLElement | null;
        if (placeholder) {
          placeholder.style.opacity = "0";
          placeholder.classList.add("is-loaded");
        }
      }
    }
  }, []);

  return {
    containerRef: ref,
    isVisible: isIntersecting,
    isLoaded,
    handleImageLoad,
    imageProps: {
      loading: "lazy" as const,
      decoding: "async" as const,
      onLoad: handleImageLoad,
    },
  };
}
