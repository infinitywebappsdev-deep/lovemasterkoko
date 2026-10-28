"use client";

import { useState, useRef } from "react";
import {
  Film,
  Upload,
  Play,
  Pause,
  MoveUp,
  MoveDown,
  Trash2,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  X,
  RefreshCw,
  Loader2,
  Layers,
  ArrowRight,
  Video,
  Sun,
  Maximize2,
  VolumeX,
  Compass,
} from "lucide-react";
import { ROOMS } from "@/lib/hotel";
import { adminFetch } from "@/lib/admin-auth";

interface ClipItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeFormatted: string;
}

interface VideoStitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSlug?: string;
  onStitchComplete?: (result: { url: string; slug: string }) => void;
}

export function VideoStitcherModal({
  isOpen,
  onClose,
  defaultSlug = "luxury",
  onStitchComplete,
}: VideoStitcherModalProps) {
  const [targetSlug, setTargetSlug] = useState(defaultSlug);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [transition, setTransition] = useState<"crossfade" | "cut">("crossfade");
  const [colorGrade, setColorGrade] = useState<"warm_luxury" | "natural">("warm_luxury");
  const [conversionMode, setConversionMode] = useState<"crop_fill" | "ambient_wings">("crop_fill");
  const [targetDuration, setTargetDuration] = useState<number>(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stitchedResult, setStitchedResult] = useState<{
    url: string;
    slug: string;
    duration: number;
    sizeBytes: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleFilesAdded = (filesList: FileList | File[]) => {
    const newItems: ClipItem[] = [];
    const array = Array.from(filesList);

    // Auto-sort if files are named a1, a2, a3, a4
    array.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const file of array) {
      if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|mov|webm|mkv|m4v)$/i)) {
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        name: file.name,
        sizeFormatted: `${sizeMB} MB`,
      });
    }

    if (newItems.length > 0) {
      setClips((prev) => [...prev, ...newItems]);
      setErrorMessage(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const moveClip = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= clips.length) return;
    const copy = [...clips];
    const item = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = item;
    setClips(copy);
  };

  const removeClip = (id: string) => {
    setClips((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((c) => c.id !== id);
    });
  };

  const handleStitch = async () => {
    if (clips.length === 0) {
      setErrorMessage("Please select or drop at least one video clip (e.g. a1.mp4, a2.mp4, a3.mp4, a4.mp4).");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage("Converting clips to 16:9 Landscape 1080p and normalizing...");
    setStitchedResult(null);

    try {
      const formData = new FormData();
      formData.append("slug", targetSlug);
      formData.append("transition", transition);
      formData.append("colorGrade", colorGrade);
      formData.append("conversionMode", conversionMode);
      formData.append("targetDuration", String(targetDuration));

      for (let i = 0; i < clips.length; i++) {
        formData.append("videos", clips[i].file);
      }

      setStatusMessage("Applying cinematic warm luxury grade & subtle dissolves...");

      const res = await adminFetch("/api/admin/media/stitch-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || "Stitching failed.");
      }

      const freshUrl = `${data.url}?t=${Date.now()}`;
      setStitchedResult({
        url: freshUrl,
        slug: targetSlug,
        duration: data.duration,
        sizeBytes: data.sizeBytes,
      });

      setStatusMessage(data.message || "Video header successfully generated and deployed!");
      if (onStitchComplete) {
        onStitchComplete({ url: freshUrl, slug: targetSlug });
      }
    } catch (err: any) {
      console.error("Stitching error:", err);
      setErrorMessage(err?.message || "Failed to stitch video clips.");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedRoom = ROOMS.find((r) => r.slug === targetSlug) || ROOMS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl text-stone-900 dark:text-white font-bold">
                  Luxury Video Header Stitcher Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-condensed uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300/40">
                  16:9 Landscape • 1080p Web Header
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Stitch uploaded clips (a1.mp4, a2.mp4, a3.mp4, a4.mp4) into a seamless, looping 16:9 widescreen header with cinematic color grading.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Target Room & Settings Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-1">
                Target Room
              </label>
              <select
                value={targetSlug}
                onChange={(e) => setTargetSlug(e.target.value)}
                disabled={isProcessing}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {ROOMS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-1">
                Transition Style
              </label>
              <select
                value={transition}
                onChange={(e) => setTransition(e.target.value as any)}
                disabled={isProcessing}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="crossfade">Subtle Cross-Dissolve (Luxury)</option>
                <option value="cut">Direct Invisible Cut</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-1">
                Color Grading
              </label>
              <select
                value={colorGrade}
                onChange={(e) => setColorGrade(e.target.value as any)}
                disabled={isProcessing}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="warm_luxury">Warm Luxury Hotel Ambiance</option>
                <option value="natural">Original Colors</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-1">
                Duration Target
              </label>
              <select
                value={targetDuration}
                onChange={(e) => setTargetDuration(Number(e.target.value))}
                disabled={isProcessing}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value={15}>15 Seconds (Fast Web)</option>
                <option value={20}>20 Seconds (Balanced Loop)</option>
                <option value={25}>25 Seconds (Showcase)</option>
                <option value={30}>30 Seconds (Extended Tour)</option>
              </select>
            </div>
          </div>

          {/* Luxury Flow Preset Guide */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-stone-700 dark:text-stone-300">
            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300 mb-1">
              <Compass className="w-4 h-4 text-amber-500" />
              <span>Recommended Luxury Video Flow:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
              <div className="p-2 rounded-xl bg-white/70 dark:bg-stone-900/60 border border-amber-400/20">
                <span className="font-bold text-amber-600 dark:text-amber-400">1. a1.mp4:</span> Panoramic suite view
              </div>
              <div className="p-2 rounded-xl bg-white/70 dark:bg-stone-900/60 border border-amber-400/20">
                <span className="font-bold text-amber-600 dark:text-amber-400">2. a2.mp4:</span> Luxury living area
              </div>
              <div className="p-2 rounded-xl bg-white/70 dark:bg-stone-900/60 border border-amber-400/20">
                <span className="font-bold text-amber-600 dark:text-amber-400">3. a3.mp4:</span> Master king bedroom
              </div>
              <div className="p-2 rounded-xl bg-white/70 dark:bg-stone-900/60 border border-amber-400/20">
                <span className="font-bold text-amber-600 dark:text-amber-400">4. a4.mp4:</span> Premium amenities
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-stone-500 dark:text-stone-400 mt-2">
              <span className="flex items-center gap-1">
                <Maximize2 className="w-3 h-3 text-amber-500" /> Auto-converts vertical / portrait clips to 16:9 landscape
              </span>
              <span className="flex items-center gap-1">
                <VolumeX className="w-3 h-3 text-amber-500" /> Completely silent (no audio / noise)
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Seamless end-to-start loop
              </span>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-400 rounded-2xl p-6 text-center bg-stone-50/50 dark:bg-stone-900/30 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all cursor-pointer group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.mov,.webm"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-white">
              Drop <span className="font-mono text-amber-600 dark:text-amber-400">a1.mp4, a2.mp4, a3.mp4, a4.mp4</span> or click to select
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
              Any video aspect ratio (portrait or landscape) will be automatically converted to 16:9 widescreen landscape with silent looping.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Result Box */}
          {stitchedResult && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Luxury Header Video Active!</span>
                </div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  {stitchedResult.duration}s • {(stitchedResult.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>

              {/* Video Preview */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-md border border-white/10">
                <video
                  key={stitchedResult.url}
                  src={stitchedResult.url}
                  poster={selectedRoom.image}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-stone-600 dark:text-stone-300">
                  Header is live for <span className="font-semibold text-stone-900 dark:text-white">{selectedRoom.name}</span>.
                </div>
                <a
                  href={`/rooms/${stitchedResult.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all shadow-sm"
                >
                  <span>Open {selectedRoom.name} Header Live</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Sequence & Clip List */}
          {clips.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                  Clip Sequence ({clips.length} clip{clips.length > 1 ? "s" : ""})
                </h4>
                <button
                  type="button"
                  onClick={() => setClips([])}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2">
                {clips.map((clip, idx) => (
                  <div
                    key={clip.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60"
                  >
                    <span className="w-6 h-6 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    <div className="w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 relative">
                      <video
                        src={clip.previewUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-stone-900 dark:text-white truncate">
                        {clip.name}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {clip.sizeFormatted}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveClip(idx, "up")}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveClip(idx, "down")}
                        disabled={idx === clips.length - 1}
                        title="Move Down"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeClip(clip.id)}
                        title="Remove Clip"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {isProcessing && statusMessage && (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{statusMessage}</span>
              </span>
            )}
            {!isProcessing && !statusMessage && (
              <span>Ready to convert to 16:9 Landscape &amp; stitch for {selectedRoom.name}</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleStitch}
              disabled={isProcessing || clips.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-condensed uppercase tracking-wider"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Stitching Landscape Header...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Stitch 16:9 Header</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
