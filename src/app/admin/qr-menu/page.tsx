"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Utensils,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  QrCode,
  Printer,
  RefreshCw,
  FolderPlus,
  ArrowUpDown,
  Tag,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Upload,
  RotateCcw,
  Palette,
  Check,
  BedDouble,
  UtensilsCrossed,
  Sliders,
  Layers,
  FileDown,
} from "lucide-react";
import { BatchQrPrintModal } from "@/components/admin/BatchQrPrintModal";
import { MenuCategory, MenuItem, DietaryTag } from "@/lib/qr-menu/types";
import {
  subscribeMenuCategories,
  subscribeMenuItems,
  updateMenuItemInDb,
  toggleItemAvailabilityInDb,
  deleteMenuItemFromDb,
  updateMenuCategoryInDb,
  deleteMenuCategoryFromDb,
  seedMenuToFirestore,
  formatNaira,
} from "@/lib/qr-menu/store";
import { collection, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ROOM_PRESETS = [
  "Room 101",
  "Room 102",
  "Room 103",
  "Room 104",
  "Room 105",
  "Room 201",
  "Room 202",
  "Room 203",
  "Room 204",
  "Room 205",
  "Executive Suite 301",
  "Presidential Suite 302",
  "Penthouse Suite 401",
];

const TABLE_PRESETS = [
  "Table 1",
  "Table 2",
  "Table 3",
  "Table 4",
  "Table 5",
  "Table 6",
  "Table 7",
  "Table 8",
  "Table 9",
  "Table 10",
  "Table 11",
  "Table 12",
  "Poolside Bar",
  "Garden Terrace",
  "VIP Lounge",
];

export default function AdminQrMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [catFormName, setCatFormName] = useState("");
  const [catFormOrder, setCatFormOrder] = useState<number | string>(1);
  const [catFormDescription, setCatFormDescription] = useState("");
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const [locationType, setLocationType] = useState<"room" | "table">("room");
  const [qrRoomOrTable, setQrRoomOrTable] = useState("Room 204");
  const [qrCustomFooterText, setQrCustomFooterText] = useState("Event A");
  const [standOrientation, setStandOrientation] = useState<"portrait" | "landscape">("portrait");
  const [isSeeding, setIsSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Venue Branding for Printed QR Stand
  const DEFAULT_VENUE_LOGO = "/images/Banky Hotel & Suites Main Logo 1.png";
  const DEFAULT_VENUE_NAME = "BANKY HOTEL & SUITES";
  const DEFAULT_VENUE_SUBTITLE = "In-Room Dining & Bar Menu";

  const [venueLogoUrl, setVenueLogoUrl] = useState<string>(DEFAULT_VENUE_LOGO);
  const [venueName, setVenueName] = useState<string>(DEFAULT_VENUE_NAME);
  const [venueSubtitle, setVenueSubtitle] = useState<string>(DEFAULT_VENUE_SUBTITLE);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [origin, setOrigin] = useState("https://bankyhotel.com");
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const startEditCategory = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setCatFormName(cat.name);
    setCatFormOrder(cat.order);
    setCatFormDescription(cat.description || "");
  };

  const startAddCategory = () => {
    setEditingCategory(null);
    setCatFormName("");
    setCatFormOrder(categories.length + 1);
    setCatFormDescription("");
  };

  // Subscribe to real-time categories and items
  useEffect(() => {
    const unsubCats = subscribeMenuCategories((c) => setCategories(c));
    const unsubItems = subscribeMenuItems((i) => {
      setItems(i);
      setLoading(false);
    });
    return () => {
      unsubCats();
      unsubItems();
    };
  }, []);

  // Load saved venue branding from cache & Firestore
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedLogo = localStorage.getItem("banky_venue_qr_logo");
        if (savedLogo) setVenueLogoUrl(savedLogo);
        const savedName = localStorage.getItem("banky_venue_name");
        if (savedName) setVenueName(savedName);
        const savedSub = localStorage.getItem("banky_venue_subtitle");
        if (savedSub) setVenueSubtitle(savedSub);
      } catch {}
    }

    try {
      getDoc(doc(db, "hotel_settings", "qr_branding"))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.logoUrl) {
              setVenueLogoUrl(data.logoUrl);
              localStorage.setItem("banky_venue_qr_logo", data.logoUrl);
            }
            if (data.venueName) {
              setVenueName(data.venueName);
              localStorage.setItem("banky_venue_name", data.venueName);
            }
            if (data.venueSubtitle) {
              setVenueSubtitle(data.venueSubtitle);
              localStorage.setItem("banky_venue_subtitle", data.venueSubtitle);
            }
          }
        })
        .catch(() => {});
    } catch {}
  }, []);

  // Handle Custom Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Please upload an image smaller than 5MB.");
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      setVenueLogoUrl(base64Url);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("banky_venue_qr_logo", base64Url);
        } catch {}
      }

      try {
        await setDoc(
          doc(db, "hotel_settings", "qr_branding"),
          {
            logoUrl: base64Url,
            venueName,
            venueSubtitle,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Firestore branding save error:", err);
      }

      setIsUploadingLogo(false);
      setStatusMessage("Custom venue logo uploaded successfully! Placed above QR code.");
      setTimeout(() => setStatusMessage(""), 4000);
    };
    reader.onerror = () => {
      setIsUploadingLogo(false);
      alert("Failed to read image file. Please try another image.");
    };
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // Reset Venue Logo back to default
  const handleResetLogo = async () => {
    if (!window.confirm("Reset venue logo to the default Banky Hotel & Suites brand mark?")) return;
    setVenueLogoUrl(DEFAULT_VENUE_LOGO);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("banky_venue_qr_logo");
      } catch {}
    }
    try {
      await setDoc(
        doc(db, "hotel_settings", "qr_branding"),
        { logoUrl: DEFAULT_VENUE_LOGO, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {}
    setStatusMessage("Venue logo reset to default.");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // Save Venue Name and Subtitle
  const handleSaveVenueDetails = async () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("banky_venue_name", venueName);
        localStorage.setItem("banky_venue_subtitle", venueSubtitle);
      } catch {}
    }
    try {
      await setDoc(
        doc(db, "hotel_settings", "qr_branding"),
        { venueName, venueSubtitle, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {}
    setStatusMessage("Venue branding details saved.");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (selectedCategory !== "all" && item.categoryId !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q) ||
        (item.categoryName || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Toggle Live Availability
  const handleToggleStock = async (item: MenuItem) => {
    const newStatus = !item.isAvailable;
    await toggleItemAvailabilityInDb(item.id, newStatus);
    setStatusMessage(`Updated ${item.title} to ${newStatus ? "In Stock" : "Out of Stock"}`);
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // Delete item
  const handleDeleteItem = async (itemId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" from the menu?`)) {
      return;
    }
    await deleteMenuItemFromDb(itemId);
    setStatusMessage(`Deleted ${title}`);
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // Save Item (Edit or Add)
  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = editingItem?.id || `item_${Date.now()}`;
    const title = formData.get("title") as string;
    const categoryId = formData.get("categoryId") as string;
    const categoryName = categories.find((c) => c.id === categoryId)?.name || "General";
    const price = Number(formData.get("price") || 0);
    const description = (formData.get("description") as string) || "";
    const imageUrl = (formData.get("imageUrl") as string) || "/images/dining.jpg";
    const dietaryRaw = (formData.get("dietary") as string) || "";
    const dietary = dietaryRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as DietaryTag[];
    const isAvailable = formData.get("isAvailable") === "true";
    const preparationTime = (formData.get("preparationTime") as string) || "15-20 mins";

    const updated: MenuItem = {
      id,
      title,
      categoryId,
      categoryName,
      price,
      description,
      imageUrl,
      dietary,
      isAvailable,
      preparationTime,
      order: editingItem?.order || items.length + 1,
    };

    await updateMenuItemInDb(updated);
    setEditingItem(null);
    setIsAddingItem(false);
    setStatusMessage(`Saved item "${title}"`);
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // Save Category (Add or Edit)
  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = catFormName.trim();
    if (!name) return;

    const order = Number(catFormOrder) || categories.length + 1;
    const description = catFormDescription.trim();
    const slug = editingCategory?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const id = editingCategory?.id || `cat_${slug || Date.now()}`;

    const newCat: MenuCategory = {
      id,
      name,
      slug,
      order,
      description,
      isActive: editingCategory ? editingCategory.isActive : true,
    };

    const previousName = editingCategory?.name;
    await updateMenuCategoryInDb(newCat, previousName);

    setStatusMessage(
      editingCategory
        ? `Successfully updated category "${name}" (Display order: #${order})`
        : `Successfully added category "${name}" (Display order: #${order})`
    );

    startAddCategory();
    setTimeout(() => setStatusMessage(""), 3500);
  };

  // Delete Category
  const handleDeleteCategory = async (cat: MenuCategory) => {
    const dishCount = items.filter((i) => i.categoryId === cat.id).length;
    const confirmMsg =
      dishCount > 0
        ? `Category "${cat.name}" currently contains ${dishCount} dish(es). Are you sure you want to delete this category?`
        : `Are you sure you want to delete category "${cat.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    await deleteMenuCategoryFromDb(cat.id);
    if (editingCategory?.id === cat.id) {
      startAddCategory();
    }
    if (selectedCategory === cat.id) {
      setSelectedCategory("all");
    }
    setStatusMessage(`Deleted category "${cat.name}"`);
    setTimeout(() => setStatusMessage(""), 3500);
  };

  // Restore Default Menu
  const handleSeedDefaults = async () => {
    if (
      !window.confirm(
        "Do you want to reload/seed the complete Banky Hotel & Suites food & bar menu dataset?"
      )
    ) {
      return;
    }
    setIsSeeding(true);
    try {
      const res = await seedMenuToFirestore();
      setStatusMessage(`Successfully seeded ${res.count} items into the menu.`);
    } catch {
      setStatusMessage("Seeding completed.");
    } finally {
      setIsSeeding(false);
      setTimeout(() => setStatusMessage(""), 3500);
    }
  };

  // QR Stand URL - dynamically reflects Room or Table + optional custom footer tag
  const buildQrUrl = (baseUrl: string) => {
    const params = new URLSearchParams();
    if (qrRoomOrTable.trim()) {
      params.set(locationType === "table" ? "table" : "room", qrRoomOrTable.trim());
    }
    if (qrCustomFooterText.trim()) {
      params.set("tag", qrCustomFooterText.trim());
    }
    const query = params.toString();
    return `${baseUrl}/qr${query ? `?${query}` : ""}`;
  };

  const qrTargetUrl = buildQrUrl(origin);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900 font-semibold">
            QR Menu & Live Inventory
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage food & bar categories, prices, item descriptions, and live out-of-stock toggles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsBatchPrintModalOpen(true)}
            className="px-3.5 py-2 bg-[#ffbf00] hover:bg-[#e09e00] text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            title="Batch Print QR stands for multiple rooms & tables in a single PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Batch Print QR Stands</span>
          </button>

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="px-3.5 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-stone-800 shadow-sm cursor-pointer"
          >
            <QrCode className="h-4 w-4" />
            <span>Single QR Stand</span>
          </button>

          <button
            onClick={() => {
              startAddCategory();
              setIsCategoryModalOpen(true);
            }}
            className="px-3.5 py-2 bg-white text-stone-800 border border-stone-300 rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-stone-50"
          >
            <FolderPlus className="h-4 w-4 text-[#ffbf00]" />
            <span>Categories ({categories.length})</span>
          </button>

          <button
            onClick={() => setIsAddingItem(true)}
            className="px-3.5 py-2 bg-[#ffbf00] hover:bg-[#e09e00] text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Dish / Drink</span>
          </button>

          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="px-3 py-2 text-stone-500 hover:text-stone-800 text-xs flex items-center gap-1 border border-stone-200 rounded-lg hover:bg-stone-50"
            title="Reload default Banky menu items"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSeeding ? "animate-spin" : ""}`} />
            <span>Restore Defaults</span>
          </button>
        </div>
      </div>

      {/* Notification toast */}
      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ── Search and Category Filter Toolbar ── */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks, price…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-stone-300 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-600"
            />
          </div>

          <div className="text-xs text-stone-500">
            Showing <strong>{filteredItems.length}</strong> of {items.length} items
          </div>
        </div>

        {/* Categories scrollable pill list */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
              selectedCategory === "all"
                ? "bg-[#ffbf00] text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-[#ffbf00] text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}

          {selectedCategory !== "all" && (
            <button
              onClick={() => {
                const currentCat = categories.find((c) => c.id === selectedCategory);
                if (currentCat) {
                  startEditCategory(currentCat);
                  setIsCategoryModalOpen(true);
                }
              }}
              className="px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 flex items-center gap-1 shadow-2xs"
              title="Edit this category (rename, display order, or description)"
            >
              <Edit2 className="h-3 w-3 text-amber-600" />
              <span>Edit Category</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Menu Items Table ── */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-14">Image</th>
                <th className="p-3.5">Title & Category</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5">Dietary</th>
                <th className="p-3.5">Live Stock Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    Loading menu catalog…
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    No menu items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-stone-50/80 transition-colors ${
                      !item.isAvailable ? "bg-red-50/20" : ""
                    }`}
                  >
                    {/* Thumbnail */}
                    <td className="p-3">
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 flex-shrink-0">
                        <Image
                          src={item.imageUrl || "/images/dining.jpg"}
                          alt={item.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </td>

                    {/* Title & Desc */}
                    <td className="p-3 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-stone-900 text-sm">{item.title}</div>
                      <div className="text-[11px] text-[#ffbf00] font-medium">{item.categoryName}</div>
                      <p className="text-stone-500 text-[11px] line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </td>

                    {/* Price */}
                    <td className="p-3 font-mono font-bold text-stone-900 text-sm whitespace-nowrap">
                      {formatNaira(item.price)}
                    </td>

                    {/* Dietary Tags */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {item.dietary?.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded font-medium border border-stone-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Live Stock Toggle */}
                    <td className="p-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStock(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          item.isAvailable
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                        title="Click to toggle In Stock / Out of Stock"
                      >
                        {item.isAvailable ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span>In Stock</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                            <span>Out of Stock</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded"
                          title="Edit Item"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit / Add Item Modal ── */}
      {(editingItem || isAddingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-xl text-stone-900 font-semibold mb-4">
              {editingItem ? `Edit Dish: ${editingItem.title}` : "Add New Dish or Drink"}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-stone-700 block mb-1">
                  Item Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingItem?.title || ""}
                  placeholder="e.g. Banky Signature Jollof Rice"
                  className="w-full h-10 px-3 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-stone-700 block mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="categoryId"
                    required
                    defaultValue={editingItem?.categoryId || categories[0]?.id || "breakfast"}
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-stone-700 block mb-1">
                    Base Price (₦) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    required
                    min={0}
                    defaultValue={editingItem?.price || 3000}
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 text-stone-900 font-mono focus:outline-none focus:border-[#ffbf00]"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-stone-700 block mb-1">
                  Description / Ingredients
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingItem?.description || ""}
                  placeholder="Appetizing description of preparation, flavors, and serving..."
                  className="w-full p-3 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00] resize-none"
                />
              </div>

              <div>
                <label className="font-medium text-stone-700 block mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  name="imageUrl"
                  defaultValue={editingItem?.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"}
                  className="w-full h-10 px-3 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-stone-700 block mb-1">
                    Dietary Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="dietary"
                    defaultValue={editingItem?.dietary?.join(", ") || "Chef Special"}
                    placeholder="e.g. Spicy, Vegetarian, Halal"
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
                  />
                </div>

                <div>
                  <label className="font-medium text-stone-700 block mb-1">
                    Preparation Time
                  </label>
                  <input
                    type="text"
                    name="preparationTime"
                    defaultValue={editingItem?.preparationTime || "15-20 mins"}
                    placeholder="e.g. 15-20 mins"
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-stone-700 block mb-1">
                  Availability Status
                </label>
                <select
                  name="isAvailable"
                  defaultValue={editingItem ? String(editingItem.isAvailable) : "true"}
                  className="w-full h-10 px-3 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:border-[#ffbf00]"
                >
                  <option value="true">In Stock (Available for ordering)</option>
                  <option value="false">Out of Stock (Greyed out on guest menu)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddingItem(false);
                  }}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#ffbf00] hover:bg-[#e09e00] text-white font-semibold rounded-lg shadow"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Category Manager Modal (Add & Edit Category) ── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 shrink-0">
              <div>
                <h3 className="font-display text-lg text-stone-900 font-semibold flex items-center gap-2">
                  <FolderPlus className="h-5 w-5 text-[#ffbf00]" />
                  <span>Menu Categories Manager</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Rename categories, update display order, or change category descriptions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  startAddCategory();
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors text-base"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Category List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Existing Categories ({categories.length})
                  </span>
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={startAddCategory}
                      className="text-xs text-[#d99800] hover:text-[#b37d00] font-semibold flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Switch to Add New Category</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl p-2 bg-stone-50/50">
                  {categories.map((c) => {
                    const isBeingEdited = editingCategory?.id === c.id;
                    const dishCount = items.filter((i) => i.categoryId === c.id).length;
                    return (
                      <div
                        key={c.id}
                        className={`pt-2.5 pb-2.5 px-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
                          isBeingEdited
                            ? "bg-[#fff8e6] border border-[#ffbf00]/60 shadow-2xs"
                            : "hover:bg-white"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-stone-900 text-sm">{c.name}</span>
                            <span
                              className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-mono text-[10px] font-semibold"
                              title="Display order across mobile QR menu"
                            >
                              Order #{c.order}
                            </span>
                            <span className="text-stone-500 font-mono text-[11px]">
                              {dishCount} {dishCount === 1 ? "dish" : "dishes"}
                            </span>
                            {isBeingEdited && (
                              <span className="px-2 py-0.5 rounded-full bg-[#ffbf00] text-white text-[10px] font-bold">
                                Editing
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-600 line-clamp-1 mt-1">
                            {c.description ? (
                              c.description
                            ) : (
                              <span className="italic text-stone-400">No description set</span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => startEditCategory(c)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                              isBeingEdited
                                ? "bg-[#ffbf00] text-white shadow-sm"
                                : "bg-white border border-stone-200 hover:bg-[#ffbf00] hover:text-white text-stone-700 shadow-2xs"
                            }`}
                            title={`Edit ${c.name} (rename, display order, description)`}
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit Category</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c)}
                            className="p-1 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title={`Delete ${c.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Section: Edit or Add Category */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${editingCategory ? "bg-[#ffbf00] animate-pulse" : "bg-stone-400"}`} />
                    <span className="font-bold text-stone-900 text-xs sm:text-sm">
                      {editingCategory ? `Edit Category: "${editingCategory.name}"` : "Add New Menu Category"}
                    </span>
                  </div>
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={startAddCategory}
                      className="text-xs text-stone-500 hover:text-stone-800 underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-stone-700 font-semibold mb-1">
                        Category Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={catFormName}
                        onChange={(e) => setCatFormName(e.target.value)}
                        required
                        placeholder="e.g. Grills & Shawarma, Traditional Soups, Mocktails"
                        className="w-full h-9 px-3 rounded-lg border border-stone-300 text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        Display Order <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={catFormOrder}
                        onChange={(e) => setCatFormOrder(e.target.value)}
                        required
                        placeholder="e.g. 1"
                        className="w-full h-9 px-3 rounded-lg border border-stone-300 text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Category Description
                    </label>
                    <textarea
                      value={catFormDescription}
                      onChange={(e) => setCatFormDescription(e.target.value)}
                      rows={2}
                      placeholder="e.g. Authentic Nigerian delicacies and chef-crafted swallow soups seasoned with traditional herbs"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                    />
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Guests will see this description directly under the section header on their mobile QR menu.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={startAddCategory}
                        className="px-3 py-1.5 text-stone-600 hover:text-stone-900 font-medium"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryModalOpen(false);
                        startAddCategory();
                      }}
                      className="px-3 py-1.5 text-stone-600 hover:text-stone-900 font-medium"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#ffbf00] hover:bg-[#e09e00] text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{editingCategory ? "Update Category" : "Add Category"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Stand / Table Tent Generator Modal ── */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 text-center max-h-[94vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-200 mb-4 text-left">
              <div>
                <h3 className="font-display text-lg sm:text-xl text-stone-900 font-semibold flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-[#ffbf00]" />
                  <span>Guest Room &amp; Table QR Stand Generator</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Filter by Room or Table, switch between Portrait &amp; Landscape layouts, and print table tent cards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors text-base shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left mb-4">
              {/* Left Column: Location Filter & Branding Controls */}
              <div className="lg:col-span-6 space-y-4">
                {/* 1. Location Filter: Room vs Table Toggle & Selection */}
                <div className="bg-stone-50 p-3.5 sm:p-4 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-[#ffbf00]" />
                      <span>1. Location Filter</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                      Active: {locationType === "room" ? "Room Mode" : "Table Mode"}
                    </span>
                  </div>

                  {/* Room / Table Filter Toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLocationType("room");
                        if (!qrRoomOrTable || qrRoomOrTable.toLowerCase().includes("table")) {
                          setQrRoomOrTable("Room 204");
                        }
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        locationType === "room"
                          ? "bg-stone-900 text-white shadow-md ring-2 ring-[#ffbf00]/50"
                          : "bg-white border border-stone-300 text-stone-600 hover:text-stone-900 hover:border-stone-400"
                      }`}
                    >
                      <BedDouble className="h-4 w-4 text-[#ffbf00]" />
                      <span>Guest Room</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLocationType("table");
                        if (!qrRoomOrTable || qrRoomOrTable.toLowerCase().includes("room")) {
                          setQrRoomOrTable("Table 1");
                        }
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        locationType === "table"
                          ? "bg-stone-900 text-white shadow-md ring-2 ring-[#ffbf00]/50"
                          : "bg-white border border-stone-300 text-stone-600 hover:text-stone-900 hover:border-stone-400"
                      }`}
                    >
                      <UtensilsCrossed className="h-4 w-4 text-[#ffbf00]" />
                      <span>Dine-In Table</span>
                    </button>
                  </div>

                  {/* Specific Location Dropdown */}
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Choose {locationType === "room" ? "Room" : "Table"} Number:
                    </label>
                    <select
                      value={
                        (locationType === "room" ? ROOM_PRESETS : TABLE_PRESETS).includes(qrRoomOrTable)
                          ? qrRoomOrTable
                          : "custom"
                      }
                      onChange={(e) => {
                        if (e.target.value !== "custom") {
                          setQrRoomOrTable(e.target.value);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00] font-medium"
                    >
                      <optgroup label={locationType === "room" ? "Hotel Rooms & Suites" : "Dining & Bar Tables"}>
                        {(locationType === "room" ? ROOM_PRESETS : TABLE_PRESETS).map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </optgroup>
                      <option value="custom">-- Custom Name / Manual Entry --</option>
                    </select>
                  </div>

                  {/* Custom Location Text Input */}
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Custom Location Label (updates stand badge):
                    </label>
                    <input
                      type="text"
                      value={qrRoomOrTable}
                      onChange={(e) => setQrRoomOrTable(e.target.value)}
                      placeholder={
                        locationType === "room"
                          ? "e.g. Room 204 or Royal Suite"
                          : "e.g. Table 5 or Poolside Bar"
                      }
                      className="w-full h-9 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                    />
                    <div className="flex flex-wrap items-center justify-between text-[10px] text-stone-500 mt-1 gap-1">
                      <span>Prefills guest order automatically.</span>
                      <span className="font-mono text-[#b38600] font-semibold">
                        ?{locationType === "table" ? "table" : "room"}={encodeURIComponent(qrRoomOrTable.trim() || "")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Venue Branding & Custom Logo Section */}
                <div id="venue-branding-section" className="bg-stone-50 p-3.5 sm:p-4 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Palette className="h-4 w-4 text-[#ffbf00]" />
                      <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">2. Venue Branding &amp; Logo</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        venueLogoUrl !== DEFAULT_VENUE_LOGO
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {venueLogoUrl !== DEFAULT_VENUE_LOGO ? "Custom Logo Active" : "Default Logo"}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Custom logo appears directly on the printed stand above the QR code.
                  </p>

                  {/* Logo Upload Dropzone / Button */}
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp,image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2.5">
                    {/* Current Logo Thumbnail */}
                    <div className="h-12 w-12 rounded-xl bg-[#191816] p-1.5 border border-stone-300 flex items-center justify-center shrink-0 shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={venueLogoUrl}
                        alt="Venue Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="px-3 py-1.5 bg-[#ffbf00] hover:bg-[#e09e00] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>{venueLogoUrl !== DEFAULT_VENUE_LOGO ? "Change Logo" : "Upload Logo"}</span>
                      </button>

                      {venueLogoUrl !== DEFAULT_VENUE_LOGO && (
                        <button
                          type="button"
                          onClick={handleResetLogo}
                          className="px-2.5 py-1.5 bg-white border border-stone-300 text-stone-700 hover:text-stone-900 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
                          title="Reset to default brand mark"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Venue Name & Tagline Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-stone-200 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">
                        Venue Display Name:
                      </label>
                      <input
                        type="text"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        onBlur={handleSaveVenueDetails}
                        placeholder="e.g. BANKY HOTEL & SUITES"
                        className="w-full h-8 px-2.5 rounded-lg border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">
                        Menu Tagline / Subtitle:
                      </label>
                      <input
                        type="text"
                        value={venueSubtitle}
                        onChange={(e) => setVenueSubtitle(e.target.value)}
                        onBlur={handleSaveVenueDetails}
                        placeholder="e.g. In-Room Dining & Bar Menu"
                        className="w-full h-8 px-2.5 rounded-lg border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Secondary QR Configuration: Custom Footer Identifier */}
                <div id="secondary-qr-config-section" className="bg-stone-50 p-3.5 sm:p-4 rounded-2xl border border-stone-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-[#ffbf00]" />
                      <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        3. Secondary QR Identifier
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                      Footer Label
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Add a custom text label dynamically injected directly beneath the QR code on the printed stand (e.g. for special event banquets, staff ordering terminals, or activation booths).
                  </p>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Custom Text (Footer Identifier):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={qrCustomFooterText}
                        onChange={(e) => setQrCustomFooterText(e.target.value)}
                        placeholder="e.g. Event A, Staff Terminal, VIP Gala, or Bar 2"
                        className="w-full h-9 pl-3 pr-8 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                      />
                      {qrCustomFooterText && (
                        <button
                          type="button"
                          onClick={() => setQrCustomFooterText("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs p-1"
                          title="Clear custom footer text"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-stone-500 font-medium">Quick Presets:</span>
                    {["Event A", "Staff Terminal", "VIP Gala", "Lobby Kiosk", "Conference Hall 2"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQrCustomFooterText(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          qrCustomFooterText === preset
                            ? "bg-stone-900 text-white border-stone-900 font-semibold shadow-xs"
                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-400 hover:text-stone-900"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Print Controls & Live Stand Preview */}
              <div className="lg:col-span-6 flex flex-col items-center justify-start space-y-3 w-full min-w-0">
                {/* Print Layout Orientation Toggle Bar */}
                <div className="flex items-center justify-between bg-stone-100 p-1.5 rounded-xl border border-stone-200 w-full">
                  <span className="text-xs font-semibold text-stone-700 px-2 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-stone-500" />
                    <span>Print Mode:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setStandOrientation("portrait")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        standOrientation === "portrait"
                          ? "bg-stone-900 text-white shadow-sm"
                          : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                      }`}
                    >
                      <span>Portrait</span>
                      <span className="text-[10px] font-mono opacity-80">(Vertical)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStandOrientation("landscape")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        standOrientation === "landscape"
                          ? "bg-stone-900 text-white shadow-sm"
                          : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                      }`}
                    >
                      <span>Landscape</span>
                      <span className="text-[10px] font-mono opacity-80">(Wide)</span>
                    </button>
                  </div>
                </div>

                {/* Printable Tent Card Mockup */}
                <div
                  id="printable-qr-stand"
                  data-orientation={standOrientation}
                  className={`bg-[#191816] text-[#f4efe6] rounded-2xl border-2 border-[#ffbf00]/40 shadow-xl w-full mx-auto transition-all duration-300 box-border overflow-hidden ${
                    standOrientation === "landscape"
                      ? "max-w-full sm:max-w-[560px] p-3.5 sm:p-5 md:p-6 stand-landscape"
                      : "max-w-[min(340px,100%)] p-4 sm:p-6 text-center"
                  }`}
                >
                  {standOrientation === "landscape" ? (
                    /* ── Landscape Layout (Fluid side-by-side or stacked on tiny viewports) ── */
                    <div className="flex flex-col min-[480px]:flex-row items-center gap-4 sm:gap-6 w-full">
                      {/* Left Side: Branding & Dynamic Location */}
                      <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2 text-center min-[480px]:text-left w-full">
                        <div className="flex items-center justify-center min-[480px]:justify-start gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={venueLogoUrl}
                            alt={venueName || "Venue Logo"}
                            className="h-8 sm:h-9 w-auto max-w-[100px] sm:max-w-[120px] max-h-12 object-contain filter drop-shadow-md"
                          />
                        </div>

                        <div>
                          <h4 className="font-display text-xs sm:text-sm md:text-base font-bold text-white tracking-wide uppercase break-words leading-tight">
                            {venueName || "BANKY HOTEL & SUITES"}
                          </h4>
                          <p className="text-[8px] sm:text-[9.5px] uppercase font-mono tracking-widest text-[#ffbf00] break-words line-clamp-2 mt-0.5">
                            {venueSubtitle || "In-Room Dining & Bar Menu"}
                          </p>
                        </div>

                        {/* Dynamic Location Label inside #printable-qr-stand */}
                        <div className="pt-0.5">
                          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#ffbf00]/20 border border-[#ffbf00]/50 text-[#ffbf00] text-[10px] sm:text-xs font-mono font-bold tracking-wide shadow-sm max-w-full">
                            {locationType === "table" ? (
                              <UtensilsCrossed className="h-3.5 w-3.5 text-[#ffbf00] shrink-0" />
                            ) : (
                              <BedDouble className="h-3.5 w-3.5 text-[#ffbf00] shrink-0" />
                            )}
                            <span className="truncate max-w-[180px] sm:max-w-[240px]">
                              {qrRoomOrTable.trim() || (locationType === "table" ? "Table Service" : "Room Service")}
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] sm:text-[11px] text-stone-300 leading-snug pt-0.5">
                          <p className="font-medium text-white">Instant Contactless Ordering</p>
                          <p className="text-stone-400 text-[9.5px] sm:text-[10px] mt-0.5 leading-tight">
                            Scan with camera to order delicious food &amp; drinks delivered straight to your {locationType}.
                          </p>
                        </div>

                        <p className="text-[8px] sm:text-[9px] text-stone-500 font-mono break-all pt-1 border-t border-white/10">
                          {qrTargetUrl}
                        </p>
                      </div>

                      {/* Right Side: QR Code in Landscape */}
                      <div className="shrink-0 flex flex-col items-center justify-center w-auto max-w-full">
                        <div className="bg-white p-2 sm:p-2.5 md:p-3 rounded-xl shadow-lg border border-stone-300 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                              qrTargetUrl
                            )}&size=160x160&margin=4`}
                            alt="QR Code"
                            className="w-24 h-24 min-[480px]:w-28 min-[480px]:h-28 sm:w-32 sm:h-32 aspect-square object-contain block"
                          />
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#ffbf00] mt-1 sm:mt-1.5 font-bold text-center">
                          Scan with Phone
                        </span>

                        {/* Secondary QR Configuration: Dynamic Custom Text Footer Label beneath QR code */}
                        {qrCustomFooterText.trim() && (
                          <div
                            id="qr-custom-footer-label"
                            data-testid="qr-custom-footer-label"
                            className="mt-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-[#252320] border border-[#ffbf00]/50 text-[#ffbf00] text-[9.5px] sm:text-[10px] font-mono tracking-wider uppercase font-bold inline-flex items-center justify-center gap-1 shadow-sm max-w-[min(180px,100%)] text-center break-words"
                            title={qrCustomFooterText.trim()}
                          >
                            <Tag className="h-2.5 w-2.5 shrink-0 text-[#ffbf00]" />
                            <span className="break-words line-clamp-2 max-w-[130px] sm:max-w-[150px] leading-tight">
                              {qrCustomFooterText.trim()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── Portrait Layout (Vertical Stand) ── */
                    <div className="flex flex-col items-center w-full min-w-0 text-center">
                      {/* Custom Venue Logo placed directly above the QR code and title */}
                      <div className="relative mx-auto mb-2 flex items-center justify-center min-h-[44px] sm:min-h-[50px] w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={venueLogoUrl}
                          alt={venueName || "Venue Logo"}
                          className="h-10 sm:h-12 w-auto max-w-[120px] sm:max-w-[140px] max-h-14 object-contain mx-auto filter drop-shadow-md"
                        />
                      </div>

                      <h4 className="font-display text-sm sm:text-base font-semibold text-white tracking-wide uppercase break-words leading-tight px-1 max-w-full">
                        {venueName || "BANKY HOTEL & SUITES"}
                      </h4>
                      <p className="text-[8.5px] sm:text-[10px] uppercase font-mono tracking-widest text-[#ffbf00] mb-2 sm:mb-2.5 break-words line-clamp-2 px-1 max-w-full">
                        {venueSubtitle || "In-Room Dining & Bar Menu"}
                      </p>

                      {/* QR Code image generated via reliable QR API */}
                      <div className="bg-white p-2.5 sm:p-3 rounded-xl inline-block shadow-md mx-auto my-1 border border-stone-300">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                            qrTargetUrl
                          )}&size=160x160&margin=4`}
                          alt="QR Code"
                          className="w-28 h-28 sm:w-36 sm:h-36 aspect-square object-contain block mx-auto"
                        />
                      </div>

                      {/* Secondary QR Configuration: Dynamic Custom Text Footer Label beneath QR code */}
                      {qrCustomFooterText.trim() && (
                        <div
                          id="qr-custom-footer-label"
                          data-testid="qr-custom-footer-label"
                          className="mt-2 inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md bg-[#252320] border border-[#ffbf00]/50 text-[#ffbf00] text-[10px] sm:text-[11px] font-mono tracking-wider uppercase font-bold shadow-sm max-w-[min(260px,100%)] mx-auto text-center break-words"
                          title={qrCustomFooterText.trim()}
                        >
                          <Tag className="h-3 w-3 shrink-0 text-[#ffbf00]" />
                          <span className="break-words line-clamp-2 max-w-[200px] sm:max-w-[220px] leading-tight">
                            {qrCustomFooterText.trim()}
                          </span>
                        </div>
                      )}

                      {/* Dynamic Location Label inside #printable-qr-stand */}
                      <div className="mt-2 sm:mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffbf00]/20 border border-[#ffbf00]/40 text-[#ffbf00] text-[11px] sm:text-xs font-mono font-bold max-w-full shadow-sm">
                        {locationType === "table" ? (
                          <UtensilsCrossed className="h-3.5 w-3.5 text-[#ffbf00] shrink-0" />
                        ) : (
                          <BedDouble className="h-3.5 w-3.5 text-[#ffbf00] shrink-0" />
                        )}
                        <span className="truncate max-w-[200px] sm:max-w-none">
                          {qrRoomOrTable.trim() || (locationType === "table" ? "Table Service" : "Room Service")}
                        </span>
                      </div>

                      <p className="text-[10px] sm:text-[11px] text-stone-300 mt-2 font-medium px-2 max-w-full">
                        Scan with Phone Camera to Browse &amp; Order
                      </p>
                      <p className="text-[8px] sm:text-[9px] text-stone-500 mt-1 font-mono break-all px-2 max-w-full">
                        {qrTargetUrl}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-stone-200">
              <button
                onClick={() => {
                  setIsQrModalOpen(false);
                  setIsBatchPrintModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#ffbf00] hover:bg-[#e09e00] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                title="Print multiple room & table stands at once in a single PDF"
              >
                <Layers className="h-4 w-4" />
                <span>Switch to Batch Printing</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>
                  Print Stand ({standOrientation === "landscape" ? "Landscape" : "Portrait"})
                </span>
              </button>

              <a
                href={qrTargetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open /qr</span>
              </a>

              <button
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2.5 text-stone-500 hover:text-stone-800 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch QR Stand Generator Modal ── */}
      <BatchQrPrintModal
        isOpen={isBatchPrintModalOpen}
        onClose={() => setIsBatchPrintModalOpen(false)}
        venueLogoUrl={venueLogoUrl}
        venueName={venueName}
        venueSubtitle={venueSubtitle}
      />
    </div>
  );
}
