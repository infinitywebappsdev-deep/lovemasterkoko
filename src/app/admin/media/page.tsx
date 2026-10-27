"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Crop,
  FileText,
  ShieldAlert,
  Sliders,
  Check,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  Plus,
  Video,
  Film,
  Play,
  Pause,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { ROOMS, Room } from "@/lib/hotel";
import { RoomSortDropdown, type RoomSortOption } from "@/components/admin/RoomSortDropdown";
import { ImageCropperModal } from "@/components/admin/ImageCropperModal";
import { BatchRenamerModal, type MediaFileItem } from "@/components/admin/BatchRenamerModal";
import { UsageAuditReport } from "@/components/admin/UsageAuditReport";
import { VideoStitcherModal } from "@/components/admin/VideoStitcherModal";
import { RoomVideoUploadModal } from "@/components/admin/RoomVideoUploadModal";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";

interface UploadedFile {
  name: string;
  size: number;
  url: string;
  roomMatch?: string;
}

export default function AdminMediaPage() {
  // Navigation tabs: "photography" | "videos" | "audit"
  const [activeTab, setActiveTab] = useState<"photography" | "videos" | "audit">("photography");

  // Room video headers upload state
  const [uploadingVideoSlug, setUploadingVideoSlug] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const selectedVideoSlugRef = useRef<string>("deluxe");

  // Sorting state for room categories and image grids
  const [sortOption, setSortOption] = useState<RoomSortOption>("recently_updated");
  const [recentlyUpdatedSlugs, setRecentlyUpdatedSlugs] = useState<string[]>([
    "deluxe",
    "executive",
    "standard-plus",
    "standard",
  ]);

  // Upload & drop zone state
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [recentUploads, setRecentUploads] = useState<UploadedFile[]>([]);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropUploadInputRef = useRef<HTMLInputElement>(null);

  // Media files & Usage Audit data
  const [allMediaFiles, setAllMediaFiles] = useState<MediaFileItem[]>([]);
  const [auditSummary, setAuditSummary] = useState<any>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // 16:10 Cropper Modal state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState("");
  const [cropDefaultRoomSlug, setCropDefaultRoomSlug] = useState("deluxe");
  const pendingFilesRef = useRef<File[]>([]);

  // Batch Renamer Modal state
  const [batchRenamerOpen, setBatchRenamerOpen] = useState(false);
  const [batchSelectedNames, setBatchSelectedNames] = useState<string[]>([]);

  // Video Stitcher Studio state
  const [stitcherOpen, setStitcherOpen] = useState(false);
  const [stitcherDefaultSlug, setStitcherDefaultSlug] = useState("standard-plus");

  // Room Video Header Upload & Save Modal state
  const [videoUploadModalOpen, setVideoUploadModalOpen] = useState(false);
  const [videoUploadTargetSlug, setVideoUploadTargetSlug] = useState("luxury-suite");

  // Server-verified video file status map from /public/videos/
  interface ServerVideoItem {
    slug: string;
    url: string;
    exists: boolean;
    size: number;
    mtime: number;
  }
  const [serverVideoMap, setServerVideoMap] = useState<Record<string, ServerVideoItem>>({});
  const [activeVideoMap, setActiveVideoMap] = useState<Record<string, string>>({});
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoPlaybackErrors, setVideoPlaybackErrors] = useState<Record<string, boolean>>({});
  const [playingVideoMap, setPlayingVideoMap] = useState<Record<string, boolean>>({});
  const [loadingVideoMap, setLoadingVideoMap] = useState<Record<string, boolean>>({});
  const [enlargedVideo, setEnlargedVideo] = useState<{ name: string; url: string; slug: string } | null>(null);

  // Deletion modal state for image and video assets
  const [fileToDelete, setFileToDelete] = useState<{
    type: "image" | "video";
    filename: string;
    displayName?: string;
    slug?: string;
  } | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeletingMedia(true);
    try {
      const res = await fetch("/api/admin/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileToDelete),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message || `Deleted ${fileToDelete.displayName || fileToDelete.filename} successfully.`);
        setRefreshKey(Date.now());
        if (fileToDelete.type === "video") {
          await fetchVideoStatuses();
          if (fileToDelete.slug) {
            setActiveVideoMap((prev) => {
              const updated = { ...prev };
              delete updated[fileToDelete.slug!];
              return updated;
            });
            setPlayingVideoMap((prev) => ({ ...prev, [fileToDelete.slug!]: false }));
          }
        } else {
          await fetchMediaData();
        }
      } else {
        alert(data.error || "Failed to delete media asset");
      }
    } catch (err) {
      console.error("Delete media error:", err);
      alert("An error occurred while deleting the media file.");
    } finally {
      setIsDeletingMedia(false);
      setFileToDelete(null);
    }
  };

  // Query actual video files located on the server in /public/videos/
  const fetchVideoStatuses = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch("/api/upload-video");
      const data = await res.json();
      if (data.ok && data.videos) {
        setServerVideoMap(data.videos);
        // Automatically sync verified video URLs
        setActiveVideoMap((prev) => {
          const updated = { ...prev };
          for (const [s, item] of Object.entries(data.videos as Record<string, ServerVideoItem>)) {
            if (item.exists && item.url) {
              updated[s] = item.url;
            }
          }
          return updated;
        });
      }
    } catch (err) {
      console.error("Failed to query server video files:", err);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  // Fetch all media files and audit info from server
  const fetchMediaData = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch("/api/admin/media/files");
      const data = await res.json();
      if (data.ok) {
        setAllMediaFiles(data.files || []);
        setAuditSummary(data.auditSummary || null);
      }
    } catch (err) {
      console.error("Failed to load media files:", err);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    fetchMediaData();
    fetchVideoStatuses();
  }, [fetchMediaData, fetchVideoStatuses, refreshKey]);

  // 1. Sorting logic for Room Categories & Image Grids
  const sortedRoomCategories = useMemo(() => {
    const list = [...ROOMS];

    if (sortOption === "name_asc") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sortOption === "recently_updated") {
      return list.sort((a, b) => {
        const aIdx = recentlyUpdatedSlugs.indexOf(a.slug);
        const bIdx = recentlyUpdatedSlugs.indexOf(b.slug);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return 0;
      });
    }

    // "custom_order" (hotel prestige tier catalog order)
    return list;
  }, [sortOption, recentlyUpdatedSlugs]);

  // Helper to sort images within a room's image grid
  const getSortedRoomImages = useCallback(
    (room: Room) => {
      let imagesList: { url: string; label: string; name: string }[] = [];

      // Determine images for this room
      if (room.slug === "deluxe") {
        imagesList = [
          { url: `/images/DELUXE MAIN1.jpeg?t=${refreshKey}`, label: "MAIN1", name: "DELUXE MAIN1.jpeg" },
          { url: `/images/DELUXE MAIN2.jpeg?t=${refreshKey}`, label: "MAIN2", name: "DELUXE MAIN2.jpeg" },
        ];
      } else if (room.slug === "executive") {
        imagesList = [
          { url: `/images/EXECUTIVE Main.jpeg?t=${refreshKey}`, label: "MAIN1", name: "EXECUTIVE Main.jpeg" },
          { url: `/images/EXECUTIVE MAIN2.jpeg?t=${refreshKey}`, label: "MAIN2", name: "EXECUTIVE MAIN2.jpeg" },
        ];
      } else if (room.slug === "standard-plus") {
        imagesList = [
          { url: `/images/Standard PLUS.jpeg?t=${refreshKey}`, label: "MAIN1", name: "Standard PLUS.jpeg" },
          { url: `/images/STANDARD PLUS MAIN .jpeg?t=${refreshKey}`, label: "MAIN2", name: "STANDARD PLUS MAIN .jpeg" },
        ];
      } else if (room.slug === "standard") {
        imagesList = [
          { url: `/images/Standard room.jpg?t=${refreshKey}`, label: "MAIN1", name: "Standard room.jpg" },
          { url: `/images/standard.jpg?t=${refreshKey}`, label: "MAIN2", name: "standard.jpg" },
        ];
      } else if (room.images && room.images.length > 0) {
        imagesList = room.images.map((img, i) => ({
          url: `${img}?t=${refreshKey}`,
          label: i === 0 ? "MAIN1" : `SLOT ${i + 1}`,
          name: img.replace("/images/", ""),
        }));
      } else if (room.image) {
        imagesList = [
          {
            url: `${room.image}?t=${refreshKey}`,
            label: "MAIN1",
            name: room.image.replace("/images/", ""),
          },
        ];
      }

      // Sort images based on sortOption
      if (sortOption === "name_asc") {
        return [...imagesList].sort((a, b) => a.name.localeCompare(b.name));
      }

      // Default or custom order: hero/primary slot first
      return imagesList;
    },
    [sortOption, refreshKey]
  );

  // 2. Upload and Cropping Workflow
  // When an image is dropped or uploaded, open the Image Cropper for the first image
  const startCropperForFile = (file: File, defaultSlug = "deluxe") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCropImageSrc(e.target.result as string);
        setCropFileName(file.name);
        setCropDefaultRoomSlug(defaultSlug);
        setCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload without crop (e.g. when user clicks "Skip Crop" or uploads batch directly)
  const uploadFilesDirectly = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setStatusMessage(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/upload-room-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Successfully saved ${files.length} photo(s) to public/images/!`);
        const newUploads: UploadedFile[] = files.map((f, i) => {
          let roomMatch: string | undefined = undefined;
          const upper = f.name.toUpperCase();
          if (upper.includes("DELUXE")) roomMatch = "Deluxe Room";
          else if (upper.includes("EXECUTIVE")) roomMatch = "Executive Suite";
          else if (upper.includes("STANDARD PLUS") || upper.includes("STANDAR PLUS")) roomMatch = "Standard Plus Room";
          else if (upper.includes("STANDARD")) roomMatch = "Standard Room";
          else if (upper.includes("LOGO")) roomMatch = "Brand Logo Asset";
          return {
            name: f.name,
            size: f.size,
            url: data.urls?.[i] || `/images/${f.name}`,
            roomMatch,
          };
        });
        setRecentUploads((prev) => [...newUploads, ...prev]);
        setRefreshKey(Date.now());
      } else {
        setStatusMessage(`Upload failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Direct upload error:", err);
      setStatusMessage("Failed to upload image files.");
    } finally {
      setUploading(false);
    }
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    // If an image was selected, trigger the 16:10 cropping tool immediately
    const firstImage = files.find((f) => f.type.startsWith("image/"));
    if (firstImage) {
      pendingFilesRef.current = files.slice(1);
      // Determine probable room slug from name
      let slug = "deluxe";
      const u = firstImage.name.toUpperCase();
      if (u.includes("EXEC")) slug = "executive";
      else if (u.includes("PLUS")) slug = "standard-plus";
      else if (u.includes("STAND")) slug = "standard";
      else if (u.includes("SIGN") || u.includes("LUXURY-SUITE")) slug = "luxury-suite";
      else if (u.includes("LUX") || u.includes("PRES")) slug = "luxury";

      startCropperForFile(firstImage, slug);
    } else {
      uploadFilesDirectly(files);
    }
  };

  const handleCropComplete = (result: { fileName: string; url: string }) => {
    setStatusMessage(`Saved 16:10 cropped photo "${result.fileName}" to public/images/!`);
    setRecentUploads((prev) => [
      {
        name: result.fileName,
        size: 0,
        url: result.url,
        roomMatch: cropDefaultRoomSlug,
      },
      ...prev,
    ]);
    setRecentlyUpdatedSlugs((prev) => [cropDefaultRoomSlug, ...prev.filter((s) => s !== cropDefaultRoomSlug)]);
    setRefreshKey(Date.now());

    // If there were additional pending files, upload them
    if (pendingFilesRef.current.length > 0) {
      const rest = [...pendingFilesRef.current];
      pendingFilesRef.current = [];
      uploadFilesDirectly(rest);
    }
  };

  const handleSkipCrop = () => {
    setCropperOpen(false);
    // Find file from state
    if (cropFileName) {
      setStatusMessage("Crop skipped; uploading original uncropped image.");
      // We trigger standard direct upload
      fetchMediaData();
    }
  };

  // Open cropper for an existing image
  const handleCropExistingImage = (imageUrl: string, fileName: string, slug: string) => {
    setCropImageSrc(imageUrl);
    setCropFileName(fileName);
    setCropDefaultRoomSlug(slug);
    setCropperOpen(true);
  };

  // 3. Batch Renamer Triggers
  const openBatchRenamerWithSelection = (fileNames: string[]) => {
    setBatchSelectedNames(fileNames);
    setBatchRenamerOpen(true);
  };

  // 4. Room Video Upload Triggers
  const triggerRoomVideoUpload = (slug: string) => {
    selectedVideoSlugRef.current = slug;
    videoInputRef.current?.click();
  };

  const handleRoomVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const slug = selectedVideoSlugRef.current;
    setUploadingVideoSlug(slug);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", slug);

      const res = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const sizeMb = data.size ? ` (${(data.size / (1024 * 1024)).toFixed(1)} MB)` : "";
        setStatusMessage(`Successfully saved video header for ${slug} to /public/videos/${data.filename || `${slug}-room.mp4`}${sizeMb}!`);
        if (data.url) {
          setActiveVideoMap((prev) => ({ ...prev, [slug]: data.url }));
          setVideoPlaybackErrors((prev) => ({ ...prev, [slug]: false }));
        }
        setRefreshKey(Date.now());
        setRecentlyUpdatedSlugs((prev) => [slug, ...prev.filter((s) => s !== slug)]);
        await fetchVideoStatuses();
      } else {
        setStatusMessage(`Video upload failed: ${data.error || "Unknown server error"}`);
      }
    } catch (err) {
      console.error("Room video upload failed:", err);
      setStatusMessage("Failed to upload video file.");
    } finally {
      setUploadingVideoSlug(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <span className="text-xs font-condensed uppercase tracking-wider font-semibold text-stone-500">
              Media Management Suite
            </span>
          </div>
          <h1 className="font-display text-3xl text-stone-900 dark:text-white">
            Room Photography &amp; Media
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            Manage actual room photos, 16:10 cropping, batch renaming, and storage usage audits.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setStitcherDefaultSlug("standard-plus");
              setStitcherOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-condensed uppercase tracking-wider text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Film className="h-4 w-4" />
            <span>Stitch Video Header</span>
          </button>

          <button
            type="button"
            onClick={() => cropUploadInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-condensed uppercase tracking-wider text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Crop className="h-4 w-4 stroke-[2.5]" />
            <span>Crop Photo (16:10)</span>
          </button>

          <button
            type="button"
            onClick={() => openBatchRenamerWithSelection([])}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-black hover:bg-stone-800 font-condensed uppercase tracking-wider text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>Batch Rename Tool</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRefreshKey(Date.now());
              fetchMediaData();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-50 text-xs font-medium transition-colors shadow-sm cursor-pointer"
            title="Refresh previews from public/images"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingFiles ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Hidden file input specifically for Crop Photo button */}
      <input
        ref={cropUploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* Hidden file input specifically for Room Video Header uploads */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="hidden"
        onChange={handleRoomVideoUpload}
      />

      {/* View Switcher: Room Photography vs Video Headers vs Usage Audit Report */}
      <div className="flex items-center justify-between gap-4 bg-stone-100 dark:bg-stone-900/60 p-1.5 rounded-2xl border border-stone-200 dark:border-stone-800">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("photography")}
            className={`px-4 py-2 rounded-xl text-xs font-condensed uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "photography"
                ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
            }`}
          >
            <ImageIcon className="h-4 w-4 text-[var(--accent)]" />
            <span>Room Photography &amp; Galleries</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className={`px-4 py-2 rounded-xl text-xs font-condensed uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "videos"
                ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
            }`}
          >
            <Video className="h-4 w-4 text-amber-500" />
            <span>Room Video Headers</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[10px]">
              8 Rooms
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-xl text-xs font-condensed uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "audit"
                ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span>Usage Audit &amp; Orphaned Files</span>
            {auditSummary?.orphanedFilesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[10px]">
                {auditSummary.orphanedFilesCount}
              </span>
            )}
          </button>
        </div>

        {/* Sorting Dropdown (Prominent on Room Photography view) */}
        {activeTab === "photography" && (
          <div className="hidden sm:flex items-center pr-2">
            <RoomSortDropdown value={sortOption} onChange={setSortOption} />
          </div>
        )}
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-medium">{statusMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: ROOM PHOTOGRAPHY & GALLERIES                      */}
      {/* ======================================================== */}
      {activeTab === "photography" && (
        <div className="space-y-8">
          {/* Main Drag & Drop Zone with 16:10 Cropper Trigger */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFilesSelected(e.dataTransfer.files);
              }
            }}
            className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all ${
              dragOver
                ? "border-[var(--accent)] bg-amber-500/10 scale-[1.01]"
                : "border-stone-300 dark:border-stone-700 hover:border-stone-400 bg-white dark:bg-[#201d19] shadow-sm"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/*"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center text-[var(--accent)]">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-[#ffbf00]" />
                )}
              </div>

              <div>
                <h3 className="font-display text-xl text-stone-900 dark:text-white">
                  {uploading ? "Saving files to public/images/..." : "Drag & Drop Room Photos Here"}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-lg mx-auto">
                  Drop new room photography here. The interactive{" "}
                  <strong className="text-amber-600 font-semibold">16:10 Cropping Tool</strong>{" "}
                  will appear automatically to align and crop photos before saving.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-6 py-2.5 rounded-xl bg-[#1b1b1b] dark:bg-white text-white dark:text-black font-condensed uppercase tracking-wider text-xs font-semibold shadow hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploading ? "Processing..." : "Browse Local Files"}
                </button>
              </div>
            </div>
          </div>

          {/* Section Header: Room Categories & Image Grids with Sorting Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h2 className="font-display text-2xl text-stone-900 dark:text-white">
                Room Categories &amp; Photography Status
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sorted by{" "}
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {sortOption === "recently_updated"
                    ? "Recently Updated"
                    : sortOption === "name_asc"
                    ? "Name (A-Z)"
                    : "Custom Order (Hotel Tier)"}
                </span>
                . Photos are formatted to standard 16:10 ratio.
              </p>
            </div>

            {/* Mobile/Compact Sort Dropdown */}
            <div className="sm:hidden self-start">
              <RoomSortDropdown value={sortOption} onChange={setSortOption} />
            </div>
          </div>

          {/* Room Categories Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {sortedRoomCategories.map((room) => {
              const images = getSortedRoomImages(room);

              return (
                <div
                  key={room.slug}
                  className="bg-white dark:bg-[#201d19] border border-[#ece6dd] dark:border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-lg text-stone-900 dark:text-white">
                        {room.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {room.qty} unit(s) · Slug: <code className="font-mono">{room.slug}</code>
                      </p>
                    </div>

                    <Link
                      href={`/rooms/${room.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline font-medium"
                    >
                      <span>Live Page</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Image Grid (Sorted by sortOption) */}
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="space-y-1.5 group">
                        <div className="aspect-[16/10] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={`${room.name} Photo ${idx + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/hero.jpg";
                            }}
                          />

                          {/* Slot Tag */}
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-mono backdrop-blur-sm">
                            {img.label}
                          </span>

                          {/* Hover action: Crop to 16:10 & Delete */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                            <button
                              type="button"
                              onClick={() => handleCropExistingImage(img.url, img.name, room.slug)}
                              className="px-2 py-1 rounded-lg bg-white/95 hover:bg-white text-stone-900 text-xs font-condensed uppercase tracking-wider font-bold shadow flex items-center gap-1 transition-transform transform scale-95 hover:scale-100 cursor-pointer"
                              title="Crop to 16:10 Aspect Ratio"
                            >
                              <Crop className="h-3 w-3 text-amber-600" />
                              <span>Crop</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFileToDelete({
                                  type: "image",
                                  filename: img.name,
                                  displayName: `${room.name} (${img.name})`,
                                  slug: room.slug,
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-condensed uppercase tracking-wider font-bold shadow flex items-center gap-1 transition-transform transform scale-95 hover:scale-100 cursor-pointer"
                              title={`Delete ${img.name}`}
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-stone-600 dark:text-stone-400">
                          <p className="truncate max-w-[130px]" title={img.name}>
                            {img.name}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openBatchRenamerWithSelection([img.name])}
                              className="hover:text-[var(--accent)] font-condensed uppercase tracking-wider text-[10px]"
                            >
                              Rename
                            </button>
                            <span className="text-stone-300 dark:text-stone-600">·</span>
                            <button
                              type="button"
                              onClick={() =>
                                setFileToDelete({
                                  type: "image",
                                  filename: img.name,
                                  displayName: `${room.name} (${img.name})`,
                                  slug: room.slug,
                                })
                              }
                              className="text-stone-400 hover:text-rose-500 font-condensed uppercase tracking-wider text-[10px]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-mono text-[11px]">
                      {images.length} photo(s) mapped
                    </span>
                    <button
                      type="button"
                      onClick={() => cropUploadInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-medium text-xs cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Upload &amp; Crop New Photo</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Official Brand Logos Section */}
          <div className="bg-white dark:bg-[#201d19] border border-[#ece6dd] dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <h2 className="font-display text-xl text-stone-900 dark:text-white">
                    Official Brand Logos &amp; Identity Assets
                  </h2>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Direct master vector and raster files stored in{" "}
                  <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono">
                    public/images/
                  </code>
                  .
                </p>
              </div>
              <span className="text-xs text-stone-400 font-mono">Original Brand Marks</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Logo 1 */}
              <div className="border border-stone-200 dark:border-stone-700 rounded-2xl p-4 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Full Brand Logo
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-medium">
                    Color + Text
                  </span>
                </div>
                <div className="aspect-[16/10] rounded-xl overflow-hidden bg-white border border-stone-200 p-3 flex items-center justify-center relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/Banky Hotel & Suites Main Logo plus..png?t=${refreshKey}`}
                    alt="Banky Full Brand Logo"
                    loading="lazy"
                    decoding="async"
                    className="relative z-10 max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `/images/banky-desktop-logo.png?t=${refreshKey}`;
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-mono text-stone-700 dark:text-stone-300 font-medium truncate">
                    Banky Hotel &amp; Suites Main Logo plus..png
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Towers + crescent arch + &quot;BANKY HOTEL &amp; SUITES&quot;
                  </p>
                </div>
              </div>

              {/* Logo 2 */}
              <div className="border border-stone-200 dark:border-stone-700 rounded-2xl p-4 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Architectural Mark
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium">
                    Color Icon
                  </span>
                </div>
                <div className="aspect-[16/10] rounded-xl overflow-hidden bg-white border border-stone-200 p-3 flex items-center justify-center relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/Banky Hotel & Suites Main Logo plus.png?t=${refreshKey}`}
                    alt="Banky 3-Tower Icon Mark"
                    loading="lazy"
                    decoding="async"
                    className="relative z-10 max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `/images/Banky Hotel & Suites Main Logo 1.png?t=${refreshKey}`;
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-mono text-stone-700 dark:text-stone-300 font-medium truncate">
                    Banky Hotel &amp; Suites Main Logo plus.png
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Royal blue 3-tower skyline with golden horizon crescent
                  </p>
                </div>
              </div>

              {/* Logo 3 */}
              <div className="border border-stone-200 dark:border-stone-700 rounded-2xl p-4 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    White Silhouette Mark
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-900 dark:bg-stone-800 text-stone-100 font-medium">
                    Monochrome
                  </span>
                </div>
                <div className="aspect-[16/10] rounded-xl overflow-hidden bg-[#14120f] border border-stone-800 p-3 flex items-center justify-center relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/Banky Hotel & Suites Main Logo 2 plus..png?t=${refreshKey}`}
                    alt="Banky White Silhouette Logo"
                    loading="lazy"
                    decoding="async"
                    className="relative z-10 max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `/images/Banky Hotel & Suites Main Logo 2 plus.png?t=${refreshKey}`;
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-mono text-stone-700 dark:text-stone-300 font-medium truncate">
                    Banky Hotel &amp; Suites Main Logo 2 plus..png
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Pure white silhouette mark for dark backdrops &amp; footer
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Uploads Table */}
          {recentUploads.length > 0 && (
            <div className="bg-white dark:bg-[#201d19] border border-[#ece6dd] dark:border-stone-800 rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg text-stone-900 dark:text-white mb-4">
                Files Saved in this Session
              </h3>
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {recentUploads.map((f, i) => (
                  <div key={i} className="py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${f.url}?t=${refreshKey}`}
                          alt={f.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-semibold text-stone-900 dark:text-white">
                          {f.name}
                        </p>
                        <p className="text-xs text-stone-500">
                          {f.size > 0 && `${(f.size / 1024).toFixed(1)} KB · `}
                          {f.roomMatch && `Mapped to ${f.roomMatch}`}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Saved in public/images
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ROOM VIDEO HEADERS                                */}
      {/* ======================================================== */}
      {activeTab === "videos" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#201d19] border border-[#ece6dd] dark:border-stone-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-condensed uppercase tracking-wider font-semibold text-stone-500">
                    High-Definition Video Headers
                  </span>
                </div>
                <h2 className="font-display text-2xl text-stone-900 dark:text-white">
                  Room Video Tours &amp; Headers
                </h2>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                  Each room page renders a dynamic full-bleed video header with speed controls (1x, 0.75x, 0.5x) and audio toggle. Upload new .mp4 or .webm files here to instantly update any room.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  id="open-video-header-uploader-btn"
                  onClick={() => {
                    setVideoUploadTargetSlug("luxury-suite");
                    setVideoUploadModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-condensed uppercase tracking-wider text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4 stroke-[2.5]" />
                  <span>Upload &amp; Save Video Header</span>
                </button>
                <div className="flex items-center gap-2 text-xs font-mono text-stone-500 bg-stone-100 dark:bg-stone-800/80 px-3 py-2 rounded-xl">
                  <span>Storage target:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">/public/videos/</span>
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {ROOMS.map((room) => {
                const serverItem = serverVideoMap[room.slug];
                const activeSrc =
                  activeVideoMap[room.slug] ||
                  serverItem?.url ||
                  `/videos/${room.slug}-room.mp4?t=${refreshKey}`;
                const isUploadingThis = uploadingVideoSlug === room.slug;
                const hasPlaybackError = !!videoPlaybackErrors[room.slug];
                const existsOnDisk = serverItem ? serverItem.exists : true;
                const fileSizeMB = serverItem?.size
                  ? `${(serverItem.size / (1024 * 1024)).toFixed(1)} MB`
                  : null;

                return (
                  <div
                    key={room.slug}
                    className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-900/50 flex flex-col hover:border-amber-400/50 transition-all shadow-sm"
                  >
                    {/* Header Video Preview Player */}
                    <div className="relative aspect-video bg-stone-950 overflow-hidden group">
                      {/* Baseline Photo Backdrop */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={room.image}
                        alt={room.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none"
                      />

                      {/* Video element with direct src property and key binding */}
                      <video
                        key={`${room.slug}-${activeSrc}`}
                        src={activeSrc}
                        poster={room.image}
                        playsInline
                        muted
                        autoPlay
                        loop
                        crossOrigin="anonymous"
                        preload="auto"
                        onLoadStart={() => {
                          setLoadingVideoMap((prev) => ({ ...prev, [room.slug]: true }));
                        }}
                        onWaiting={() => {
                          setLoadingVideoMap((prev) => ({ ...prev, [room.slug]: true }));
                        }}
                        onLoadedMetadata={(e) => {
                          setLoadingVideoMap((prev) => ({ ...prev, [room.slug]: false }));
                          const video = e.currentTarget;
                          video.muted = true;
                          const playPromise = video.play();
                          if (playPromise !== undefined) {
                            playPromise
                              .then(() => {
                                setPlayingVideoMap((prev) => ({ ...prev, [room.slug]: true }));
                              })
                              .catch((err) => {
                                console.warn("Autoplay deferred for " + room.slug, err);
                                video.muted = true;
                                video.play().catch(() => {});
                              });
                          }
                        }}
                        onCanPlay={(e) => {
                          setLoadingVideoMap((prev) => ({ ...prev, [room.slug]: false }));
                          const video = e.currentTarget;
                          if (video.paused) {
                            video.muted = true;
                            const playPromise = video.play();
                            if (playPromise !== undefined) {
                              playPromise
                                .then(() => {
                                  setPlayingVideoMap((prev) => ({ ...prev, [room.slug]: true }));
                                })
                                .catch(() => {});
                            }
                          }
                        }}
                        onPlay={() => {
                          setLoadingVideoMap((prev) => ({ ...prev, [room.slug]: false }));
                          setPlayingVideoMap((prev) => ({ ...prev, [room.slug]: true }));
                        }}
                        onPause={() => {
                          setPlayingVideoMap((prev) => ({ ...prev, [room.slug]: false }));
                        }}
                        onError={() => {
                          setLoadingVideoMap((prev) => ({ ...prev, [room.slug]: false }));
                          if (!hasPlaybackError) {
                            setVideoPlaybackErrors((prev) => ({ ...prev, [room.slug]: true }));
                            // If primary fails, try fallback alias
                            const fallbackUrl = `/videos/${room.slug}.mp4?t=${refreshKey}`;
                            if (activeSrc !== fallbackUrl) {
                              setActiveVideoMap((prev) => ({ ...prev, [room.slug]: fallbackUrl }));
                            }
                          }
                        }}
                        onLoadedData={() => {
                          setLoadingVideoMap((prev) => ({ ...prev, [room.slug]: false }));
                          if (hasPlaybackError) {
                            setVideoPlaybackErrors((prev) => ({ ...prev, [room.slug]: false }));
                          }
                        }}
                        className="relative z-10 w-full h-full object-cover"
                      >
                        <source src={activeSrc} type="video/mp4" />
                        <source src={`/videos/${room.slug}.mp4?t=${refreshKey}`} type="video/mp4" />
                        <source src={`/videos/${room.slug}-room.mp4?t=${refreshKey}`} type="video/mp4" />
                        <source src={`/public/videos/${room.slug}-room.mp4?t=${refreshKey}`} type="video/mp4" />
                      </video>

                      {/* Active Video Header Badge */}
                      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[9px] sm:text-[10px] font-condensed uppercase tracking-wider text-amber-300 font-semibold shadow-sm">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              existsOnDisk && !hasPlaybackError
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-amber-400"
                            }`}
                          />
                          <span className="hidden xs:inline">
                            {existsOnDisk && !hasPlaybackError
                              ? (playingVideoMap[room.slug] ? "Video Header Active" : "Video Header Ready")
                              : "Live Tour Ready"}
                          </span>
                          <span className="xs:hidden">
                            {existsOnDisk && !hasPlaybackError ? "Video" : "Live"}
                          </span>
                          {fileSizeMB && (
                            <span className="text-white/70 font-mono text-[9px] hidden sm:inline">
                              ({fileSizeMB})
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Top Right Controls: Play/Pause Toggle & Enlarge */}
                      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 sm:gap-1.5">
                        <div className="relative inline-flex items-center justify-center shrink-0">
                          {loadingVideoMap[room.slug] && (
                            <span className="absolute -inset-0.5 rounded-full bg-amber-400/25 animate-pulse pointer-events-none" />
                          )}
                          <button
                            id={`admin-media-playback-${room.slug}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const container = e.currentTarget.closest(".relative");
                              const video = container?.querySelector("video");
                              if (video) {
                                if (video.paused) {
                                  video.muted = true;
                                  const playPromise = video.play();
                                  if (playPromise !== undefined) {
                                    playPromise
                                      .then(() => {
                                        setPlayingVideoMap((prev) => ({ ...prev, [room.slug]: true }));
                                      })
                                      .catch((err) => {
                                        console.warn("Video play() failed, retrying muted:", err);
                                        video.muted = true;
                                        const retry = video.play();
                                        if (retry !== undefined) {
                                          retry
                                            .then(() => {
                                              setPlayingVideoMap((prev) => ({ ...prev, [room.slug]: true }));
                                            })
                                            .catch(() => {});
                                        }
                                      });
                                  }
                                } else {
                                  video.pause();
                                  setPlayingVideoMap((prev) => ({ ...prev, [room.slug]: false }));
                                }
                              }
                            }}
                            className="relative inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-black/80 hover:bg-black backdrop-blur-md border border-white/20 text-[9px] sm:text-[10px] font-condensed tracking-wider uppercase text-white hover:text-amber-200 transition-colors shadow-sm cursor-pointer shrink-0"
                            title={playingVideoMap[room.slug] ? "Pause this room video header" : "Play this room video header"}
                            aria-label={playingVideoMap[room.slug] ? "Pause this room video header" : "Play this room video header"}
                          >
                            {loadingVideoMap[room.slug] ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-amber-300" />
                                <span className="hidden sm:inline">Loading...</span>
                              </>
                            ) : playingVideoMap[room.slug] ? (
                              <>
                                <Pause className="h-3 w-3 text-amber-300" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 fill-white text-white" />
                                <span>Play</span>
                              </>
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setEnlargedVideo({
                              name: room.name,
                              url: activeSrc,
                              slug: room.slug,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/80 hover:bg-black backdrop-blur-md border border-white/20 text-[10px] font-condensed uppercase tracking-wider text-amber-300 hover:text-amber-200 transition-colors shadow-sm cursor-pointer"
                          title="Enlarge video header in theater view"
                        >
                          <Maximize2 className="h-3 w-3 text-amber-300" />
                          <span>Theater</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setFileToDelete({
                              type: "video",
                              filename: `${room.slug}-room.mp4`,
                              slug: room.slug,
                              displayName: `${room.name} Video Header`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-[10px] font-condensed uppercase tracking-wider text-rose-300 hover:text-white transition-colors shadow-sm cursor-pointer"
                          title={`Delete video header for ${room.name}`}
                        >
                          <Trash2 className="h-3 w-3 text-rose-300" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Room Details & Actions */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-display text-lg text-stone-900 dark:text-white font-medium">
                            {room.name}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40 font-semibold">
                            ₦{room.rate.toLocaleString()} / night
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                          {room.blurb}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-stone-400 dark:text-stone-500 bg-white dark:bg-stone-800/80 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700/60">
                          <div className="truncate">
                            Path: <span className="text-stone-700 dark:text-stone-300 font-semibold">/videos/{room.slug}-room.mp4</span>
                          </div>
                          <span
                            className={`shrink-0 ml-2 text-[10px] px-1.5 py-0.5 rounded font-sans font-medium ${
                              existsOnDisk
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {existsOnDisk ? "Static Disk Verified" : "Ready for Upload"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setStitcherDefaultSlug(room.slug);
                              setStitcherOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-condensed uppercase tracking-wider text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title={`Stitch multi-clip video header for ${room.name}`}
                          >
                            <Film className="h-3.5 w-3.5" />
                            <span>Stitch Clips</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setVideoUploadTargetSlug(room.slug);
                              setVideoUploadModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-400 text-stone-700 dark:text-stone-300 hover:text-amber-900 dark:hover:text-amber-300 font-condensed uppercase tracking-wider text-xs font-semibold transition-all shadow-sm cursor-pointer"
                            title={`Select, preview, and save the main video header for ${room.name}`}
                          >
                            <Save className="h-3.5 w-3.5 text-amber-500" />
                            <span>Upload &amp; Save</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setFileToDelete({
                                type: "video",
                                filename: `${room.slug}-room.mp4`,
                                slug: room.slug,
                                displayName: `${room.name} Video Header`,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 font-condensed uppercase tracking-wider text-xs font-semibold transition-all shadow-sm cursor-pointer"
                            title={`Delete video header for ${room.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500 hover:text-white" />
                            <span>Delete Video</span>
                          </button>
                        </div>

                        <Link
                          href={`/rooms/${room.slug}?admin=true`}
                          target="_blank"
                          title="View live room page with admin header controls enabled"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-medium transition-colors"
                        >
                          <span>Live Page (Admin)</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: USAGE AUDIT REPORT                                */}
      {/* ======================================================== */}
      {activeTab === "audit" && (
        <UsageAuditReport
          files={allMediaFiles}
          summary={auditSummary}
          onOpenBatchRenameWithFiles={openBatchRenamerWithSelection}
          onDeleteFile={(fileName) =>
            setFileToDelete({
              type: "image",
              filename: fileName,
              displayName: fileName,
            })
          }
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 1: 16:10 Image Cropper Modal                       */}
      {/* ======================================================== */}
      <ImageCropperModal
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={cropImageSrc}
        fileName={cropFileName}
        defaultRoomSlug={cropDefaultRoomSlug}
        onCropComplete={handleCropComplete}
        onSkipCrop={handleSkipCrop}
      />

      {/* ======================================================== */}
      {/* MODAL 2: Batch Renamer Modal                             */}
      {/* ======================================================== */}
      <BatchRenamerModal
        isOpen={batchRenamerOpen}
        onClose={() => setBatchRenamerOpen(false)}
        files={allMediaFiles}
        selectedFileNames={batchSelectedNames}
        onRenameSuccess={() => {
          setRefreshKey(Date.now());
          fetchMediaData();
          setStatusMessage("Batch rename applied successfully.");
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 3: Video Stitcher Studio Modal                      */}
      {/* ======================================================== */}
      <VideoStitcherModal
        isOpen={stitcherOpen}
        onClose={() => setStitcherOpen(false)}
        defaultSlug={stitcherDefaultSlug}
        onStitchComplete={({ url, slug }) => {
          if (url && slug) {
            setActiveVideoMap((prev) => ({ ...prev, [slug]: url }));
            setVideoPlaybackErrors((prev) => ({ ...prev, [slug]: false }));
            setRecentlyUpdatedSlugs((prev) => [slug, ...prev.filter((s) => s !== slug)]);
          }
          setRefreshKey(Date.now());
          fetchMediaData();
          fetchVideoStatuses();
          setStatusMessage(`Room video header for ${slug || stitcherDefaultSlug} successfully stitched and deployed!`);
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 4: Enlarged Video Header Theater Preview Modal     */}
      {/* ======================================================== */}
      {enlargedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-amber-400" />
                <h3 className="font-display text-white text-base font-medium">
                  {enlargedVideo.name} — Full High-Definition Header
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEnlargedVideo(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                key={enlargedVideo.url}
                src={enlargedVideo.url}
                autoPlay
                controls
                loop
                playsInline
                className="w-full h-full object-cover"
              >
                <source src={enlargedVideo.url} type="video/mp4" />
                <source src={`/videos/${enlargedVideo.slug}.mp4?t=${refreshKey}`} type="video/mp4" />
              </video>
            </div>
            <div className="p-4 bg-stone-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-800">
              <div className="text-xs text-stone-400 font-mono">
                Source: <span className="text-amber-300">/videos/{enlargedVideo.slug}-room.mp4</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const s = enlargedVideo.slug;
                    setEnlargedVideo(null);
                    triggerRoomVideoUpload(s);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Replace Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { slug, name } = enlargedVideo;
                    setEnlargedVideo(null);
                    setFileToDelete({
                      type: "video",
                      filename: `${slug}-room.mp4`,
                      slug,
                      displayName: `${name} Video Header`,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  title="Permanently delete this room video header"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Video</span>
                </button>
                <Link
                  href={`/rooms/${enlargedVideo.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium transition-colors"
                >
                  <span>View Public Page</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Room Video Header Upload & Save Modal */}
      <RoomVideoUploadModal
        isOpen={videoUploadModalOpen}
        onClose={() => setVideoUploadModalOpen(false)}
        defaultSlug={videoUploadTargetSlug}
        onSaveComplete={({ url, slug }) => {
          setActiveVideoMap((prev) => ({ ...prev, [slug]: url }));
          setVideoPlaybackErrors((prev) => ({ ...prev, [slug]: false }));
          setRefreshKey(Date.now());
          setStatusMessage(`Successfully saved and activated main video header for ${slug}!`);
          fetchVideoStatuses();
        }}
      />

      {/* Confirmation Modal for Image & Video Deletion */}
      <ConfirmDeleteModal
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={fileToDelete?.type === "video" ? "Delete Room Video Header" : "Delete Media Image"}
        description={
          fileToDelete?.type === "video"
            ? `Are you sure you want to permanently delete the video header for ${fileToDelete?.displayName || fileToDelete?.slug}? The room will revert to still photography.`
            : `Are you sure you want to permanently delete "${fileToDelete?.displayName || fileToDelete?.filename}" from public/images/? This cannot be undone.`
        }
        itemName={fileToDelete?.displayName || fileToDelete?.filename}
        itemType={fileToDelete?.type || "item"}
        isDeleting={isDeletingMedia}
      />
    </div>
  );
}
