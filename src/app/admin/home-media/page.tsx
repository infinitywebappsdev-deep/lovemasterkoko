"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Video,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  ExternalLink,
  Check,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Layers,
  Sparkles,
  Search,
  X,
  Loader2,
  Film,
  Compass,
  FileCheck,
  Zap,
  FileEdit,
  CheckSquare,
  Square,
  Tag,
  ArrowRightLeft,
  RefreshCw,
  Smartphone,
  Laptop,
  HardDrive,
} from "lucide-react";
import {
  HomepageMediaConfig,
  DEFAULT_HOMEPAGE_MEDIA,
  subscribeHomepageMedia,
  saveHomepageMedia,
  resetHomepageMediaToDefaults,
  GalleryItem,
  ExperienceItem,
} from "@/lib/homepage-media";

type TabKey = "hero" | "gallery" | "about" | "experiences" | "videos";

interface PublicAsset {
  name: string;
  url: string;
  size: number;
  mtime: number;
}

export default function HomeMediaManagementPage() {
  const [config, setConfig] = useState<HomepageMediaConfig>(DEFAULT_HOMEPAGE_MEDIA);
  const [activeTab, setActiveTab] = useState<TabKey>("hero");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Available server assets
  const [availableImages, setAvailableImages] = useState<PublicAsset[]>([]);
  const [availableVideos, setAvailableVideos] = useState<PublicAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // Media Library Picker Modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<"image" | "video">("image");
  const [pickerTarget, setPickerTarget] = useState<string>(""); // e.g. "hero-video", "hero-poster", "about-1", "about-2", "gallery-add", "exp-0"
  const [pickerSearch, setPickerSearch] = useState("");

  // Permanent Delete Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ url: string; name: string; type: "image" | "video"; galleryId?: string } | null>(null);

  // Bulk Renamer Tool States
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [selectedVideoUrls, setSelectedVideoUrls] = useState<string[]>([]);
  const [bulkRenamerOpen, setBulkRenamerOpen] = useState(false);
  const [bulkRenamerType, setBulkRenamerType] = useState<"image" | "video">("image");
  const [bulkRenamerMode, setBulkRenamerMode] = useState<"slugify" | "prefix" | "category" | "replace">("slugify");
  const [bulkRenamerPrefix, setBulkRenamerPrefix] = useState("banky-gallery");
  const [bulkRenamerStartNum, setBulkRenamerStartNum] = useState(1);
  const [bulkRenamerPadZero, setBulkRenamerPadZero] = useState(true);
  const [bulkRenamerFind, setBulkRenamerFind] = useState("");
  const [bulkRenamerReplace, setBulkRenamerReplace] = useState("");
  const [bulkRenamerRows, setBulkRenamerRows] = useState<
    Array<{ id: string; oldUrl: string; oldName: string; newName: string; thumbnail?: string; category?: string }>
  >([]);
  const [isRenaming, setIsRenaming] = useState(false);

  // Video preview player in Hero tab
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlayingHeroVideo, setIsPlayingHeroVideo] = useState(true);
  const [isMutedHeroVideo, setIsMutedHeroVideo] = useState(true);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);

  // Show Toast Helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Subscribe to live Firestore homepage media config
  useEffect(() => {
    const unsub = subscribeHomepageMedia((liveConfig) => {
      setConfig(liveConfig);
    });
    return () => unsub();
  }, []);

  // Fetch server assets list
  const loadServerAssets = async () => {
    setIsLoadingAssets(true);
    try {
      const res = await fetch("/api/admin/home-media");
      const data = await res.json();
      if (data.ok) {
        if (data.availableImages) setAvailableImages(data.availableImages);
        if (data.availableVideos) setAvailableVideos(data.availableVideos);
      }
    } catch (e) {
      console.warn("Failed to query public assets:", e);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  useEffect(() => {
    loadServerAssets();
  }, []);

  // Save changes to Firestore and server
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await saveHomepageMedia(config);
      showToast("Home page media changes saved & activated site-wide!", "success");
    } catch (err: any) {
      showToast(`Failed to save: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Factory Defaults
  const handleResetDefaults = async () => {
    if (!window.confirm("Reset all home landing page images, videos, and captions back to factory defaults?")) {
      return;
    }
    setIsSaving(true);
    try {
      const reset = await resetHomepageMediaToDefaults();
      setConfig(reset);
      showToast("Home page media restored to default layout.", "info");
    } catch (err: any) {
      showToast("Failed to reset: " + err?.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Client-side automatic image pre-resizer: scales down large phone/camera images
  const preResizeImageClientSide = async (file: File, maxDim = 1600): Promise<File> => {
    if (!file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
      return file;
    }

    return new Promise((resolve) => {
      const img = document.createElement("img");
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const { width, height } = img;

        if (width <= maxDim && height <= maxDim && file.size < 600 * 1024) {
          resolve(file);
          return;
        }

        let targetWidth = width;
        let targetHeight = height;

        if (width > height) {
          if (width > maxDim) {
            targetHeight = Math.round((height * maxDim) / width);
            targetWidth = maxDim;
          }
        } else {
          if (height > maxDim) {
            targetWidth = Math.round((width * maxDim) / height);
            targetHeight = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const cleanBase = file.name.replace(/\.[^/.]+$/, "");
              const resizedFile = new File([blob], `${cleanBase}.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.86
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  };

  // Generic File Upload Handler with Automatic Resizing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: string, title?: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(`Optimizing & auto-resizing ${files.length} photo(s)...`);

    try {
      const targetMaxWidth = section === "hero" || section === "hero-poster" ? 1920 : 1280;
      const formData = new FormData();

      let originalTotalBytes = 0;
      let resizedTotalBytes = 0;

      for (let i = 0; i < files.length; i++) {
        const originalFile = files[i];
        originalTotalBytes += originalFile.size;

        let processedFile = originalFile;
        if (originalFile.type.startsWith("image/")) {
          setUploadProgress(`Resizing image ${i + 1}/${files.length} for optimal load speed...`);
          processedFile = await preResizeImageClientSide(originalFile, targetMaxWidth);
        }
        resizedTotalBytes += processedFile.size;
        formData.append("files", processedFile);
      }

      formData.append("section", section);
      if (title) formData.append("title", title);

      setUploadProgress(`Uploading & applying final progressive compression...`);
      const res = await fetch("/api/admin/home-media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const totalSaved = originalTotalBytes > resizedTotalBytes
        ? Math.round(((originalTotalBytes - resizedTotalBytes) / originalTotalBytes) * 100)
        : 0;

      showToast(
        totalSaved > 10
          ? `Uploaded & auto-resized ${data.count} photo(s) (Saved ~${totalSaved}% file size for fast landing page delivery)!`
          : `Uploaded & optimized ${data.count} photo(s) successfully!`,
        "success"
      );

      // Auto-assign uploaded asset based on target section
      if (data.assets && data.assets.length > 0) {
        const firstAsset = data.assets[0];

        if (section === "hero-video" && firstAsset.type === "video") {
          const updatedHeroConfig: HomepageMediaConfig = {
            ...config,
            hero: {
              ...config.hero,
              videoUrl: firstAsset.url,
              isVideoEnabled: true,
              ...(firstAsset.posterUrl ? { posterImage: firstAsset.posterUrl } : {}),
            },
          };
          setConfig(updatedHeroConfig);
          await saveHomepageMedia(updatedHeroConfig);
          showToast(`🎉 New video "${firstAsset.name}" is now live as the Home Page Video Header!`, "success");
          if (heroVideoRef.current) {
            heroVideoRef.current.load();
            heroVideoRef.current.play().catch(() => {});
          }
        } else if (section === "hero-poster" && firstAsset.type === "image") {
          setConfig((prev) => ({
            ...prev,
            hero: { ...prev.hero, posterImage: firstAsset.url },
          }));
        } else if (section === "about-1" && firstAsset.type === "image") {
          setConfig((prev) => ({
            ...prev,
            about: { ...prev.about, image1: firstAsset.url },
          }));
        } else if (section === "about-2" && firstAsset.type === "image") {
          setConfig((prev) => ({
            ...prev,
            about: { ...prev.about, image2: firstAsset.url },
          }));
        } else if (section === "gallery") {
          // Add all uploaded images into gallery
          const newGalleryItems: GalleryItem[] = data.assets
            .filter((a: any) => a.type === "image")
            .map((a: any, idx: number) => ({
              id: `gal-${Date.now()}-${idx}`,
              url: a.url,
              title: a.title || "Landing Page Photo",
              category: "General",
              active: true,
              order: (config.gallery?.length || 0) + idx + 1,
            }));

          setConfig((prev) => ({
            ...prev,
            gallery: [...(prev.gallery || []), ...newGalleryItems],
          }));
        }
      }

      // Refresh server assets list
      await loadServerAssets();
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      if (e?.target) {
        e.target.value = "";
      }
    }
  };

  // Direct Device Video Picker & Instant Hero Header Uploader
  const handleDirectDeviceVideoFile = async (file: File) => {
    if (!file) return;
    const isVideo =
      file.type.startsWith("video/") ||
      [".mp4", ".mov", ".webm", ".m4v", ".qt"].some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isVideo) {
      showToast("Please choose a valid video file (.mp4, .mov, or .webm).", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(`Uploading "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) from device...`);

    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("section", "hero-video");
      formData.append("title", "Home Video Header");

      setUploadProgress("Optimizing video with +faststart & extracting instant poster frame...");
      const res = await fetch("/api/admin/home-media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok || !data.assets || data.assets.length === 0) {
        throw new Error(data.error || "Failed to process video upload");
      }

      const uploadedVideo = data.assets[0];
      const updatedConfig: HomepageMediaConfig = {
        ...config,
        hero: {
          ...config.hero,
          videoUrl: uploadedVideo.url,
          isVideoEnabled: true,
          ...(uploadedVideo.posterUrl ? { posterImage: uploadedVideo.posterUrl } : {}),
        },
      };

      setConfig(updatedConfig);
      await saveHomepageMedia(updatedConfig);
      await loadServerAssets();

      showToast(`🎉 "${uploadedVideo.name}" successfully uploaded and activated as Home Page Video Header!`, "success");

      if (heroVideoRef.current) {
        heroVideoRef.current.load();
        heroVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      showToast(`Video upload failed: ${err.message}`, "error");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  // Batch resize existing gallery photos on server
  const [isBatchResizing, setIsBatchResizing] = useState(false);
  const handleBatchResizeGallery = async () => {
    if (!config.gallery || config.gallery.length === 0) return;
    setIsBatchResizing(true);
    showToast("Analyzing and resizing gallery photos for optimal load speeds...", "info");

    try {
      const filenames = config.gallery.map((g) => g.url.split("/").pop()).filter(Boolean) as string[];
      const res = await fetch("/api/admin/home-media/resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames, maxWidth: 1280 }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("All gallery photos successfully resized to optimal dimensions!", "success");
        await loadServerAssets();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast("Optimization notice: " + (err?.message || "Failed"), "error");
    } finally {
      setIsBatchResizing(false);
    }
  };

  // Single photo on-demand resize
  const handleResizeSingleImage = async (imgUrl: string) => {
    try {
      const res = await fetch("/api/admin/home-media/resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imgUrl, maxWidth: 1280 }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Auto-resized photo to ${data.result.dimensions} (${data.result.savingsPercent}% smaller)!`, "success");
        await loadServerAssets();
      }
    } catch (e: any) {
      showToast("Could not resize: " + e?.message, "error");
    }
  };

  // Open Bulk Renamer for Gallery or Videos
  const openBulkRenamerModal = (type: "image" | "video") => {
    setBulkRenamerType(type);
    setBulkRenamerMode("slugify");
    setBulkRenamerPrefix(type === "video" ? "banky-video" : "banky-gallery");
    setBulkRenamerStartNum(1);
    setBulkRenamerPadZero(true);
    setBulkRenamerFind("");
    setBulkRenamerReplace("");

    let itemsToRename: Array<{ id: string; oldUrl: string; oldName: string; thumbnail?: string; category?: string }> = [];

    if (type === "image") {
      const candidates =
        selectedGalleryIds.length > 0
          ? config.gallery.filter((g) => selectedGalleryIds.includes(g.id))
          : config.gallery;

      itemsToRename = candidates.map((c) => ({
        id: c.id,
        oldUrl: c.url,
        oldName: c.url.split("/").pop() || "image.jpg",
        thumbnail: c.url,
        category: c.category,
      }));
    } else {
      const candidates =
        selectedVideoUrls.length > 0
          ? availableVideos.filter((v) => selectedVideoUrls.includes(v.url))
          : availableVideos;

      itemsToRename = candidates.map((v) => ({
        id: v.url,
        oldUrl: v.url,
        oldName: v.name,
        thumbnail: undefined,
        category: "video",
      }));
    }

    if (itemsToRename.length === 0) {
      showToast(`No ${type === "video" ? "videos" : "photos"} available to rename.`, "info");
      return;
    }

    const rows = itemsToRename.map((item) => {
      const ext = item.oldName.includes(".") ? "." + item.oldName.split(".").pop()!.toLowerCase() : "";
      const base = item.oldName.substring(0, item.oldName.length - ext.length);
      const clean = base
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      return {
        ...item,
        newName: `${clean || "asset"}${ext}`,
      };
    });

    setBulkRenamerRows(rows);
    setBulkRenamerOpen(true);
  };

  // Recompute proposed names whenever rules change in Bulk Renamer
  const recomputeBulkRenames = (
    mode: "slugify" | "prefix" | "category" | "replace",
    prefix = bulkRenamerPrefix,
    startNum = bulkRenamerStartNum,
    padZero = bulkRenamerPadZero,
    find = bulkRenamerFind,
    replace = bulkRenamerReplace
  ) => {
    setBulkRenamerRows((prev) =>
      prev.map((row, idx) => {
        const ext = row.oldName.includes(".") ? "." + row.oldName.split(".").pop()!.toLowerCase() : "";
        const base = row.oldName.substring(0, row.oldName.length - ext.length);
        const padNumber = (num: number) => (padZero ? String(num).padStart(2, "0") : String(num));
        const currNum = startNum + idx;

        let computed = row.oldName;
        if (mode === "slugify") {
          const clean = base
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
          computed = `${clean || "asset"}${ext}`;
        } else if (mode === "prefix") {
          const cleanPrefix = (prefix || "asset").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
          computed = `${cleanPrefix}-${padNumber(currNum)}${ext}`;
        } else if (mode === "category") {
          const cat = (row.category || "general").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
          computed = `banky-${cat}-${padNumber(currNum)}${ext}`;
        } else if (mode === "replace") {
          if (find) {
            const rep = base.split(find).join(replace);
            const clean = rep
              .toLowerCase()
              .replace(/[^a-z0-9_-]+/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "");
            computed = `${clean || "asset"}${ext}`;
          }
        }

        return { ...row, newName: computed };
      })
    );
  };

  // Execute bulk rename operation
  const executeBulkRename = async () => {
    if (bulkRenamerRows.length === 0) return;
    setIsRenaming(true);

    try {
      const payload = {
        type: bulkRenamerType,
        renames: bulkRenamerRows.map((r) => ({
          oldUrl: r.oldUrl,
          newUrl: `/${bulkRenamerType === "video" ? "videos" : "images"}/${r.newName}`,
        })),
      };

      const res = await fetch("/api/admin/home-media/bulk-rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Bulk rename failed");
      }

      if (data.config) {
        setConfig(data.config);
        await saveHomepageMedia(data.config);
      }

      showToast(`Bulk renamed ${data.count} file(s) and synchronized all paths!`, "success");
      setBulkRenamerOpen(false);
      setSelectedGalleryIds([]);
      setSelectedVideoUrls([]);
      await loadServerAssets();
    } catch (err: any) {
      showToast("Bulk rename failed: " + err?.message, "error");
    } finally {
      setIsRenaming(false);
    }
  };

  // Open Media Picker for an existing image/video
  const openMediaPicker = (type: "image" | "video", target: string) => {
    setPickerType(type);
    setPickerTarget(target);
    setPickerSearch("");
    setPickerOpen(true);
  };

  // Select asset from picker
  const handleSelectAsset = (asset: PublicAsset) => {
    if (pickerTarget === "hero-video") {
      setConfig((prev) => ({ ...prev, hero: { ...prev.hero, videoUrl: asset.url, isVideoEnabled: true } }));
    } else if (pickerTarget === "hero-poster") {
      setConfig((prev) => ({ ...prev, hero: { ...prev.hero, posterImage: asset.url } }));
    } else if (pickerTarget === "about-1") {
      setConfig((prev) => ({ ...prev, about: { ...prev.about, image1: asset.url } }));
    } else if (pickerTarget === "about-2") {
      setConfig((prev) => ({ ...prev, about: { ...prev.about, image2: asset.url } }));
    } else if (pickerTarget === "gallery-add") {
      const newItem: GalleryItem = {
        id: `gal-${Date.now()}`,
        url: asset.url,
        title: asset.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
        category: "General",
        active: true,
        order: (config.gallery?.length || 0) + 1,
      };
      setConfig((prev) => ({ ...prev, gallery: [...prev.gallery, newItem] }));
    } else if (pickerTarget.startsWith("exp-")) {
      const index = parseInt(pickerTarget.replace("exp-", ""), 10);
      setConfig((prev) => {
        const nextExps = [...prev.experiences];
        if (nextExps[index]) {
          nextExps[index] = { ...nextExps[index], img: asset.url };
        }
        return { ...prev, experiences: nextExps };
      });
    }

    setPickerOpen(false);
    showToast(`Applied ${asset.name} to home page.`, "info");
  };

  // Gallery Item Controls: Add, Remove, Toggle, Reorder
  const handleRemoveFromGallery = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((g) => g.id !== id),
    }));
    showToast("Photo removed from home page gallery.", "info");
  };

  const handleToggleGalleryActive = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      gallery: prev.gallery.map((g) => (g.id === id ? { ...g, active: !g.active } : g)),
    }));
  };

  const handleUpdateGalleryField = (id: string, field: keyof GalleryItem, value: any) => {
    setConfig((prev) => ({
      ...prev,
      gallery: prev.gallery.map((g) => (g.id === id ? { ...g, [field]: value } : g)),
    }));
  };

  const handleMoveGalleryItem = (index: number, direction: "up" | "down") => {
    const newItems = [...config.gallery];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // re-index order
    newItems.forEach((item, idx) => {
      item.order = idx + 1;
    });

    setConfig((prev) => ({ ...prev, gallery: newItems }));
  };

  // Permanent Delete confirmation dialog
  const promptPermanentDelete = (url: string, name: string, type: "image" | "video", galleryId?: string) => {
    setFileToDelete({ url, name, type, galleryId });
    setDeleteConfirmOpen(true);
  };

  const executePermanentDelete = async () => {
    if (!fileToDelete) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/home-media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: fileToDelete.url,
          filename: fileToDelete.name,
          type: fileToDelete.type,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete file from disk");
      }

      // If it was part of gallery, remove it from list
      if (fileToDelete.galleryId) {
        setConfig((prev) => ({
          ...prev,
          gallery: prev.gallery.filter((g) => g.id !== fileToDelete.galleryId),
        }));
      }

      // If it was hero video, clear or fallback
      if (config.hero.videoUrl === fileToDelete.url) {
        setConfig((prev) => ({
          ...prev,
          hero: { ...prev.hero, videoUrl: "/videos/hero.mp4" },
        }));
      }

      showToast(`Permanently deleted ${fileToDelete.name} from server.`, "success");
      await loadServerAssets();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
      setDeleteConfirmOpen(false);
      setFileToDelete(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium transition-all transform animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-100 border border-emerald-700"
              : toast.type === "error"
              ? "bg-red-900 text-red-100 border border-red-700"
              : "bg-stone-900 text-stone-100 border border-stone-700"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="h-5 w-5 text-emerald-400" />
          ) : toast.type === "error" ? (
            <AlertCircle className="h-5 w-5 text-red-400" />
          ) : (
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            <span className="font-condensed uppercase tracking-wider text-xs font-semibold text-[var(--accent)]">
              Admin Visual Command
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900 dark:text-white">
            Home Page Video &amp; Image Management Center
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-2xl">
            Upload, replace, arrange, or permanently delete videos and pictures for the primary home landing page with real-time updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === "hero" && (
            <label className="btn-gold px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Upload className="h-4 w-4" />
              <span>Upload Device Video to Header</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleDirectDeviceVideoFile(f);
                  e.target.value = "";
                }}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          )}

          <Link
            href="/"
            target="_blank"
            className="px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <span>View Live Home Page</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className="px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Reset to factory default images & videos"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="btn-gold px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200 dark:border-stone-800">
        {[
          { key: "hero", label: "Hero Video & Header", icon: Video },
          { key: "gallery", label: "Photo Gallery Center", icon: ImageIcon, count: config.gallery?.length || 0 },
          { key: "about", label: "About & Story Images", icon: Layers },
          { key: "experiences", label: "Dining & Banqueting", icon: Compass },
          { key: "videos", label: "All Video Clips", icon: Film, count: availableVideos.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? "bg-[#ffbf00]/15 text-[#b38600] dark:text-[#ffbf00] border border-[#ffbf00]/30 shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    active
                      ? "bg-[#ffbf00]/30 text-stone-900 dark:text-white"
                      : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HERO MEDIA (VIDEO & IMAGES)                                        */}
      {/* ========================================================================= */}
      {activeTab === "hero" && (
        <div className="space-y-8">
          {/* Main Hero Card */}
          <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Left: Live Video Preview Player */}
              <div className="w-full lg:w-1/2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-condensed uppercase tracking-wider text-xs font-bold text-stone-600 dark:text-stone-300">
                      Live Hero Preview
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold font-mono">
                      1080p HD
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer mr-2">
                      <Upload className="h-3 w-3" />
                      <span>Upload from Device</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleDirectDeviceVideoFile(f);
                          e.target.value = "";
                        }}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        const vid = heroVideoRef.current;
                        if (!vid) return;
                        if (vid.paused) {
                          vid.play();
                          setIsPlayingHeroVideo(true);
                        } else {
                          vid.pause();
                          setIsPlayingHeroVideo(false);
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
                      title={isPlayingHeroVideo ? "Pause" : "Play"}
                    >
                      {isPlayingHeroVideo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const vid = heroVideoRef.current;
                        if (!vid) return;
                        vid.muted = !vid.muted;
                        setIsMutedHeroVideo(vid.muted);
                      }}
                      className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
                      title={isMutedHeroVideo ? "Unmute" : "Mute"}
                    >
                      {isMutedHeroVideo ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Video Frame with Drag & Drop */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingVideo(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingVideo(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingVideo(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleDirectDeviceVideoFile(f);
                  }}
                  className={`relative rounded-xl overflow-hidden aspect-video bg-black shadow-inner border transition-all group ${
                    isDraggingVideo
                      ? "border-[var(--accent)] ring-4 ring-[var(--accent)]/40 scale-[1.01]"
                      : "border-stone-800"
                  }`}
                >
                  <video
                    ref={heroVideoRef}
                    key={config.hero.videoUrl}
                    src={config.hero.videoUrl}
                    poster={config.hero.posterImage}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover object-center"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

                  {/* Drag and Drop Active Overlay */}
                  {isDraggingVideo && (
                    <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-center animate-in fade-in">
                      <div className="p-3.5 rounded-full bg-[var(--accent)] text-stone-900 shadow-xl animate-bounce">
                        <Upload className="h-8 w-8" />
                      </div>
                      <h4 className="font-display text-xl text-white">
                        Drop Video to Set as Home Header
                      </h4>
                      <p className="text-xs text-stone-300">
                        Release to upload directly and update the home page video header live.
                      </p>
                    </div>
                  )}

                  {/* On-screen live preview overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none">
                    <h3 className="font-display text-xl sm:text-2xl font-normal drop-shadow-md">
                      {config.hero.headline}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-200 drop-shadow">
                      {config.hero.tagline}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 flex items-center justify-between px-1">
                  <span className="font-mono truncate max-w-[280px]">
                    Source: {config.hero.videoUrl}
                  </span>
                  <span>Looping Background</span>
                </div>
              </div>

              {/* Right: Hero Video Settings & Controls */}
              <div className="w-full lg:w-1/2 space-y-6">
                <div>
                  <h3 className="font-display text-lg text-stone-900 dark:text-white mb-1">
                    Hero Video Header Controls
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Replace the background video of the home page landing hero, or switch to an image backdrop.
                  </p>
                </div>

                {/* Video Enable Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40">
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-white block">
                      Enable Looping Video Header
                    </span>
                    <span className="text-[11px] text-stone-500">
                      When off, the high-res poster and slideshow images will display instead.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.hero.isVideoEnabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, isVideoEnabled: e.target.checked },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
                  </label>
                </div>

                {/* Dedicated Direct Device Video Header Uploader Card */}
                <div className="p-5 rounded-2xl border-2 border-[var(--accent)]/40 bg-gradient-to-br from-[var(--accent)]/10 via-amber-500/5 to-transparent space-y-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[var(--accent)] text-stone-900 shadow-md">
                        <Film className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-2">
                          <span>Pick Video Directly from Device</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                            Live Header Sync
                          </span>
                        </h4>
                        <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">
                          Upload directly from your phone camera roll, tablet, or PC. Video is auto-optimized with +faststart and instantly set as the home page header.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Drop & Pick Area */}
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingVideo(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingVideo(false);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingVideo(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleDirectDeviceVideoFile(f);
                    }}
                    className={`block p-5 border-2 border-dashed rounded-xl transition-all cursor-pointer text-center ${
                      isDraggingVideo
                        ? "border-[var(--accent)] bg-[var(--accent)]/20 scale-[1.01]"
                        : "border-stone-300 dark:border-stone-700 bg-white/70 dark:bg-stone-900/60 hover:border-[var(--accent)] hover:bg-white dark:hover:bg-stone-900"
                    }`}
                  >
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDirectDeviceVideoFile(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                      disabled={isUploading}
                    />

                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 text-stone-400">
                        <Smartphone className="h-5 w-5 text-stone-500" />
                        <span className="text-stone-300 dark:text-stone-700">&bull;</span>
                        <Laptop className="h-5 w-5 text-stone-500" />
                        <span className="text-stone-300 dark:text-stone-700">&bull;</span>
                        <HardDrive className="h-5 w-5 text-stone-500" />
                      </div>

                      <div className="btn-gold px-5 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 shadow-sm pointer-events-none">
                        <Upload className="h-4 w-4" />
                        <span>{isUploading ? "Uploading & Optimizing..." : "Select Video from This Device"}</span>
                      </div>

                      <span className="text-[11px] text-stone-500 dark:text-stone-400">
                        or drag and drop your video file here &bull; Supports iPhone &amp; Android camera clips (.mp4, .mov, .webm)
                      </span>
                    </div>
                  </label>

                  {/* Live upload progress banner if uploading */}
                  {isUploading && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-stone-900 dark:text-white block truncate">
                          {uploadProgress || "Uploading and activating header video..."}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          Streaming optimization &bull; Live Home Header sync active
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hero Video URL Selector & Vault Browser */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                    Current Video File URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.hero.videoUrl}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, videoUrl: e.target.value },
                        }))
                      }
                      className="flex-1 px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono text-stone-900 dark:text-white"
                      placeholder="/videos/hero.mp4"
                    />
                    <button
                      type="button"
                      onClick={() => openMediaPicker("video", "hero-video")}
                      className="px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors whitespace-nowrap"
                    >
                      Browse Videos
                    </button>
                  </div>
                </div>

                {/* Hero Fallback Poster Image */}
                <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Fallback Poster Image
                    </label>
                    <span className="text-[11px] text-stone-500">Shows instantly before video stream initiates</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-28 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 shrink-0">
                      <Image
                        src={config.hero.posterImage || "/images/exterior-night.jpg"}
                        alt="Hero poster"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={config.hero.posterImage}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, posterImage: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono text-stone-900 dark:text-white"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openMediaPicker("image", "hero-poster")}
                          className="px-3 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-200"
                        >
                          Select Poster Picture
                        </button>
                        <label className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-stone-900 text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                          Upload Poster
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, "hero-poster")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hero Text Customizer */}
                <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    Hero Headline &amp; Tagline
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-stone-500 block mb-1">Headline</label>
                      <input
                        type="text"
                        value={config.hero.headline}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, headline: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-stone-500 block mb-1">Tagline</label>
                      <input
                        type="text"
                        value={config.hero.tagline}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, tagline: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PHOTO GALLERY CENTER (Upload, Add, Remove, Delete Pictures)          */}
      {/* ========================================================================= */}
      {activeTab === "gallery" && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 p-5 rounded-2xl shadow-sm">
            <div>
              <h2 className="font-display text-lg text-stone-900 dark:text-white">
                Landing Page Photo Gallery ({config.gallery.length} Pictures)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Pictures shown in the visual grid of the homepage. You can upload new photos, select from server library, reorder, or permanently delete files.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {config.gallery.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedGalleryIds.length === config.gallery.length) {
                      setSelectedGalleryIds([]);
                    } else {
                      setSelectedGalleryIds(config.gallery.map((g) => g.id));
                    }
                  }}
                  className="px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 transition-colors"
                >
                  {selectedGalleryIds.length === config.gallery.length ? (
                    <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span>{selectedGalleryIds.length === config.gallery.length ? "Deselect All" : "Select All"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => openBulkRenamerModal("image")}
                className="px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Bulk rename gallery files to maintain clean URL paths"
              >
                <FileEdit className="h-4 w-4 text-[var(--accent)]" />
                <span>Bulk Rename {selectedGalleryIds.length > 0 ? `(${selectedGalleryIds.length})` : "Gallery"}</span>
              </button>

              <label className="btn-gold px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm">
                <Upload className="h-4 w-4" />
                <span>Upload New Pictures</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "gallery")}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>

              <button
                type="button"
                onClick={() => openMediaPicker("image", "gallery-add")}
                className="px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add from Media Library</span>
              </button>
            </div>
          </div>

          {/* Automatic Resizing Performance Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <span>Automatic Image Resizing &amp; Fast-Load Engine</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-semibold">Active</span>
                </h4>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">
                  Uploaded photos are automatically downscaled to 1280px with progressive JPEG compression and EXIF metadata stripping, guaranteeing sub-second load times on the landing page.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBatchResizeGallery}
              disabled={isBatchResizing}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm disabled:opacity-50"
            >
              {isBatchResizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>{isBatchResizing ? "Optimizing..." : "Batch Optimize Gallery"}</span>
            </button>
          </div>

          {/* Upload progress banner */}
          {isUploading && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                {uploadProgress || "Uploading files to server..."}
              </span>
            </div>
          )}

          {/* Gallery Items Grid */}
          {config.gallery.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-white/40 dark:bg-stone-900/20">
              <ImageIcon className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <h3 className="font-display text-lg text-stone-700 dark:text-stone-300">No Pictures in Gallery</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                Upload photos or pick from your existing media files to showcase your hotel on the home page.
              </p>
              <button
                type="button"
                onClick={() => openMediaPicker("image", "gallery-add")}
                className="btn-gold px-5 py-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Choose Photos</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {config.gallery.map((item, index) => {
                const isSelected = selectedGalleryIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`relative flex flex-col bg-white dark:bg-[#1a1815] border rounded-2xl overflow-hidden transition-all duration-200 shadow-sm ${
                      isSelected
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                        : item.active
                        ? "border-stone-200 dark:border-stone-800 hover:border-[var(--accent)]"
                        : "border-dashed border-stone-300 dark:border-stone-700 opacity-60"
                    }`}
                  >
                    {/* Image Frame */}
                    <div className="relative aspect-[16/11] bg-stone-100 dark:bg-stone-900 overflow-hidden group">
                      <Image
                        src={item.url}
                        alt={item.title || "Gallery photo"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGalleryIds((prev) =>
                            prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                          );
                        }}
                        className={`absolute top-2.5 left-2.5 p-1 rounded-md backdrop-blur-md transition-all z-10 ${
                          isSelected
                            ? "bg-[var(--accent)] text-stone-900 shadow-md ring-2 ring-white"
                            : "bg-black/60 text-white hover:bg-black/80"
                        }`}
                        title={isSelected ? "Selected (click to unselect)" : "Select for bulk rename"}
                      >
                        {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      </button>

                      {/* Order Badge */}
                      <div className="absolute top-2.5 left-10 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono font-bold">
                        #{index + 1}
                      </div>

                      {/* Active Status Badge */}
                      <button
                        type="button"
                        onClick={() => handleToggleGalleryActive(item.id)}
                        className={`absolute top-2.5 right-2.5 p-1.5 rounded-md backdrop-blur-md transition-colors ${
                          item.active
                            ? "bg-emerald-600/80 text-white hover:bg-emerald-700"
                            : "bg-stone-800/80 text-stone-400 hover:bg-stone-700"
                        }`}
                        title={item.active ? "Active on Home Page (click to hide)" : "Hidden (click to show)"}
                      >
                        {item.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>

                    {/* Reorder Buttons Overlay */}
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleMoveGalleryItem(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-white hover:text-[var(--accent)] disabled:opacity-30"
                        title="Move Left / Earlier"
                      >
                        <MoveUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveGalleryItem(index, "down")}
                        disabled={index === config.gallery.length - 1}
                        className="p-1 text-white hover:text-[var(--accent)] disabled:opacity-30"
                        title="Move Right / Later"
                      >
                        <MoveDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Content & Meta Controls */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-condensed uppercase tracking-wider text-stone-500 block">
                          Caption / Title
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateGalleryField(item.id, "title", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs font-medium text-stone-900 dark:text-white"
                          placeholder="Photo title"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-condensed uppercase tracking-wider text-stone-500 block">
                          Category
                        </label>
                        <select
                          value={item.category || "General"}
                          onChange={(e) => handleUpdateGalleryField(item.id, "category", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200"
                        >
                          <option value="Lobby">Lobby &amp; Reception</option>
                          <option value="Dining">Dining &amp; Restaurant</option>
                          <option value="Bar">Bar &amp; Lounge</option>
                          <option value="Rooms">Rooms &amp; Suites</option>
                          <option value="Events">Events &amp; Hall</option>
                          <option value="Exterior">Exterior &amp; Grounds</option>
                          <option value="General">General Atmosphere</option>
                        </select>
                      </div>

                      <div className="text-[10px] text-stone-400 font-mono truncate" title={item.url}>
                        {item.url}
                      </div>
                    </div>

                    {/* Card Actions: Resize, Remove from Landing Page, Delete File */}
                    <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleResizeSingleImage(item.url)}
                        className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1"
                        title="Re-run automatic resizing & progressive compression on this image"
                      >
                        <Zap className="h-3 w-3" />
                        <span>Resize</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveFromGallery(item.id)}
                          className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-medium py-1"
                          title="Remove from home landing page (file remains on server)"
                        >
                          Remove
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            promptPermanentDelete(
                              item.url,
                              item.url.split("/").pop() || "image",
                              "image",
                              item.id
                            )
                          }
                          className="text-[11px] text-red-600 hover:text-red-700 dark:text-red-400 font-medium inline-flex items-center gap-1 py-1"
                          title="Delete image file permanently from disk"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ABOUT & STORY IMAGES                                               */}
      {/* ========================================================================= */}
      {activeTab === "about" && (
        <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
          <div>
            <h2 className="font-display text-xl text-stone-900 dark:text-white">
              About &amp; Story Showcase Photos
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              The dual vertical showcase images displayed in the &ldquo;Enjoy a Calm Haven in Ado-Ekiti&rdquo; section.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Image 1: Hotel Front/Exterior */}
            <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-condensed uppercase tracking-wider text-xs font-bold text-[var(--accent)]">
                  Primary Story Image (Left)
                </span>
                <span className="text-[11px] text-stone-500">Aspect ~ 16:19</span>
              </div>

              <div className="relative aspect-[16/19] rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 group">
                <Image
                  src={config.about.image1 || "/images/hotel-front-right.jpg"}
                  alt={config.about.image1Alt || "About photo 1"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={config.about.image1}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      about: { ...prev.about, image1: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono text-stone-900 dark:text-white"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openMediaPicker("image", "about-1")}
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100"
                  >
                    Select from Library
                  </button>

                  <label className="flex-1 btn-gold px-3 py-2 rounded-lg text-xs font-semibold text-center cursor-pointer">
                    Upload New
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "about-1")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Image 2: Garden Bar / Lounge */}
            <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-condensed uppercase tracking-wider text-xs font-bold text-[var(--accent)]">
                  Secondary Story Image (Right)
                </span>
                <span className="text-[11px] text-stone-500">Aspect ~ 16:19</span>
              </div>

              <div className="relative aspect-[16/19] rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 group">
                <Image
                  src={config.about.image2 || "/images/OpenBar Garden.jpg"}
                  alt={config.about.image2Alt || "About photo 2"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={config.about.image2}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      about: { ...prev.about, image2: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono text-stone-900 dark:text-white"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openMediaPicker("image", "about-2")}
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100"
                  >
                    Select from Library
                  </button>

                  <label className="flex-1 btn-gold px-3 py-2 rounded-lg text-xs font-semibold text-center cursor-pointer">
                    Upload New
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "about-2")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DINING & BANQUETING EXPERIENCES CARDS                               */}
      {/* ========================================================================= */}
      {activeTab === "experiences" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 p-6 rounded-2xl shadow-sm">
            <h2 className="font-display text-xl text-stone-900 dark:text-white">
              Dining &amp; Banqueting Feature Banners
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Customize the images and headlines for Restaurant, Bar, and Banqueting Hall on the landing page.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {config.experiences.map((exp, idx) => (
              <div
                key={exp.id}
                className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden p-5 flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="relative aspect-[16/12] rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 group">
                    <Image src={exp.img} alt={exp.title} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => openMediaPicker("image", `exp-${idx}`)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>Change Image</span>
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-condensed uppercase tracking-wider text-stone-500 block">
                      Badge Tag
                    </label>
                    <input
                      type="text"
                      value={exp.tag}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig((prev) => {
                          const n = [...prev.experiences];
                          n[idx] = { ...n[idx], tag: val };
                          return { ...prev, experiences: n };
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs font-semibold text-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-condensed uppercase tracking-wider text-stone-500 block">
                      Card Title
                    </label>
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig((prev) => {
                          const n = [...prev.experiences];
                          n[idx] = { ...n[idx], title: val };
                          return { ...prev, experiences: n };
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs font-medium text-stone-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-condensed uppercase tracking-wider text-stone-500 block">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={exp.copy}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig((prev) => {
                          const n = [...prev.experiences];
                          n[idx] = { ...n[idx], copy: val };
                          return { ...prev, experiences: n };
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs text-stone-700 dark:text-stone-300"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400 font-mono">{exp.href}</span>
                  <button
                    type="button"
                    onClick={() => openMediaPicker("image", `exp-${idx}`)}
                    className="text-xs text-[var(--accent)] font-semibold hover:underline"
                  >
                    Swap Photo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ALL VIDEO CLIPS & VAULT                                            */}
      {/* ========================================================================= */}
      {activeTab === "videos" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 p-5 rounded-2xl shadow-sm">
            <div>
              <h2 className="font-display text-lg text-stone-900 dark:text-white">
                Hotel Video Vault ({availableVideos.length} Videos)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                All MP4 and web videos located in /public/videos/. You can preview, set any video as the home hero, upload new clips, or permanently delete.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {availableVideos.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVideoUrls.length === availableVideos.length) {
                      setSelectedVideoUrls([]);
                    } else {
                      setSelectedVideoUrls(availableVideos.map((v) => v.url));
                    }
                  }}
                  className="px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 transition-colors"
                >
                  {selectedVideoUrls.length === availableVideos.length ? (
                    <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span>{selectedVideoUrls.length === availableVideos.length ? "Deselect All" : "Select All"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => openBulkRenamerModal("video")}
                className="px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Bulk rename video files to maintain clean URL paths"
              >
                <FileEdit className="h-4 w-4 text-[var(--accent)]" />
                <span>Bulk Rename {selectedVideoUrls.length > 0 ? `(${selectedVideoUrls.length})` : "Videos"}</span>
              </button>

              <label className="btn-gold px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm">
                <Upload className="h-4 w-4" />
                <span>Upload New Video</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => handleFileUpload(e, "video-vault")}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableVideos.map((vid) => {
              const isCurrentHero = config.hero.videoUrl === vid.url;
              const isSelected = selectedVideoUrls.includes(vid.url);
              return (
                <div
                  key={vid.url}
                  className={`bg-white dark:bg-[#1a1815] border rounded-2xl overflow-hidden p-4 flex flex-col justify-between space-y-3 shadow-sm transition-all ${
                    isSelected
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                      : isCurrentHero
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
                      : "border-stone-200 dark:border-stone-800"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-stone-800 group">
                      <video
                        src={vid.url}
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />

                      {/* Video Selection Checkbox */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVideoUrls((prev) =>
                            prev.includes(vid.url) ? prev.filter((u) => u !== vid.url) : [...prev, vid.url]
                          );
                        }}
                        className={`absolute top-2.5 right-2.5 p-1 rounded-md backdrop-blur-md transition-all z-10 ${
                          isSelected
                            ? "bg-[var(--accent)] text-stone-900 shadow-md ring-2 ring-white"
                            : "bg-black/60 text-white hover:bg-black/80"
                        }`}
                        title={isSelected ? "Selected (click to unselect)" : "Select for bulk rename"}
                      >
                        {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      </button>

                      {isCurrentHero && (
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[var(--accent)] text-stone-900 text-[10px] font-bold uppercase tracking-wider shadow">
                          Active Hero Video
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-stone-900 dark:text-white truncate max-w-[200px]">
                        {vid.name}
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {(vid.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                    {!isCurrentHero ? (
                      <button
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, videoUrl: vid.url, isVideoEnabled: true },
                          }));
                          showToast(`Set ${vid.name} as Home Hero Video!`, "success");
                        }}
                        className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" />
                        <span>Set as Hero Video</span>
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        <span>Active on Hero</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => promptPermanentDelete(vid.url, vid.name, "video")}
                      className="text-xs text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                      title="Permanently delete video from server"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MEDIA LIBRARY PICKER MODAL                                                */}
      {/* ========================================================================= */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1f1d19] border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg text-stone-900 dark:text-white">
                  Select {pickerType === "video" ? "Video" : "Picture"} from Media Library
                </h3>
                <p className="text-xs text-stone-500">
                  Click any asset to apply it directly to the {pickerTarget} section.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/30 flex items-center gap-3">
              <Search className="h-4 w-4 text-stone-400 shrink-0" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search file name (e.g. Lobby, Garden, Deluxe, Hall)..."
                className="w-full bg-transparent text-xs text-stone-900 dark:text-white placeholder-stone-400 outline-none"
              />
              {pickerSearch && (
                <button onClick={() => setPickerSearch("")} className="text-stone-400 hover:text-stone-600 text-xs">
                  Clear
                </button>
              )}
            </div>

            {/* Modal Assets Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingAssets ? (
                <div className="py-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)] mx-auto mb-2" />
                  <p className="text-xs text-stone-500">Loading library files...</p>
                </div>
              ) : pickerType === "video" ? (
                /* Videos Grid */
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {availableVideos
                    .filter((v) => v.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                    .map((vid) => (
                      <button
                        key={vid.url}
                        type="button"
                        onClick={() => handleSelectAsset(vid)}
                        className="group text-left p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[var(--accent)] hover:shadow-md transition-all bg-stone-50 dark:bg-stone-900/50"
                      >
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2">
                          <video src={vid.url} className="w-full h-full object-cover" muted />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Play className="h-6 w-6 text-white drop-shadow" />
                          </div>
                        </div>
                        <span className="font-mono text-xs font-semibold text-stone-900 dark:text-white block truncate">
                          {vid.name}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {(vid.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </button>
                    ))}
                </div>
              ) : (
                /* Images Grid */
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                  {availableImages
                    .filter((img) => img.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                    .map((img) => (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => handleSelectAsset(img)}
                        className="group text-left p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[var(--accent)] hover:shadow-md transition-all bg-stone-50 dark:bg-stone-900/50"
                      >
                        <div className="relative aspect-[16/11] rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-800 mb-2">
                          <Image src={img.url} alt={img.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-stone-800 dark:text-stone-200 block truncate" title={img.name}>
                          {img.name}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {(img.size / 1024).toFixed(0)} KB
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/30">
              <span className="text-xs text-stone-500">
                {pickerType === "video" ? `${availableVideos.length} videos available` : `${availableImages.length} images available`}
              </span>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PERMANENT DELETE CONFIRMATION MODAL                                       */}
      {/* ========================================================================= */}
      {deleteConfirmOpen && fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1f1d19] border border-red-200 dark:border-red-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/60">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg text-stone-900 dark:text-white">
                Delete File Permanently?
              </h3>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="font-mono text-stone-900 dark:text-white">{fileToDelete.name}</strong> from server storage?
            </p>
            <p className="text-[11px] text-red-500 font-medium bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200/60 dark:border-red-900/40">
              ⚠️ Warning: This deletes the actual file from /public/{fileToDelete.type === "video" ? "videos" : "images"}/. Any other page referencing this file will no longer be able to display it.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePermanentDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Yes, Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK RENAMER & FILE PATH MANAGER MODAL                                    */}
      {/* ========================================================================= */}
      {bulkRenamerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
                  <FileEdit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-stone-900 dark:text-white flex items-center gap-2">
                    <span>Bulk Renamer &amp; File Path Cleaner</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono font-semibold uppercase">
                      {bulkRenamerType}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Batch rename {bulkRenamerRows.length} {bulkRenamerType === "video" ? "video file(s)" : "photo file(s)"}. Storage files and all landing page links will be atomically synchronized.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBulkRenamerOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Renaming Strategy Toolbar */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-[#141210] space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 mr-1">
                  Naming Rule:
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setBulkRenamerMode("slugify");
                    recomputeBulkRenames("slugify");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bulkRenamerMode === "slugify"
                      ? "bg-[var(--accent)] text-stone-900 shadow-sm"
                      : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100"
                  }`}
                >
                  Clean Kebab-Case
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBulkRenamerMode("prefix");
                    recomputeBulkRenames("prefix");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bulkRenamerMode === "prefix"
                      ? "bg-[var(--accent)] text-stone-900 shadow-sm"
                      : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100"
                  }`}
                >
                  Prefix + Numbering
                </button>

                {bulkRenamerType === "image" && (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkRenamerMode("category");
                      recomputeBulkRenames("category");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      bulkRenamerMode === "category"
                        ? "bg-[var(--accent)] text-stone-900 shadow-sm"
                        : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100"
                    }`}
                  >
                    Category Prefix
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setBulkRenamerMode("replace");
                    recomputeBulkRenames("replace");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bulkRenamerMode === "replace"
                      ? "bg-[var(--accent)] text-stone-900 shadow-sm"
                      : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100"
                  }`}
                >
                  Find &amp; Replace
                </button>
              </div>

              {/* Mode-specific configuration parameters */}
              {bulkRenamerMode === "prefix" && (
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <label className="text-stone-500 font-medium">Prefix:</label>
                    <input
                      type="text"
                      value={bulkRenamerPrefix}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkRenamerPrefix(val);
                        recomputeBulkRenames("prefix", val);
                      }}
                      className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white font-mono text-xs w-44"
                      placeholder="e.g. banky-gallery"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-stone-500 font-medium">Start #:</label>
                    <input
                      type="number"
                      min={1}
                      value={bulkRenamerStartNum}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setBulkRenamerStartNum(val);
                        recomputeBulkRenames("prefix", bulkRenamerPrefix, val);
                      }}
                      className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white font-mono text-xs w-20"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={bulkRenamerPadZero}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setBulkRenamerPadZero(val);
                        recomputeBulkRenames("prefix", bulkRenamerPrefix, bulkRenamerStartNum, val);
                      }}
                      className="rounded border-stone-300 text-[var(--accent)]"
                    />
                    <span>Pad with zero (01, 02...)</span>
                  </label>
                </div>
              )}

              {bulkRenamerMode === "category" && (
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                  <span className="text-stone-500">
                    Files will be named using their assigned categories (e.g. <code>banky-lobby-01.jpg</code>, <code>banky-dining-02.jpg</code>).
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={bulkRenamerPadZero}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setBulkRenamerPadZero(val);
                        recomputeBulkRenames("category", bulkRenamerPrefix, bulkRenamerStartNum, val);
                      }}
                      className="rounded border-stone-300 text-[var(--accent)]"
                    />
                    <span>Pad with zero</span>
                  </label>
                </div>
              )}

              {bulkRenamerMode === "replace" && (
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <label className="text-stone-500 font-medium">Find:</label>
                    <input
                      type="text"
                      value={bulkRenamerFind}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkRenamerFind(val);
                        recomputeBulkRenames("replace", bulkRenamerPrefix, bulkRenamerStartNum, bulkRenamerPadZero, val, bulkRenamerReplace);
                      }}
                      className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white font-mono text-xs w-36"
                      placeholder="e.g. IMG_"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-stone-500 font-medium">Replace with:</label>
                    <input
                      type="text"
                      value={bulkRenamerReplace}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkRenamerReplace(val);
                        recomputeBulkRenames("replace", bulkRenamerPrefix, bulkRenamerStartNum, bulkRenamerPadZero, bulkRenamerFind, val);
                      }}
                      className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white font-mono text-xs w-36"
                      placeholder="e.g. banky-suite-"
                    />
                  </div>
                </div>
              )}

              {bulkRenamerMode === "slugify" && (
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Converts spaces, underscores, and special symbols into lowercase hyphenated clean slugs (e.g. <code>Pool Bar Night.jpg</code> &rarr; <code>pool-bar-night.jpg</code>).
                </div>
              )}
            </div>

            {/* Collision warning banner if multiple items map to identical name */}
            {(() => {
              const duplicates = bulkRenamerRows
                .map((r) => r.newName.trim().toLowerCase())
                .filter((name, idx, arr) => arr.indexOf(name) !== idx && name !== "");
              const hasDuplicates = duplicates.length > 0;
              const hasEmpty = bulkRenamerRows.some((r) => !r.newName.trim());

              if (hasDuplicates || hasEmpty) {
                return (
                  <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {hasEmpty
                        ? "Some proposed filenames are blank. Please provide valid names."
                        : `Duplicate filenames detected (${duplicates.slice(0, 2).join(", ")}). Consider switching to Prefix + Numbering to keep filenames unique.`}
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Live Rename Preview Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-[11px] text-stone-400 px-2 flex items-center justify-between font-mono uppercase tracking-wider">
                <span>Original File</span>
                <span>Proposed New Filename (Editable)</span>
              </div>

              {bulkRenamerRows.map((row, idx) => {
                const isChanged = row.oldName !== row.newName;
                const isDupe = bulkRenamerRows.filter(
                  (r, i) => i !== idx && r.newName.trim().toLowerCase() === row.newName.trim().toLowerCase()
                ).length > 0;

                return (
                  <div
                    key={row.id + idx}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                      isDupe
                        ? "bg-red-500/5 border-red-500/40"
                        : isChanged
                        ? "bg-amber-500/5 border-amber-500/30"
                        : "bg-stone-50 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800"
                    }`}
                  >
                    {/* Item thumbnail and original name */}
                    <div className="flex items-center gap-3 min-w-0 sm:w-1/2">
                      {row.thumbnail ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 border border-stone-200 dark:border-stone-700">
                          <Image src={row.thumbnail} alt={row.oldName} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-800 text-[var(--accent)] flex items-center justify-center shrink-0">
                          <Video className="h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="font-mono text-xs text-stone-800 dark:text-stone-200 truncate" title={row.oldName}>
                          {row.oldName}
                        </div>
                        {row.category && (
                          <span className="text-[10px] text-stone-400 uppercase font-mono">
                            {row.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <div className="hidden sm:flex items-center justify-center text-stone-400 px-2 shrink-0">
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>

                    {/* Editable proposed new name */}
                    <div className="flex items-center gap-2 sm:w-1/2 min-w-0">
                      <input
                        type="text"
                        value={row.newName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkRenamerRows((prev) =>
                            prev.map((r, rIdx) => (rIdx === idx ? { ...r, newName: val } : r))
                          );
                        }}
                        className={`w-full px-3 py-1.5 rounded-lg border font-mono text-xs transition-colors ${
                          isDupe
                            ? "border-red-400 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200"
                            : isChanged
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-stone-900 dark:text-white"
                            : "border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                        }`}
                        placeholder="new-filename.ext"
                      />

                      {isChanged ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
                          New
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 shrink-0">
                          Same
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50 dark:bg-stone-900/40">
              <span className="text-xs text-stone-500 dark:text-stone-400 text-center sm:text-left">
                Files are renamed on disk and all gallery &amp; hero references updated seamlessly.
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setBulkRenamerOpen(false)}
                  disabled={isRenaming}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={executeBulkRename}
                  disabled={
                    isRenaming ||
                    bulkRenamerRows.length === 0 ||
                    bulkRenamerRows.some((r) => !r.newName.trim())
                  }
                  className="flex-1 sm:flex-none btn-gold px-5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isRenaming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Renaming Files...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4" />
                      <span>Apply Renaming ({bulkRenamerRows.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
