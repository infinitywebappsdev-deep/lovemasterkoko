"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop,
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Sliders,
  Image as ImageIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ROOMS } from "@/lib/hotel";

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  fileName: string;
  defaultRoomSlug?: string;
  onCropComplete: (savedResult: { fileName: string; url: string }) => void;
  onSkipCrop?: () => void;
}

export function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  fileName,
  defaultRoomSlug = "deluxe",
  onCropComplete,
  onSkipCrop,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetName, setTargetName] = useState(fileName || "room-photo.jpg");
  const [selectedRoomSlug, setSelectedRoomSlug] = useState(defaultRoomSlug);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Reset when opening or file changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setTargetName(fileName || `room-photo-16x10-${Date.now()}.jpg`);
      setSelectedRoomSlug(defaultRoomSlug);
      setError(null);
      setImageLoaded(false);
    }
  }, [isOpen, fileName, defaultRoomSlug]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(3, Math.max(0.8, Number((prev + delta).toFixed(2)))));
  };

  const executeCrop = useCallback(async () => {
    if (!imageRef.current || !containerRef.current || !imageSrc) return;
    setSaving(true);
    setError(null);

    try {
      const img = imageRef.current;
      const cropContainer = containerRef.current;
      const containerRect = cropContainer.getBoundingClientRect();

      // Desired output width: standard 1920x1200 (16:10)
      const outputWidth = 1920;
      const outputHeight = 1200; // 1920 / (16/10) = 1200

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not initialize 2D canvas context for cropping.");
      }

      // Smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Calculate source crop rectangle mapped from container pixels to natural image pixels
      const displayedWidth = img.clientWidth * zoom;
      const displayedHeight = img.clientHeight * zoom;

      // Scale between natural image and displayed rendered size
      const scaleX = naturalSize.width / displayedWidth;
      const scaleY = naturalSize.height / displayedHeight;

      // Top-left of crop container relative to image center
      const imgCenterX = containerRect.width / 2 + pan.x;
      const imgCenterY = containerRect.height / 2 + pan.y;

      const imgLeft = imgCenterX - displayedWidth / 2;
      const imgTop = imgCenterY - displayedHeight / 2;

      // Source rectangle in natural coordinates
      const srcX = (0 - imgLeft) * scaleX;
      const srcY = (0 - imgTop) * scaleY;
      const srcW = containerRect.width * scaleX;
      const srcH = containerRect.height * scaleY;

      // Draw image onto 16:10 canvas
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputWidth, outputHeight);

      // Convert to base64 jpeg
      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.92);

      // Save via API
      const res = await fetch("/api/admin/media/crop-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: targetName,
          roomSlug: selectedRoomSlug,
          imageData: croppedBase64,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        onCropComplete({ fileName: data.fileName, url: data.url });
        onClose();
      } else {
        throw new Error(data.message || "Failed to save cropped image");
      }
    } catch (err: any) {
      console.error("Crop error:", err);
      setError(err?.message || "Cropping failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [imageSrc, zoom, pan, naturalSize, targetName, selectedRoomSlug, onCropComplete, onClose]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cropper-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-[#1c1917] border border-stone-800 text-stone-100 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-[#24211e]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Crop className="h-5 w-5" />
            </div>
            <div>
              <h2 id="cropper-modal-title" className="font-display text-lg text-white font-medium">
                Crop Photo to Standard 16:10 Ratio
              </h2>
              <p className="text-xs text-stone-400">
                Align and size room photography for the hotel&apos;s 16:10 display cards.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Cancel and close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Crop Viewport */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Interactive 16:10 Aspect Ratio Box */}
          <div className="relative flex flex-col items-center justify-center">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="relative w-full max-w-2xl aspect-[16/10] bg-stone-950 rounded-2xl overflow-hidden border-2 border-amber-500 shadow-inner cursor-grab active:cursor-grabbing select-none"
            >
              {/* Image element */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.05s ease-out",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={handleImageLoad}
                  className="max-w-none max-h-none pointer-events-none select-none"
                  style={{ width: "100%", height: "auto", objectFit: "contain" }}
                  draggable={false}
                />
              </div>

              {/* Rule of Thirds / 16:10 Grid Guidelines */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>

              {/* Aspect Ratio Badge */}
              <div className="absolute top-3 left-3 pointer-events-none px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-amber-400 font-mono text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30">
                <Maximize2 className="h-3 w-3" />
                <span>16:10 Standard Aspect (1920 × 1200)</span>
              </div>

              {/* Drag instruction overlay */}
              <div className="absolute bottom-3 right-3 pointer-events-none px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-stone-300 text-[11px]">
                Drag to reposition · Scroll to zoom
              </div>
            </div>
          </div>

          {/* Controls: Zoom slider & repositioning tools */}
          <div className="bg-[#24211e] p-4 rounded-2xl border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <ZoomOut className="h-4 w-4 text-stone-400 shrink-0" />
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full sm:w-48 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <ZoomIn className="h-4 w-4 text-stone-400 shrink-0" />
              <span className="text-xs font-mono text-stone-300 min-w-[40px]">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
              >
                Reset Frame
              </button>
            </div>
          </div>

          {/* Metadata & Target Room Category Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#24211e] p-4 rounded-2xl border border-stone-800">
            <div>
              <label className="block text-xs font-condensed uppercase tracking-wider text-stone-400 mb-1.5 font-medium">
                Output File Name
              </label>
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                placeholder="e.g. deluxe-balcony-16x10.jpg"
              />
            </div>

            <div>
              <label className="block text-xs font-condensed uppercase tracking-wider text-stone-400 mb-1.5 font-medium">
                Assign to Room Category
              </label>
              <select
                value={selectedRoomSlug}
                onChange={(e) => setSelectedRoomSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="">-- General / No Auto-Assignment --</option>
                {ROOMS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name} ({r.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-stone-800 bg-[#24211e]">
          <div className="text-xs text-stone-400">
            {naturalSize.width > 0 && (
              <span>
                Original: {naturalSize.width} × {naturalSize.height}px → Cropping to 16:10 ratio
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {onSkipCrop && (
              <button
                type="button"
                onClick={onSkipCrop}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 text-xs font-medium transition-colors"
              >
                Keep Original (Skip Crop)
              </button>
            )}

            <button
              type="button"
              onClick={executeCrop}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-condensed uppercase tracking-wider text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cropping &amp; Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Save 16:10 Cropped Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
