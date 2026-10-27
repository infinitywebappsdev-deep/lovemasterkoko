"use client";

import { useState, useEffect } from "react";
import { Room, naira } from "@/lib/hotel";
import { X, Save, Plus, Trash2, BedDouble, AlertCircle, CheckCircle2 } from "lucide-react";

interface RoomCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null; // null for Add New, Room for Edit
  onSave: (savedRoom: Room) => Promise<void>;
  onDelete?: (slug: string) => Promise<void>;
}

export function RoomCategoryModal({
  isOpen,
  onClose,
  room,
  onSave,
  onDelete,
}: RoomCategoryModalProps) {
  const isEditing = !!room;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [rate, setRate] = useState<number | string>(40000);
  const [qty, setQty] = useState<number | string>(4);
  const [occupancy, setOccupancy] = useState("2 Guests");
  const [bed, setBed] = useState("King Bed");
  const [blurb, setBlurb] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [image, setImage] = useState("/images/DELUXE MAIN1.jpeg");
  const [video, setVideo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync state whenever modal opens or active room changes
  useEffect(() => {
    if (room) {
      setName(room.name || "");
      setSlug(room.slug || "");
      setRate(room.rate || 30000);
      setQty(room.qty || 1);
      setOccupancy(room.occupancy || "2 Guests");
      setBed(room.bed || "King Bed");
      setBlurb(room.blurb || "");
      setFeaturesText(room.features ? room.features.join(", ") : "");
      setImage(room.image || "/images/Standard room.jpg");
      setVideo(room.video || "");
    } else {
      setName("");
      setSlug("");
      setRate(45000);
      setQty(2);
      setOccupancy("2 Guests");
      setBed("King Bed");
      setBlurb("");
      setFeaturesText("Smart TV, Air conditioning, Complimentary Wi-Fi, Rain shower, Work desk");
      setImage("/images/Standard room.jpg");
      setVideo("");
    }
    setErrorMessage("");
  }, [room, isOpen]);

  // Auto-generate slug when typing category name (only in Add mode)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage("Please enter a category name.");
      return;
    }

    const numRate = Number(rate);
    if (isNaN(numRate) || numRate <= 0) {
      setErrorMessage("Please enter a valid positive nightly rate (₦).");
      return;
    }

    const cleanSlug = (slug.trim() || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();

    const featuresList = featuresText
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const updatedRoom: Room = {
      slug: cleanSlug,
      name: cleanName,
      rate: numRate,
      qty: Number(qty) || 1,
      occupancy: occupancy.trim() || "2 Guests",
      bed: bed.trim() || "King Bed",
      blurb: blurb.trim() || `Comfortable and elegant accommodation in Banky Hotel & Suites' ${cleanName}.`,
      features: featuresList.length > 0 ? featuresList : ["Smart TV", "Air conditioning", "Complimentary Wi-Fi"],
      image: image.trim() || "/images/Standard room.jpg",
      images: room?.images && room.images.length > 0 ? room.images : [image.trim() || "/images/Standard room.jpg"],
      video: video.trim() || `/videos/${cleanSlug}-room.mp4`,
    };

    setIsSaving(true);
    setErrorMessage("");
    try {
      await onSave(updatedRoom);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save room category.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!room || !onDelete) return;
    if (!window.confirm(`Are you sure you want to delete room category "${room.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");
    try {
      await onDelete(room.slug);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to delete room category.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#ffbf00]/15 text-[#b38600]">
              <BedDouble className="h-5 w-5 text-[#ffbf00]" />
            </span>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900">
                {isEditing ? `Edit Room Category: ${room?.name}` : "Add New Room Category"}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Update category details, nightly rates (₦), bed types, units, and descriptions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
          {/* Category Name & Nightly Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Royal Presidential Suite"
                className="w-full h-10 px-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Nightly Rate (₦) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 font-bold">₦</span>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="50000"
                  className="w-full h-10 pl-7 pr-3 rounded-xl border border-stone-300 text-stone-900 font-mono font-bold focus:outline-none focus:border-[#ffbf00]"
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                Preview: <strong>{naira(Number(rate) || 0)}</strong> / night
              </span>
            </div>
          </div>

          {/* Slug & Units */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-stone-700 font-semibold mb-1">
                URL Identifier / Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={slug}
                disabled={isEditing}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ""))}
                placeholder="e.g. royal-presidential-suite"
                className={`w-full h-10 px-3 rounded-xl border border-stone-300 font-mono text-xs text-stone-900 focus:outline-none focus:border-[#ffbf00] ${
                  isEditing ? "bg-stone-100 text-stone-500 cursor-not-allowed" : "bg-white"
                }`}
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Public URL: /rooms/{slug || "slug"}
              </span>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Total Units (Inventory)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-stone-300 text-stone-900 font-mono focus:outline-none focus:border-[#ffbf00]"
              />
            </div>
          </div>

          {/* Bedding & Occupancy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Bed Type
              </label>
              <input
                type="text"
                value={bed}
                onChange={(e) => setBed(e.target.value)}
                placeholder="e.g. King Bed, Twin Beds, Queen"
                className="w-full h-10 px-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Capacity / Occupancy
              </label>
              <input
                type="text"
                value={occupancy}
                onChange={(e) => setOccupancy(e.target.value)}
                placeholder="e.g. 2 Guests, 3 Guests (Family)"
                className="w-full h-10 px-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
              />
            </div>
          </div>

          {/* Description / Blurb */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1">
              Category Description / Blurb
            </label>
            <textarea
              rows={3}
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="Appealing description of furnishings, natural lighting, and luxury appointments..."
              className="w-full p-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00] resize-none"
            />
          </div>

          {/* Features list */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1">
              Key Features &amp; Amenities (comma-separated)
            </label>
            <input
              type="text"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="e.g. Work desk, Smart TV, Rain shower, Free Wi-Fi, 24-hr Room Service"
              className="w-full h-10 px-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
            />
          </div>

          {/* Primary Photo & Video Header URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Primary Photo URL
              </label>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/images/DELUXE MAIN1.jpeg"
                className="w-full h-10 px-3 rounded-xl border border-stone-300 text-stone-900 font-mono text-[11px] focus:outline-none focus:border-[#ffbf00]"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Video Header Tour URL
              </label>
              <input
                type="text"
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                placeholder={`/videos/${slug || "deluxe"}-room.mp4`}
                className="w-full h-10 px-3 rounded-xl border border-stone-300 text-stone-900 font-mono text-[11px] focus:outline-none focus:border-[#ffbf00]"
              />
            </div>
          </div>

          {/* Bottom Actions inside Form */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200 mt-4">
            <div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{isDeleting ? "Deleting..." : "Delete Category"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-[#ffbf00] hover:bg-[#e09e00] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Category"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
