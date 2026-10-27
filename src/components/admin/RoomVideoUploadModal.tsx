"use client";

import { useState, useRef, useEffect } from "react";
import {
  Video,
  Upload,
  Save,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ExternalLink,
  Sparkles,
  Film,
} from "lucide-react";
import Link from "next/link";
import { ROOMS } from "@/lib/hotel";

interface RoomVideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSlug?: string;
  onSaveComplete?: (result: { url: string; slug: string }) => void;
}

export function RoomVideoUploadModal({
  isOpen,
  onClose,
  defaultSlug = "luxury-suite",
  onSaveComplete,
}: RoomVideoUploadModalProps) {
  const [targetSlug, setTargetSlug] = useState(defaultSlug);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewMuted, setPreviewMuted] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Sync default slug
  useEffect(() => {
    if (defaultSlug) {
      setTargetSlug(defaultSlug);
    }
  }, [defaultSlug]);

  // Query the current active video for the selected room
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch(`/api/upload-video?slug=${targetSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok && data.video?.url) {
          setCurrentVideoUrl(data.video.url);
        } else if (!cancelled) {
          setCurrentVideoUrl(`/videos/${targetSlug}-room.mp4?t=${Date.now()}`);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentVideoUrl(`/videos/${targetSlug}-room.mp4?t=${Date.now()}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [targetSlug, isOpen]);

  // Clean up object URL when file changes or unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const currentRoom = ROOMS.find((r) => r.slug === targetSlug) || ROOMS[0];

  const handleFileChange = (file: File) => {
    setErrorMessage(null);
    setSavedSuccess(null);

    // Validate video mime type or extension
    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
      setErrorMessage("Please select a valid video file (.mp4, .webm, or .mov).");
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setPreviewPlaying(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const clearSelection = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveVideoHeader = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select a video file before saving.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSavedSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("slug", targetSlug);

      const res = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setSavedSuccess(
          `Video header saved! "${currentRoom.name}" will now exclusively play this video as its main header.`
        );
        setCurrentVideoUrl(`${data.url}?t=${Date.now()}`);
        onSaveComplete?.({ url: data.url, slug: targetSlug });
      } else {
        setErrorMessage(data.error || "Failed to save video header. Please try again.");
      }
    } catch (err) {
      console.error("Failed to save room video header:", err);
      setErrorMessage("Network or server error while saving video. Please retry.");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreviewPlay = () => {
    if (!previewVideoRef.current) return;
    if (previewVideoRef.current.paused) {
      previewVideoRef.current.play().then(() => setPreviewPlaying(true)).catch(() => {});
    } else {
      previewVideoRef.current.pause();
      setPreviewPlaying(false);
    }
  };

  const togglePreviewMute = () => {
    if (!previewVideoRef.current) return;
    previewVideoRef.current.muted = !previewVideoRef.current.muted;
    setPreviewMuted(previewVideoRef.current.muted);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#1c1917] border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="video-upload-modal-title"
                className="font-display text-lg sm:text-xl font-bold text-stone-900 dark:text-white leading-tight"
              >
                Room Video Header Manager
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Upload and save the main video playing at the top of the room page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Room Selector */}
          <div>
            <label className="block text-xs font-condensed uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
              Select Target Room Category
            </label>
            <select
              value={targetSlug}
              onChange={(e) => {
                setTargetSlug(e.target.value);
                setSavedSuccess(null);
                setErrorMessage(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all cursor-pointer"
            >
              {ROOMS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name} (₦{r.rate.toLocaleString()} / night)
                </option>
              ))}
            </select>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Video Header Successfully Saved &amp; Activated!</span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-200">{savedSuccess}</p>
              <div className="pt-2 flex items-center gap-3">
                <Link
                  href={`/rooms/${targetSlug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 hover:underline font-semibold"
                >
                  <span>Open {currentRoom.name} page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Two-Column: Current Video vs Selected New Video */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current Active Video */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 bg-stone-50/50 dark:bg-stone-900/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-condensed uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400">
                    Currently Active Header
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-medium">
                    Live
                  </span>
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-stone-200 dark:border-stone-700">
                  {currentVideoUrl ? (
                    <video
                      key={currentVideoUrl}
                      src={currentVideoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-stone-500 text-xs">
                      No video found
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2.5 text-[11px] font-mono text-stone-500 dark:text-stone-400 truncate">
                /videos/{targetSlug}-room.mp4
              </div>
            </div>

            {/* Selected New Video Preview */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 bg-stone-50/50 dark:bg-stone-900/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-condensed uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">
                    New Video Preview
                  </span>
                  {selectedFile && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-medium">
                      Ready to Save
                    </span>
                  )}
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-stone-200 dark:border-stone-700 flex items-center justify-center">
                  {previewUrl ? (
                    <>
                      <video
                        ref={previewVideoRef}
                        key={previewUrl}
                        src={previewUrl}
                        autoPlay
                        loop
                        muted={previewMuted}
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10 bg-black/60 backdrop-blur-md rounded-lg p-1">
                        <button
                          type="button"
                          onClick={togglePreviewPlay}
                          className="p-1 text-white hover:text-amber-300 transition-colors"
                          title={previewPlaying ? "Pause preview" : "Play preview"}
                        >
                          {previewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                        </button>
                        <button
                          type="button"
                          onClick={togglePreviewMute}
                          className="p-1 text-white hover:text-amber-300 transition-colors"
                          title={previewMuted ? "Unmute" : "Mute"}
                        >
                          {previewMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4 text-stone-400 dark:text-stone-500 text-xs">
                      <Video className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                      <span>Select a file below to preview here</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedFile ? (
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-300">
                  <span className="truncate font-medium max-w-[170px]" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <span className="font-mono text-stone-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              ) : (
                <div className="mt-2.5 text-[11px] text-stone-400 italic">No file selected yet</div>
              )}
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            ref={dropZoneRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-400 rounded-2xl p-5 sm:p-6 text-center bg-stone-50/50 dark:bg-stone-900/30 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 transition-all cursor-pointer group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.mov,.webm"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-white">
              {selectedFile ? (
                <span>Replace file: click or drop another video here</span>
              ) : (
                <span>Drop video file here or click to browse</span>
              )}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              Supported formats: MP4, WebM, MOV. Optimized for 16:9 widescreen headers.
            </p>
          </div>
        </div>

        {/* Modal Footer with Explicit Save Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-6 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 shrink-0">
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Saving writes to <code className="font-mono text-stone-700 dark:text-stone-300">/public/videos/{targetSlug}-room.mp4</code> and sets it as the primary playing video.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {selectedFile && (
              <button
                type="button"
                onClick={clearSelection}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold uppercase tracking-wider font-condensed transition-colors cursor-pointer disabled:opacity-50"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              id="save-room-video-header-btn"
              onClick={handleSaveVideoHeader}
              disabled={!selectedFile || isSaving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-black font-condensed uppercase tracking-wider text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Video Header...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Save as Main Video Header</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
