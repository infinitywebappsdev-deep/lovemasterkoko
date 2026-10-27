"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  ExternalLink,
  Move,
  Scan,
  Sparkles,
} from "lucide-react";
import { preloadImage } from "@/lib/image-preloader";

interface RoomPhotoLightboxProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  roomName: string;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  onUploadClick?: () => void;
}

export function RoomPhotoLightbox({
  isOpen,
  images,
  currentIndex,
  roomName,
  onClose,
  onNavigate,
  onUploadClick,
}: RoomPhotoLightboxProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showTextureTips, setShowTextureTips] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  const total = images.length;
  const currentImg = images[currentIndex] || images[0] || "";

  // Reset zoom & pan when switching images or opening/closing
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetZoom();
  }, [currentIndex, isOpen, resetZoom]);

  // Preload next and previous images in advance so navigating is instantaneous
  useEffect(() => {
    if (!isOpen || images.length <= 1) return;
    const nextIdx = (currentIndex + 1) % images.length;
    const prevIdx = (currentIndex - 1 + images.length) % images.length;
    if (images[nextIdx]) preloadImage(images[nextIdx], true);
    if (images[prevIdx]) preloadImage(images[prevIdx], true);
  }, [currentIndex, isOpen, images]);

  // Clamp pan within reasonable bounds so image doesn't fly off screen
  const clampPan = useCallback((x: number, y: number, currentZoom: number) => {
    if (currentZoom <= 1.05) return { x: 0, y: 0 };
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return { x, y };

    // Max pan based on zoomed dimensions vs container dimensions
    const maxPanX = Math.max(40, ((img.offsetWidth * currentZoom) - container.clientWidth) / 2 + 80);
    const maxPanY = Math.max(40, ((img.offsetHeight * currentZoom) - container.clientHeight) / 2 + 80);

    return {
      x: Math.min(Math.max(x, -maxPanX), maxPanX),
      y: Math.min(Math.max(y, -maxPanY), maxPanY),
    };
  }, []);

  // Keyboard controls (+ / - / 0 / ArrowLeft / ArrowRight / Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoom > 1.2) {
          resetZoom();
        } else {
          onClose();
        }
      } else if (e.key === "ArrowRight") {
        if (zoom <= 1.2) {
          onNavigate((currentIndex + 1) % total);
        }
      } else if (e.key === "ArrowLeft") {
        if (zoom <= 1.2) {
          onNavigate((currentIndex - 1 + total) % total);
        }
      } else if (e.key === "+" || e.key === "=") {
        setZoom((prev) => {
          const next = Math.min(4.5, +(prev + 0.5).toFixed(1));
          return next;
        });
      } else if (e.key === "-" || e.key === "_") {
        setZoom((prev) => {
          const next = Math.max(1, +(prev - 0.5).toFixed(1));
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === "0") {
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, currentIndex, total, onClose, onNavigate, zoom, resetZoom]);

  // Native wheel listener for smooth zooming into cursor location
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.2 : 0.83;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(1, +(prevZoom * zoomFactor).toFixed(2)), 4.5);
        if (nextZoom <= 1.05) {
          setPan({ x: 0, y: 0 });
          return 1;
        }

        const rect = stage.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        setPan((prevPan) => {
          const ratio = nextZoom / prevZoom;
          const newX = mouseX - (mouseX - prevPan.x) * ratio;
          const newY = mouseY - (mouseY - prevPan.y) * ratio;
          return clampPan(newX, newY, nextZoom);
        });

        return nextZoom;
      });
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [isOpen, clampPan]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, []);

  // Set zoom level presets (1x, 2x, 3x, 4x)
  const setZoomPreset = (targetZoom: number) => {
    if (targetZoom <= 1) {
      resetZoom();
    } else {
      setZoom(targetZoom);
      setPan((prev) => clampPan(prev.x, prev.y, targetZoom));
    }
  };

  // Click-to-Zoom directly at clicked texture coordinate
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickXRel = (e.clientX - rect.left) / rect.width; // 0 (left) to 1 (right)
    const clickYRel = (e.clientY - rect.top) / rect.height; // 0 (top) to 1 (bottom)

    if (zoom <= 1.15) {
      // Zoom in to 2.5x centered on clicked texture point
      const targetZoom = 2.5;
      const targetX = (0.5 - clickXRel) * rect.width * targetZoom;
      const targetY = (0.5 - clickYRel) * rect.height * targetZoom;
      setZoom(targetZoom);
      setPan(clampPan(targetX, targetY, targetZoom));
    } else if (zoom < 3.2) {
      // Deeper zoom for micro textures (linens, wood grain, marble finish, stitching)
      const targetZoom = 4.0;
      const targetX = (0.5 - clickXRel) * rect.width * targetZoom;
      const targetY = (0.5 - clickYRel) * rect.height * targetZoom;
      setZoom(targetZoom);
      setPan(clampPan(targetX, targetY, targetZoom));
    } else {
      // Reset back to fit
      resetZoom();
    }
  };

  // Mouse Drag to Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;
    if (Math.abs(rawX - pan.x) > 3 || Math.abs(rawY - pan.y) > 3) {
      hasDraggedRef.current = true;
    }
    setPan(clampPan(rawX, rawY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag to Pan for mobile / tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom > 1) {
      const touch = e.touches[0];
      if (!touch) return;
      setIsDragging(true);
      hasDraggedRef.current = false;
      dragStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rawX = touch.clientX - dragStartRef.current.x;
    const rawY = touch.clientY - dragStartRef.current.y;
    if (Math.abs(rawX - pan.x) > 3 || Math.abs(rawY - pan.y) > 3) {
      hasDraggedRef.current = true;
    }
    setPan(clampPan(rawX, rawY, zoom));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  const getCleanFileName = (pathStr: string) => {
    try {
      const parts = pathStr.split("?")[0]?.split("/");
      return parts ? parts[parts.length - 1] || pathStr : pathStr;
    } catch {
      return pathStr;
    }
  };

  const isZoomed = zoom > 1.05;

  return (
    <AnimatePresence>
      <motion.div
        id="room-photo-lightbox-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${roomName} Photo Gallery Texture Inspector`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex flex-col bg-[#0b0b0c]/98 backdrop-blur-2xl text-white select-none"
        onMouseUp={handleMouseUp}
      >
        {/* Top Control Bar */}
        <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-300 shadow-sm">
              <Scan className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-medium text-white truncate">{roomName}</h3>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-condensed tracking-wider bg-white/10 text-amber-300 border border-white/15">
                  {currentIndex + 1} / {total}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-condensed tracking-wider uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20 font-medium">
                  <Sparkles className="h-3 w-3" /> Texture Inspector
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono truncate max-w-xs sm:max-w-md">
                {getCleanFileName(currentImg)}
              </p>
            </div>
          </div>

          {/* Controls: Zoom presets & tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Zoom Presets */}
            <div className="hidden sm:flex items-center bg-white/10 border border-white/15 rounded-full p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setZoomPreset(1)}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  zoom <= 1.05
                    ? "bg-[var(--accent)] text-stone-900 font-bold"
                    : "text-stone-300 hover:text-white"
                }`}
                title="Fit to Screen (1x)"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoomPreset(2)}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  Math.abs(zoom - 2) < 0.2
                    ? "bg-[var(--accent)] text-stone-900 font-bold"
                    : "text-stone-300 hover:text-white"
                }`}
                title="2x Zoom - Inspect Room Finishes"
              >
                2x
              </button>
              <button
                type="button"
                onClick={() => setZoomPreset(3)}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  Math.abs(zoom - 3) < 0.2
                    ? "bg-[var(--accent)] text-stone-900 font-bold"
                    : "text-stone-300 hover:text-white"
                }`}
                title="3x Zoom - Fabric Weave & Textures"
              >
                3x
              </button>
              <button
                type="button"
                onClick={() => setZoomPreset(4)}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  zoom >= 3.8
                    ? "bg-[var(--accent)] text-stone-900 font-bold"
                    : "text-stone-300 hover:text-white"
                }`}
                title="4x Ultra Zoom - Micro Details & Wood Grain"
              >
                4x
              </button>
            </div>

            {/* Step Zoom Out */}
            <button
              type="button"
              onClick={() => {
                setZoom((prev) => {
                  const next = Math.max(1, +(prev - 0.5).toFixed(1));
                  if (next <= 1) setPan({ x: 0, y: 0 });
                  return next;
                });
              }}
              disabled={zoom <= 1}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-stone-300 hover:text-white transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            {/* Current Zoom Readout / Reset */}
            <button
              type="button"
              onClick={resetZoom}
              className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-mono text-amber-300 flex items-center gap-1 transition-colors"
              title="Reset Zoom to 100% (0)"
            >
              <span>{Math.round(zoom * 100)}%</span>
              {isZoomed && <RotateCcw className="h-3 w-3 text-stone-400" />}
            </button>

            {/* Step Zoom In */}
            <button
              type="button"
              onClick={() => {
                setZoom((prev) => Math.min(4.5, +(prev + 0.5).toFixed(1)));
              }}
              disabled={zoom >= 4.5}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-stone-300 hover:text-white transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="w-px h-5 bg-white/20 mx-1 hidden sm:block" />

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden sm:inline-flex p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Raw file link */}
            <a
              href={encodeURI(currentImg)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors"
              title="Open raw high-res asset in new tab"
              aria-label="Open high-res asset in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            {/* Close Button */}
            <button
              id="lightbox-close-button"
              type="button"
              onClick={onClose}
              className="p-2 ml-1 rounded-full bg-white/15 hover:bg-red-500/80 text-white transition-colors"
              title="Close viewer (Esc)"
              aria-label="Close Lightbox Viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Center Viewing Stage */}
        <main
          ref={stageRef}
          className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none"
          onClick={(e) => {
            // Close if clicking outside the image and not zoomed
            if (e.target === e.currentTarget && !isZoomed) {
              onClose();
            }
          }}
        >
          {/* Helpful Texture Zoom Tip Banner */}
          <AnimatePresence>
            {!isZoomed && showTextureTips && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
              >
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-xs font-condensed tracking-wider text-amber-200 shadow-xl">
                  <ZoomIn className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Click anywhere on the photo to zoom into textures • Scroll to zoom</span>
                </div>
              </motion.div>
            )}
            {isZoomed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
              >
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-xs font-condensed tracking-wider text-stone-200 shadow-xl">
                  <Move className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Drag to explore fabric & textures • Click again to zoom deeper or reset</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Previous Arrow (hidden or subdued when zoomed to avoid blocking inspection) */}
          {total > 1 && (
            <button
              id="lightbox-prev-button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
                onNavigate((currentIndex - 1 + total) % total);
              }}
              aria-label="Previous image (Left Arrow)"
              className={`absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 hover:border-amber-400/50 backdrop-blur-md transition-all shadow-xl hover:scale-105 active:scale-95 ${
                isZoomed ? "opacity-30 hover:opacity-100" : "opacity-100"
              }`}
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}

          {/* Active Image Container with Smooth Zoom & Drag-to-Pan */}
          <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex items-center justify-center transition-transform duration-100 ease-out will-change-transform"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
                cursor: isZoomed
                  ? isDragging
                    ? "grabbing"
                    : "grab"
                  : "zoom-in",
              }}
            >
              <NextImage
                ref={imageRef}
                id="lightbox-active-image"
                src={currentImg}
                alt={`${roomName} - View ${currentIndex + 1}`}
                width={1600}
                height={1000}
                priority
                referrerPolicy="no-referrer"
                onClick={handleImageClick}
                draggable={false}
                className="max-h-[72vh] sm:max-h-[78vh] max-w-[92vw] w-auto h-auto object-contain rounded-xl shadow-2xl select-none"
              />
            </div>
          </div>

          {/* Next Arrow */}
          {total > 1 && (
            <button
              id="lightbox-next-button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
                onNavigate((currentIndex + 1) % total);
              }}
              aria-label="Next image (Right Arrow)"
              className={`absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 hover:border-amber-400/50 backdrop-blur-md transition-all shadow-xl hover:scale-105 active:scale-95 ${
                isZoomed ? "opacity-30 hover:opacity-100" : "opacity-100"
              }`}
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}

          {/* Texture Minimap Navigator (Visible when zoomed > 1.1x) */}
          <AnimatePresence>
            {isZoomed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-4 left-4 z-30 hidden sm:block pointer-events-none"
              >
                <div className="relative w-32 aspect-[16/11] rounded-lg overflow-hidden border border-amber-400/50 bg-black/80 backdrop-blur-md shadow-2xl p-0.5">
                  <NextImage
                    src={currentImg}
                    alt="Inspection Minimap"
                    fill
                    sizes="128px"
                    referrerPolicy="no-referrer"
                    className="object-cover rounded opacity-70"
                  />
                  {/* Viewport Indicator Rectangle */}
                  <div
                    className="absolute border-2 border-amber-300 bg-amber-400/20 rounded-sm pointer-events-none shadow-sm"
                    style={{
                      width: `${Math.min(100, 100 / zoom)}%`,
                      height: `${Math.min(100, 100 / zoom)}%`,
                      left: `${Math.min(
                        Math.max(0, 50 - 50 / zoom - (pan.x / (350 * zoom)) * 100),
                        100 - 100 / zoom
                      )}%`,
                      top: `${Math.min(
                        Math.max(0, 50 - 50 / zoom - (pan.y / (250 * zoom)) * 100),
                        100 - 100 / zoom
                      )}%`,
                    }}
                  />
                  <div className="absolute top-1 left-1.5 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono uppercase text-amber-300 tracking-wider">
                    Texture Map
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Thumbnail Strip */}
        {total > 1 && (
          <footer className="shrink-0 px-4 sm:px-6 py-2.5 bg-black/70 border-t border-white/10 overflow-x-auto z-20 backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-full mx-auto">
              {images.map((img, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={img + idx}
                    type="button"
                    onClick={() => {
                      resetZoom();
                      onNavigate(idx);
                    }}
                    aria-label={`Jump to photo ${idx + 1}`}
                    className={`relative shrink-0 rounded-lg overflow-hidden transition-all duration-200 ${
                      isActive
                        ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-black scale-105 border-transparent"
                        : "opacity-60 hover:opacity-100 border border-white/20"
                    }`}
                  >
                    <div className="w-14 sm:w-16 aspect-[4/3] relative">
                      <NextImage
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        sizes="64px"
                        referrerPolicy="no-referrer"
                        className="object-cover"
                      />
                    </div>
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-white/90">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </footer>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

