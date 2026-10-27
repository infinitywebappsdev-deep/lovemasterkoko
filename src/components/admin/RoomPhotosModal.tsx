"use client";

import React, { useState } from "react";
import { X, Trash2, Upload, Loader2, Image as ImageIcon, ExternalLink, CheckCircle2 } from "lucide-react";
import { Room } from "@/lib/hotel";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface RoomPhotoItem {
  url: string;
  name: string;
  label: string;
}

interface RoomPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  onUploadPhotos: (slug: string) => void;
  onPhotoDeleted?: (filename: string) => void;
}

export function RoomPhotosModal({
  isOpen,
  onClose,
  room,
  onUploadPhotos,
  onPhotoDeleted,
}: RoomPhotosModalProps) {
  const [photoToDelete, setPhotoToDelete] = useState<RoomPhotoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedNames, setDeletedNames] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !room) return null;

  // Build the list of images for this room
  let initialImages: RoomPhotoItem[] = [];
  if (room.slug === "deluxe") {
    initialImages = [
      { url: "/images/DELUXE MAIN1.jpeg", name: "DELUXE MAIN1.jpeg", label: "MAIN1" },
      { url: "/images/DELUXE MAIN2.jpeg", name: "DELUXE MAIN2.jpeg", label: "MAIN2" },
      { url: "/images/deluxe-main-1.jpg", name: "deluxe-main-1.jpg", label: "SLOT 3" },
      { url: "/images/deluxe.jpg", name: "deluxe.jpg", label: "HERO" },
    ];
  } else if (room.slug === "executive") {
    initialImages = [
      { url: "/images/EXECUTIVE Main.jpeg", name: "EXECUTIVE Main.jpeg", label: "MAIN1" },
      { url: "/images/EXECUTIVE MAIN2.jpeg", name: "EXECUTIVE MAIN2.jpeg", label: "MAIN2" },
      { url: "/images/executive.jpg", name: "executive.jpg", label: "HERO" },
    ];
  } else if (room.slug === "standard-plus") {
    initialImages = [
      { url: "/images/Standard PLUS.jpeg", name: "Standard PLUS.jpeg", label: "MAIN1" },
      { url: "/images/STANDARD PLUS MAIN .jpeg", name: "STANDARD PLUS MAIN .jpeg", label: "MAIN2" },
      { url: "/images/Standard Plus.jpg", name: "Standard Plus.jpg", label: "SLOT 3" },
    ];
  } else if (room.slug === "standard") {
    initialImages = [
      { url: "/images/Standard room.jpg", name: "Standard room.jpg", label: "MAIN1" },
      { url: "/images/standard.jpg", name: "standard.jpg", label: "HERO" },
      { url: "/images/Standard roomx.jpg", name: "Standard roomx.jpg", label: "SLOT 2" },
    ];
  } else if (room.images && room.images.length > 0) {
    initialImages = room.images.map((img, i) => {
      const cleanName = img.replace("/images/", "");
      return {
        url: img,
        name: cleanName,
        label: i === 0 ? "HERO" : `SLOT ${i + 1}`,
      };
    });
  } else if (room.image) {
    const cleanName = room.image.replace("/images/", "");
    initialImages = [
      {
        url: room.image,
        name: cleanName,
        label: "HERO",
      },
    ];
  }

  // Filter out deleted items
  const activePhotos = initialImages.filter((p) => !deletedNames.has(p.name));

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/admin/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image",
          filename: photoToDelete.name,
          slug: room.slug,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDeletedNames((prev) => new Set([...prev, photoToDelete.name]));
        setToastMessage(`Image "${photoToDelete.name}" deleted successfully.`);
        onPhotoDeleted?.(photoToDelete.name);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(data.error || "Failed to delete photo");
      }
    } catch (err) {
      console.error("Failed to delete photo:", err);
      alert("An error occurred while deleting the photo.");
    } finally {
      setIsDeleting(false);
      setPhotoToDelete(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
        <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-white text-lg font-medium">
                  {room.name} — Photography &amp; Gallery
                </h3>
                <p className="text-xs text-stone-400">
                  Manage individual room photos, preview in high resolution, or delete obsolete images.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Toast alert */}
          {toastMessage && (
            <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Photos Grid */}
          <div className="p-5 overflow-y-auto space-y-4">
            {activePhotos.length === 0 ? (
              <div className="text-center py-12 text-stone-400 space-y-3">
                <ImageIcon className="h-12 w-12 mx-auto text-stone-600 stroke-[1.5]" />
                <p className="text-sm">No photos remaining for this room category.</p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onUploadPhotos(room.slug);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold font-condensed uppercase tracking-wider"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Photos Now</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activePhotos.map((photo, idx) => (
                  <div
                    key={photo.name}
                    className="group bg-stone-950/60 border border-stone-800 rounded-xl overflow-hidden flex flex-col hover:border-stone-700 transition-colors"
                  >
                    <div className="relative aspect-[16/10] bg-black overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${photo.url}?t=${Date.now()}`}
                        alt={photo.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/hero.jpg";
                        }}
                      />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-amber-300">
                        {photo.label}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between gap-2 border-t border-stone-800/80">
                      <div className="truncate text-xs font-mono text-stone-300" title={photo.name}>
                        {photo.name}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPhotoToDelete(photo)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-condensed uppercase tracking-wider font-semibold transition-colors cursor-pointer shrink-0"
                        title={`Delete ${photo.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
            <span className="text-xs text-stone-400 font-mono">
              Total: {activePhotos.length} photo(s)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onUploadPhotos(room.slug);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-condensed uppercase tracking-wider font-bold transition-all cursor-pointer shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload New Photos</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-condensed uppercase tracking-wider font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal for individual photo deletion */}
      <ConfirmDeleteModal
        isOpen={!!photoToDelete}
        onClose={() => setPhotoToDelete(null)}
        onConfirm={handleDeletePhoto}
        title="Delete Room Photo"
        description={`Are you sure you want to permanently delete this photo from ${room.name}? This file will be removed from the server.`}
        itemName={photoToDelete?.name}
        itemType="image"
        isDeleting={isDeleting}
      />
    </>
  );
}
