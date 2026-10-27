"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { ROOMS, Room, naira } from "@/lib/hotel";
import { subscribeRooms, saveRoomCategory, deleteRoomCategory, seedDefaultRooms, getCachedRooms } from "@/lib/rooms-data";
import { Upload, CheckCircle2, Loader2, Video, Play, Pause, Maximize2, X, ExternalLink, Film, Save, Trash2, Image as ImageIcon, Plus, Edit2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { RoomSortDropdown, type RoomSortOption } from "@/components/admin/RoomSortDropdown";
import { VideoStitcherModal } from "@/components/admin/VideoStitcherModal";
import { RoomVideoUploadModal } from "@/components/admin/RoomVideoUploadModal";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";
import { RoomPhotosModal } from "@/components/admin/RoomPhotosModal";
import { RoomCategoryModal } from "@/components/admin/RoomCategoryModal";

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [uploadingVideoSlug, setUploadingVideoSlug] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [recentlyUpdatedSlugs, setRecentlyUpdatedSlugs] = useState<string[]>(["deluxe", "executive"]);
  const [sortOption, setSortOption] = useState<RoomSortOption>("custom_order");
  const [previewVideo, setPreviewVideo] = useState<{ name: string; url: string; slug: string } | null>(null);
  const [videoTimestamp, setVideoTimestamp] = useState<number>(0);
  const [cardViewMode, setCardViewMode] = useState<Record<string, "video" | "photo">>({});
  const [playingVideoSlugs, setPlayingVideoSlugs] = useState<Record<string, boolean>>({});
  const [loadingVideoSlugs, setLoadingVideoSlugs] = useState<Record<string, boolean>>({});
  const [stitcherOpen, setStitcherOpen] = useState(false);
  const [stitcherDefaultSlug, setStitcherDefaultSlug] = useState("standard-plus");
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModalSlug, setVideoModalSlug] = useState("luxury-suite");
  const [videoToDelete, setVideoToDelete] = useState<{ slug: string; name: string } | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const [photoManageRoom, setPhotoManageRoom] = useState<Room | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Room | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const selectedSlugRef = useRef<string>("deluxe");

  // Subscribe to live room categories
  useEffect(() => {
    const unsub = subscribeRooms((liveRooms) => {
      setRooms(liveRooms);
    });
    return () => unsub();
  }, []);

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;
    setIsDeletingVideo(true);
    try {
      const res = await fetch("/api/admin/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "video", slug: videoToDelete.slug }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Video header for ${videoToDelete.name} deleted successfully. Reverted to photo.`);
        setCardViewMode((prev) => ({ ...prev, [videoToDelete.slug]: "photo" }));
        setPlayingVideoSlugs((prev) => ({ ...prev, [videoToDelete.slug]: false }));
        setVideoTimestamp(Date.now());
        if (previewVideo?.slug === videoToDelete.slug) {
          setPreviewVideo(null);
        }
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        alert(data.error || "Failed to delete video");
      }
    } catch (err) {
      console.error("Failed to delete video:", err);
      alert("Error deleting video file");
    } finally {
      setIsDeletingVideo(false);
      setVideoToDelete(null);
    }
  };

  const handleTogglePlayback = (slug: string, container: HTMLElement | null) => {
    if (cardViewMode[slug] === "photo") {
      setCardViewMode((prev) => ({ ...prev, [slug]: "video" }));
      setTimeout(() => {
        const card = container || document.querySelector(`[data-room-card="${slug}"]`);
        const video = card?.querySelector("video");
        if (video) {
          video.muted = true;
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setPlayingVideoSlugs((prev) => ({ ...prev, [slug]: true }));
              })
              .catch((err) => {
                console.warn("Autoplay deferred, retrying muted:", err);
                video.muted = true;
                video.play().catch(() => {});
              });
          }
        }
      }, 50);
      return;
    }

    const card = container || document.querySelector(`[data-room-card="${slug}"]`);
    const video = card?.querySelector("video");
    if (!video) return;

    if (video.paused) {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlayingVideoSlugs((prev) => ({ ...prev, [slug]: true }));
          })
          .catch((err) => {
            console.warn("Playback initialization error, retrying muted:", err);
            video.muted = true;
            const retry = video.play();
            if (retry !== undefined) {
              retry
                .then(() => {
                  setPlayingVideoSlugs((prev) => ({ ...prev, [slug]: true }));
                })
                .catch(() => {});
            }
          });
      }
    } else {
      video.pause();
      setPlayingVideoSlugs((prev) => ({ ...prev, [slug]: false }));
    }
  };

  const sortedRooms = useMemo(() => {
    const list = [...rooms];
    if (sortOption === "name_asc") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortOption === "recently_updated") {
      return list.sort((a, b) => {
        const aIndex = recentlyUpdatedSlugs.indexOf(a.slug);
        const bIndex = recentlyUpdatedSlugs.indexOf(b.slug);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      });
    }
    // "custom_order" retains default catalog tier order
    return list;
  }, [rooms, sortOption, recentlyUpdatedSlugs]);

  const handleSaveCategory = async (savedRoom: Room) => {
    await saveRoomCategory(savedRoom);
    setSuccessMsg(`Room category "${savedRoom.name}" saved with rate ${naira(savedRoom.rate)}.`);
    setRecentlyUpdatedSlugs((prev) => [savedRoom.slug, ...prev.filter((s) => s !== savedRoom.slug)]);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleDeleteCategory = async (slug: string) => {
    await deleteRoomCategory(slug);
    setSuccessMsg(`Room category "${slug}" deleted.`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm("Restore the complete standard Banky Hotel & Suites 8 room categories and baseline rates?")) return;
    await seedDefaultRooms();
    setSuccessMsg("Restored default room categories successfully.");
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const triggerUpload = (slug: string) => {
    selectedSlugRef.current = slug;
    fileInputRef.current?.click();
  };

  const triggerVideoUpload = (slug: string) => {
    selectedSlugRef.current = slug;
    videoInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const slug = selectedSlugRef.current;
    setUploadingSlug(slug);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      formData.append("slug", slug);

      const res = await fetch("/api/upload-room-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Successfully uploaded ${files.length} photo(s) for ${slug}!`);
        setRecentlyUpdatedSlugs((prev) => [slug, ...prev.filter((s) => s !== slug)]);
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error("Admin upload failed:", err);
    } finally {
      setUploadingSlug(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const slug = selectedSlugRef.current;
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
        setSuccessMsg(`Successfully saved and activated video header for ${slug}!`);
        setRecentlyUpdatedSlugs((prev) => [slug, ...prev.filter((s) => s !== slug)]);
        setVideoTimestamp(Date.now());
        setCardViewMode((prev) => ({ ...prev, [slug]: "video" }));
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error("Admin video upload failed:", err);
    } finally {
      setUploadingVideoSlug(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs font-condensed uppercase tracking-wider font-semibold text-stone-500">
              Hotel Catalog &amp; Assets
            </span>
          </div>
          <h1 className="font-display text-3xl text-[#222] mb-1">Rooms Management</h1>
          <p className="text-sm text-[#666]">
            Manage room categories, landscape video headers, actual photography, rates, and inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setEditingCategory(null);
              setCategoryModalOpen(true);
            }}
            className="px-3.5 py-2 bg-[#ffbf00] hover:bg-[#e09e00] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Room Category</span>
          </button>

          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="px-3 py-2 text-stone-600 hover:text-stone-900 text-xs font-medium border border-stone-300 rounded-xl hover:bg-stone-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restore Banky Hotel default 8 room categories"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>

          <RoomSortDropdown value={sortOption} onChange={setSortOption} />
          {successMsg && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Header Announcement Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-4 sm:p-5 rounded-2xl border border-stone-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-300">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Full Landscape Video Headers Active</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-condensed uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                All 8 Rooms
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Every room page now features a high-definition video header with slow-motion speeds and sound controls.
              Use the <strong className="text-amber-300 font-semibold">Upload Video</strong> button below to replace or update the tour video for any room category at any time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <Link
            href="/admin/media"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-condensed uppercase tracking-wider text-stone-200 hover:text-white transition-colors"
          >
            <span>Media Studio</span>
          </Link>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={handleUpload}
      />

      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedRooms.map((room) => {
          const videoSrc = `/videos/${room.slug}-room.mp4?t=${videoTimestamp}`;
          const isPhotoOnly = cardViewMode[room.slug] === "photo";
          const isVideoPlaying = !isPhotoOnly && !!playingVideoSlugs[room.slug];
          return (
            <div key={room.slug} data-room-card={room.slug} className="bg-white border border-[#ece6dd] rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-amber-400/60 transition-all">
              <div className="relative h-52 w-full bg-stone-900 group overflow-hidden">
                {/* Baseline Room Photo Backdrop */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={room.image}
                  alt={room.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Active Live Video Header */}
                {!isPhotoOnly && (
                  <video
                    key={`${room.slug}-${videoTimestamp}`}
                    src={videoSrc}
                    poster={room.image}
                    autoPlay
                    loop
                    muted
                    playsInline
                    crossOrigin="anonymous"
                    preload="auto"
                    onLoadStart={() => {
                      setLoadingVideoSlugs((prev) => ({ ...prev, [room.slug]: true }));
                    }}
                    onWaiting={() => {
                      setLoadingVideoSlugs((prev) => ({ ...prev, [room.slug]: true }));
                    }}
                    onLoadedMetadata={(e) => {
                      setLoadingVideoSlugs((prev) => ({ ...prev, [room.slug]: false }));
                      const video = e.currentTarget;
                      video.muted = true;
                      const playPromise = video.play();
                      if (playPromise !== undefined) {
                        playPromise
                          .then(() => {
                            setPlayingVideoSlugs((prev) => ({ ...prev, [room.slug]: true }));
                          })
                          .catch((err) => {
                            console.warn("Autoplay deferred for " + room.slug, err);
                            video.muted = true;
                            video.play().catch(() => {});
                          });
                      }
                    }}
                    onCanPlay={(e) => {
                      setLoadingVideoSlugs((prev) => ({ ...prev, [room.slug]: false }));
                      const video = e.currentTarget;
                      if (video.paused) {
                        video.muted = true;
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                          playPromise
                            .then(() => {
                              setPlayingVideoSlugs((prev) => ({ ...prev, [room.slug]: true }));
                            })
                            .catch(() => {});
                        }
                      }
                    }}
                    onPlay={() => {
                      setLoadingVideoSlugs((prev) => ({ ...prev, [room.slug]: false }));
                      setPlayingVideoSlugs((prev) => ({ ...prev, [room.slug]: true }));
                    }}
                    onPause={() => {
                      setPlayingVideoSlugs((prev) => ({ ...prev, [room.slug]: false }));
                    }}
                    onError={(e) => {
                      setLoadingVideoSlugs((prev) => ({ ...prev, [room.slug]: false }));
                      const video = e.currentTarget;
                      if (video.src.includes("-room.mp4")) {
                        video.src = `/videos/${room.slug}.mp4?t=${videoTimestamp}`;
                        video.load();
                        const p = video.play();
                        if (p !== undefined) p.catch(() => {});
                      }
                    }}
                    className="relative z-10 w-full h-full object-cover"
                  >
                    <source src={videoSrc} type="video/mp4" />
                    <source src={`/videos/${room.slug}.mp4?t=${videoTimestamp}`} type="video/mp4" />
                    <source src={`/public/videos/${room.slug}-room.mp4?t=${videoTimestamp}`} type="video/mp4" />
                  </video>
                )}

                {/* Top Video Status Badge & View Mode Toggle */}
                <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] sm:text-[10px] font-condensed uppercase tracking-wider text-amber-300 font-semibold shadow-sm">
                    <span className={`w-1.5 h-1.5 rounded-full ${isVideoPlaying ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                    <span className="hidden xs:inline">{!isPhotoOnly ? (isVideoPlaying ? "Video Playing" : "Video Ready") : "Still Photo"}</span>
                    <span className="xs:hidden">{!isPhotoOnly ? "Live" : "Photo"}</span>
                  </span>
                </div>

                {/* Top Right Actions: Photo/Video Toggle, Play/Pause Toggle & Modal Preview */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCardViewMode((prev) => ({
                        ...prev,
                        [room.slug]: prev[room.slug] === "photo" ? "video" : "photo",
                      }))
                    }
                    className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 text-[9px] sm:text-[10px] font-condensed uppercase tracking-wider text-stone-200 hover:text-white transition-colors cursor-pointer shrink-0"
                    title={isPhotoOnly ? "Switch to Video Header preview" : "Switch to Photo view"}
                  >
                    <span className="hidden xs:inline">{isPhotoOnly ? "Show Video" : "Show Photo"}</span>
                    <span className="xs:hidden">{isPhotoOnly ? "Video" : "Photo"}</span>
                  </button>

                  <div className="relative inline-flex items-center justify-center shrink-0">
                    {!isPhotoOnly && loadingVideoSlugs[room.slug] && (
                      <span className="absolute -inset-0.5 rounded-full bg-amber-400/25 animate-pulse pointer-events-none" />
                    )}
                    <button
                      id={`admin-room-playback-${room.slug}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const card = e.currentTarget.closest("[data-room-card]") as HTMLElement | null;
                        handleTogglePlayback(room.slug, card);
                      }}
                      className="relative inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 text-[9px] sm:text-[10px] font-condensed tracking-wider uppercase text-amber-300 hover:text-amber-200 transition-colors shadow-sm cursor-pointer shrink-0"
                      title={isVideoPlaying ? "Pause active room video header" : "Play active room video header"}
                      aria-label={isVideoPlaying ? "Pause active room video header" : "Play active room video header"}
                    >
                      {!isPhotoOnly && loadingVideoSlugs[room.slug] ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-amber-300" />
                          <span className="hidden sm:inline">Loading...</span>
                        </>
                      ) : isVideoPlaying ? (
                        <>
                          <Pause className="h-3 w-3 text-amber-300" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-amber-300 text-amber-300" />
                          <span>Play</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewVideo({ name: room.name, url: videoSrc, slug: room.slug })}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 text-[10px] font-condensed uppercase tracking-wider text-stone-300 hover:text-white transition-colors cursor-pointer"
                    title="Enlarge video header in theater view"
                  >
                    <Maximize2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Theater</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoToDelete({ slug: room.slug, name: room.name })}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-[10px] font-condensed uppercase tracking-wider text-rose-300 hover:text-white transition-colors cursor-pointer"
                    title={`Delete video header for ${room.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Delete Video</span>
                  </button>
                </div>

                {/* Bottom Action Buttons */}
                <div className="absolute bottom-2.5 right-2.5 z-20 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStitcherDefaultSlug(room.slug);
                      setStitcherOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold backdrop-blur-sm transition-all cursor-pointer shadow-md"
                    title={`Stitch multi-clip video header for ${room.name}`}
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>Stitch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoModalSlug(room.slug);
                      setVideoModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold backdrop-blur-sm transition-all cursor-pointer shadow-md"
                    title={`Select, preview, and save the active video header for ${room.name}`}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Upload Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoManageRoom(room)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900/90 hover:bg-black text-amber-300 hover:text-amber-200 border border-amber-400/30 text-xs font-medium backdrop-blur-sm transition-all cursor-pointer shadow-md"
                    title={`View, manage, and delete photos for ${room.name}`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Photos &amp; Gallery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerUpload(room.slug)}
                    disabled={uploadingSlug === room.slug}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-medium backdrop-blur-sm transition-all cursor-pointer shadow-md disabled:opacity-60"
                    title={`Upload new photos for ${room.name}`}
                  >
                    {uploadingSlug === room.slug ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Link href={`/rooms/${room.slug}`} className="font-display text-lg text-[#222] hover:text-[#ffbf00] transition-colors flex items-center gap-1.5">
                      <span>{room.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                        {room.qty} units
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(room);
                          setCategoryModalOpen(true);
                        }}
                        className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        title={`Edit ${room.name} category name, price & details`}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-amber-600" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 line-clamp-2 mb-3 leading-relaxed">
                    {room.blurb}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm pt-2.5 border-t border-[#f3eee8]">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#888]">Nightly Rate</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(room);
                        setCategoryModalOpen(true);
                      }}
                      className="font-display text-[#ffbf00] hover:text-[#e09e00] font-semibold text-base flex items-center gap-1 group cursor-pointer"
                      title="Click to edit category name or nightly rate"
                    >
                      <span>{naira(room.rate)}</span>
                      <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-stone-400 transition-opacity" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-amber-400" />
                <h3 className="font-display text-white text-base font-medium">
                  {previewVideo.name} — Video Header Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-video bg-black">
              <video
                key={previewVideo.url}
                src={previewVideo.url}
                autoPlay
                controls
                loop
                playsInline
                crossOrigin="anonymous"
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  const playPromise = video.play();
                  if (playPromise !== undefined) {
                    playPromise.catch((err) => {
                      console.warn("Modal autoplay deferred, muted retry:", err);
                      video.muted = true;
                      video.play().catch(() => {});
                    });
                  }
                }}
                className="w-full h-full object-cover"
              >
                <source src={previewVideo.url} type="video/mp4" />
                <source src={previewVideo.url.replace("-room.mp4", ".mp4")} type="video/mp4" />
                <source src={`/public/videos/${previewVideo.slug}-room.mp4`} type="video/mp4" />
              </video>
            </div>
            <div className="p-4 bg-stone-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-800">
              <div className="text-xs text-stone-400 font-mono">
                Source: <span className="text-amber-300">/videos/{previewVideo.slug}-room.mp4</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="video-modal-playback-toggle"
                  type="button"
                  onClick={(e) => {
                    const modal = e.currentTarget.closest(".bg-stone-900") || e.currentTarget.closest(".fixed");
                    const video = modal?.querySelector("video");
                    if (video) {
                      if (video.paused) {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                          playPromise.catch((err) => {
                            console.warn("Modal play promise failed, retrying muted:", err);
                            video.muted = true;
                            video.play().catch(() => {});
                          });
                        }
                      } else {
                        video.pause();
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>Play/Pause</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = previewVideo.slug;
                    setPreviewVideo(null);
                    triggerVideoUpload(s);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Replace Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { slug, name } = previewVideo;
                    setPreviewVideo(null);
                    setVideoToDelete({ slug, name });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  title="Permanently delete this room video header"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Video</span>
                </button>
                <Link
                  href={`/rooms/${previewVideo.slug}`}
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

      {/* Video Stitcher Studio Modal */}
      <VideoStitcherModal
        isOpen={stitcherOpen}
        onClose={() => setStitcherOpen(false)}
        defaultSlug={stitcherDefaultSlug}
        onStitchComplete={({ slug }) => {
          setVideoTimestamp(Date.now());
          setRecentlyUpdatedSlugs((prev) => [slug, ...prev.filter((s) => s !== slug)]);
          setSuccessMsg(`Successfully stitched video header for ${slug}!`);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />

      {/* Room Video Header Upload & Save Modal */}
      <RoomVideoUploadModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        defaultSlug={videoModalSlug}
        onSaveComplete={({ slug }) => {
          setVideoTimestamp(Date.now());
          setRecentlyUpdatedSlugs((prev) => [slug, ...prev.filter((s) => s !== slug)]);
          setCardViewMode((prev) => ({ ...prev, [slug]: "video" }));
          setSuccessMsg(`Successfully saved and activated main video header for ${slug}!`);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />

      {/* Room Photos & Gallery Management Modal (With photo deletion) */}
      <RoomPhotosModal
        isOpen={!!photoManageRoom}
        onClose={() => setPhotoManageRoom(null)}
        room={photoManageRoom}
        onUploadPhotos={(slug) => triggerUpload(slug)}
        onPhotoDeleted={(filename) => {
          setSuccessMsg(`Photo "${filename}" deleted successfully.`);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />

      {/* Confirmation Modal for Video Deletion */}
      <ConfirmDeleteModal
        isOpen={!!videoToDelete}
        onClose={() => setVideoToDelete(null)}
        onConfirm={handleDeleteVideo}
        title="Delete Room Video Header"
        description={`Are you sure you want to delete the video header for ${videoToDelete?.name}? The public room page and admin catalog will immediately revert to still photography.`}
        itemName={videoToDelete ? `/videos/${videoToDelete.slug}-room.mp4` : undefined}
        itemType="video"
        isDeleting={isDeletingVideo}
      />

      {/* Room Category Add / Edit Modal */}
      <RoomCategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        room={editingCategory}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
}
