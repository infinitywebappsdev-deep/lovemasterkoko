"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Video,
  Upload,
  X,
  Check,
  Sparkles,
  Smartphone,
  Laptop,
  HardDrive,
  Film,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Play,
} from "lucide-react";
import {
  HomepageMediaConfig,
  saveHomepageMedia,
} from "@/lib/homepage-media";

interface HomeVideoHeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: HomepageMediaConfig;
  onConfigChange: (updated: HomepageMediaConfig) => void;
  onSuccessToast: (message: string) => void;
}

interface ServerVideoAsset {
  name: string;
  url: string;
  size: number;
  mtime: number;
}

const PRESET_HOTEL_VIDEOS = [
  {
    title: "Main Hero Atmosphere",
    subtitle: "Grand night exterior & illuminated hotel facade",
    url: "/videos/hero.mp4",
    poster: "/images/exterior-night.jpg",
  },
  {
    title: "Presidential Luxury Suite",
    subtitle: "King bed, private salon & luxury marble bath",
    url: "/videos/presidential-suite.mp4",
    poster: "/images/Presidential.jpg",
  },
  {
    title: "Deluxe Comfort Showcase",
    subtitle: "Cozy interior, smart lighting & desk workspace",
    url: "/videos/deluxe.mp4",
    poster: "/images/deluxe.jpg",
  },
  {
    title: "Signature Executive Suite",
    subtitle: "Spacious executive suite with luxury furnishings",
    url: "/videos/signature-suite.mp4",
    poster: "/images/Presidential.jpg",
  },
  {
    title: "Standard Room Tour",
    subtitle: "Comfortable standard room with modern amenities",
    url: "/videos/standard.mp4",
    poster: "/images/corridor-hallway.jpg",
  },
  {
    title: "Studio Room Loop",
    subtitle: "Streamlined contemporary studio suite",
    url: "/videos/studio.mp4",
    poster: "/images/Reception.jpg",
  },
];

export function HomeVideoHeaderModal({
  isOpen,
  onClose,
  config,
  onConfigChange,
  onSuccessToast,
}: HomeVideoHeaderModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "library" | "url">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  // Server library videos
  const [serverVideos, setServerVideos] = useState<ServerVideoAsset[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentVideoUrl = config.hero?.videoUrl || "/videos/hero.mp4";
  const isVideoEnabled = config.hero?.isVideoEnabled !== false;

  // Load server assets when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setUploadPercent(0);
    setUploadStep("");

    const fetchServerVideos = async () => {
      setLoadingVideos(true);
      try {
        const res = await fetch("/api/admin/home-media");
        const data = await res.json();
        if (data.ok && Array.isArray(data.availableVideos)) {
          setServerVideos(data.availableVideos);
        }
      } catch (err) {
        console.warn("Could not query server videos:", err);
      } finally {
        setLoadingVideos(false);
      }
    };

    fetchServerVideos();
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle direct file upload from device
  const handleProcessVideoFile = async (file: File) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["mp4", "mov", "webm", "m4v"];
    if (ext && !validExtensions.includes(ext) && !file.type.startsWith("video/")) {
      setErrorMessage("Please select a valid video file (.mp4, .mov, .webm, or .m4v).");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadStep("Preparing video from your device...");
    setUploadPercent(15);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("section", "hero-video");
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      setUploadStep("Uploading video file to server...");
      setUploadPercent(45);

      const res = await fetch("/api/admin/home-media/upload", {
        method: "POST",
        body: formData,
      });

      setUploadStep("FFmpeg optimizing with fast-start stream & poster frame...");
      setUploadPercent(80);

      const data = await res.json();
      if (!data.ok || !data.assets || data.assets.length === 0) {
        throw new Error(data.error || "Server failed to process the video file.");
      }

      const uploadedAsset = data.assets[0];
      setUploadStep("Updating live homepage header...");
      setUploadPercent(95);

      const updatedConfig: HomepageMediaConfig = {
        ...config,
        hero: {
          ...config.hero,
          videoUrl: uploadedAsset.url,
          isVideoEnabled: true,
          ...(uploadedAsset.posterUrl ? { posterImage: uploadedAsset.posterUrl } : {}),
        },
      };

      await saveHomepageMedia(updatedConfig);
      onConfigChange(updatedConfig);
      setUploadPercent(100);
      setUploadStep("Live! Header video successfully replaced.");

      onSuccessToast("Device video uploaded and set as live Homepage Video Header!");
      setTimeout(() => {
        setIsUploading(false);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error("Video upload error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during upload.");
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessVideoFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessVideoFile(file);
    }
  };

  // Apply a video from the library or presets
  const handleApplyVideoUrl = async (url: string, posterImage?: string) => {
    try {
      const updatedConfig: HomepageMediaConfig = {
        ...config,
        hero: {
          ...config.hero,
          videoUrl: url,
          isVideoEnabled: true,
          ...(posterImage ? { posterImage } : {}),
        },
      };

      await saveHomepageMedia(updatedConfig);
      onConfigChange(updatedConfig);
      onSuccessToast("Homepage Video Header updated successfully!");
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save video selection.");
    }
  };

  // Toggle video on/off
  const handleToggleVideoEnabled = async () => {
    try {
      const updatedConfig: HomepageMediaConfig = {
        ...config,
        hero: {
          ...config.hero,
          isVideoEnabled: !isVideoEnabled,
        },
      };
      await saveHomepageMedia(updatedConfig);
      onConfigChange(updatedConfig);
      onSuccessToast(
        !isVideoEnabled
          ? "Video header enabled!"
          : "Video header paused. Showing static luxury photo backdrop."
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update setting.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-medium text-white flex items-center gap-2">
                Change Homepage Video Header
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  Live
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Directly pick a video from your device or choose from the hotel library
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800/80 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Video Status Bar */}
        <div className="px-5 py-2.5 bg-stone-950/60 border-b border-stone-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-stone-400 shrink-0">Current Live Video:</span>
            <span className="font-mono text-amber-300/90 truncate max-w-[240px] sm:max-w-xs bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
              {currentVideoUrl}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleVideoEnabled}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                isVideoEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700"
              }`}
            >
              {isVideoEnabled ? "✓ Video Enabled" : "Video Paused (Photo Mode)"}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800 px-5 bg-stone-900/50">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "upload"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Pick from Device
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "library"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <Film className="h-4 w-4" />
            Hotel Library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "url"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <ExternalLink className="h-4 w-4" />
            Custom Video URL
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: UPLOAD DIRECTLY FROM DEVICE */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              {/* Drag and Drop Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-amber-400 bg-amber-500/10 scale-[1.01]"
                    : "border-stone-700/80 bg-stone-950/40 hover:border-amber-400/60 hover:bg-stone-950/70"
                } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex justify-center items-center gap-2 text-stone-400 mb-3">
                  <Smartphone className="h-6 w-6 text-amber-400" />
                  <Laptop className="h-6 w-6 text-amber-400" />
                  <HardDrive className="h-6 w-6 text-amber-400" />
                </div>

                <h4 className="text-white font-medium text-sm sm:text-base">
                  Click or drag a video file from your device
                </h4>
                <p className="text-stone-400 text-xs mt-1 max-w-md mx-auto">
                  Works directly with iPhone / Android camera roll, iPad, and computer files.
                  Supports MP4, MOV (QuickTime), WebM, and M4V.
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded bg-stone-800 text-stone-300 border border-stone-700">
                    MP4
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded bg-stone-800 text-stone-300 border border-stone-700">
                    iPhone MOV
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded bg-stone-800 text-stone-300 border border-stone-700">
                    WebM
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded bg-stone-800 text-stone-300 border border-stone-700">
                    Auto FFmpeg FastStart
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isUploading}
                  className="mt-5 btn-gold px-6 py-2.5 text-xs sm:text-sm inline-flex items-center gap-2 font-medium shadow-md shadow-amber-500/10"
                >
                  <Upload className="h-4 w-4" />
                  <span>Choose Video File</span>
                </button>
              </div>

              {/* Uploading Progress Indicator */}
              {isUploading && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-medium flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {uploadStep || "Uploading video..."}
                    </span>
                    <span className="text-amber-200 font-mono font-semibold">{uploadPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-300 ease-out"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-stone-400">
                    FFmpeg is encoding the video with faststart streaming so visitors experience zero buffering.
                  </p>
                </div>
              )}

              {/* Instructions Callout */}
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 text-stone-400 text-xs space-y-1">
                <div className="text-stone-300 font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Instant Live Deployment
                </div>
                <p>
                  As soon as the upload completes, the live homepage header reloads instantly and saves to Firebase Firestore for all visitors.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: HOTEL VIDEO LIBRARY */}
          {activeTab === "library" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  Select a video from our luxury hotel collection:
                </span>
                {loadingVideos && (
                  <span className="text-xs text-stone-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Scanning server...
                  </span>
                )}
              </div>

              {/* Preset Video Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_HOTEL_VIDEOS.map((item) => {
                  const isCurrent = currentVideoUrl === item.url;
                  return (
                    <div
                      key={item.url}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isCurrent
                          ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40"
                          : "border-stone-800 bg-stone-950/60 hover:border-stone-700 hover:bg-stone-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h5 className="text-xs sm:text-sm font-medium text-white truncate">
                            {item.title}
                          </h5>
                          <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">
                            {item.subtitle}
                          </p>
                          <span className="inline-block text-[10px] font-mono text-stone-500 mt-1">
                            {item.url}
                          </span>
                        </div>
                        {isCurrent ? (
                          <span className="shrink-0 p-1 rounded-full bg-amber-400 text-black">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyVideoUrl(item.url, item.poster)}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                            isCurrent
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/30 cursor-default"
                              : "bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200"
                          }`}
                        >
                          {isCurrent ? "Active Header Video" : "Set as Header Video"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamically uploaded server videos */}
              {serverVideos.length > 0 && (
                <div className="pt-2 border-t border-stone-800/80 space-y-2">
                  <h5 className="text-xs font-medium text-stone-300">
                    Uploaded Device Videos on Server ({serverVideos.length}):
                  </h5>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {serverVideos.map((vid) => {
                      const isCurrent = currentVideoUrl === vid.url;
                      return (
                        <div
                          key={vid.url}
                          className="flex items-center justify-between p-2 rounded-lg bg-stone-950/40 border border-stone-800 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-mono text-stone-300 truncate">{vid.name}</p>
                            <span className="text-[10px] text-stone-500">
                              {(vid.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyVideoUrl(vid.url)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium shrink-0 transition-colors ${
                              isCurrent
                                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                : "bg-stone-800 hover:bg-stone-700 text-stone-200"
                            }`}
                          >
                            {isCurrent ? "Active" : "Apply"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOM URL */}
          {activeTab === "url" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-300">
                  Direct Video MP4 / WebM URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/hotel-tour.mp4 or /videos/hero.mp4"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs placeholder:text-stone-600 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrlInput.trim()) {
                        handleApplyVideoUrl(customUrlInput.trim());
                      }
                    }}
                    disabled={!customUrlInput.trim()}
                    className="btn-gold px-4 py-2 text-xs font-medium disabled:opacity-50"
                  >
                    Apply URL
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">
                  Ensure the URL points directly to an .mp4 or .webm file with CORS enabled.
                </p>
              </div>

              {customUrlInput && (
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                  <span className="text-[11px] text-stone-400">Live URL Video Preview:</span>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    <video
                      src={customUrlInput}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link
            href="/admin/home-media"
            className="text-stone-400 hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Advanced Media Studio</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
