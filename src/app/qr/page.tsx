"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Clock,
  Flame,
  CheckCircle2,
  Utensils,
  Bell,
  BellRing,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  Send,
  Coffee,
  Wine,
  RefreshCw,
  PhoneCall,
  ExternalLink,
  QrCode as QrIcon,
  Heart,
  Receipt,
  MapPin,
  Star,
  Wifi,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MenuCategory,
  MenuItem,
  CartItem,
  QrOrder,
  DietaryTag,
  DishAddon,
} from "@/lib/qr-menu/types";
import {
  subscribeMenuCategories,
  subscribeMenuItems,
  submitGuestOrder,
  formatNaira,
} from "@/lib/qr-menu/store";
import { TableQrCardModal } from "@/components/qr/TableQrCardModal";
import { DishDetailModal } from "@/components/qr/DishDetailModal";
import { ServiceRequestModal } from "@/components/qr/ServiceRequestModal";
import { LiveOrderTrackerModal } from "@/components/qr/LiveOrderTrackerModal";

// Category circle image previews for visual story row (infused from SanjayMarathi/FoodApp & FoodScan)
const CATEGORY_IMAGES: Record<string, string> = {
  all: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80",
  breakfast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&auto=format&fit=crop&q=80",
  starters: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=200&auto=format&fit=crop&q=80",
  rice: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=200&auto=format&fit=crop&q=80",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3d5d628169a?w=200&auto=format&fit=crop&q=80",
  soups: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=200&auto=format&fit=crop&q=80",
  peppersoup: "https://images.unsplash.com/photo-1547592180-85f173990554?w=200&auto=format&fit=crop&q=80",
  grills: "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&auto=format&fit=crop&q=80",
  "fast-food": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&auto=format&fit=crop&q=80",
  platters: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&auto=format&fit=crop&q=80",
  bar: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&auto=format&fit=crop&q=80",
  desserts: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&auto=format&fit=crop&q=80",
};

function QrMenuContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room") || searchParams.get("table") || "";
  const initialType = searchParams.get("table") ? "table" : "room";

  // Data state
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Navigation
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Cart state
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Selected item for Customization Modal
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);

  // Modal states for interactive features
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

  // Order state & history for this session
  const [ordersHistory, setOrdersHistory] = useState<QrOrder[]>([]);
  const [activeOrderForTracker, setActiveOrderForTracker] = useState<QrOrder | null>(null);

  // Checkout form
  const [roomOrTable, setRoomOrTable] = useState(initialRoom || "Table 1");
  const [orderType, setOrderType] = useState<"room" | "table" | "poolside_garden">(
    (initialType as "room" | "table") || "table"
  );
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<QrOrder | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Subscribe to real-time menu categories and items from Firestore
  useEffect(() => {
    const unsubCats = subscribeMenuCategories((newCats) => {
      setCategories(newCats.filter((c) => c.isActive));
    });

    const unsubItems = subscribeMenuItems((newItems) => {
      setItems(newItems);
      setLoading(false);
    });

    return () => {
      unsubCats();
      unsubItems();
    };
  }, []);

  // Sync initial query params
  useEffect(() => {
    if (initialRoom) {
      setRoomOrTable(initialRoom);
    }
    if (searchParams.get("table")) {
      setOrderType("table");
    } else if (searchParams.get("room")) {
      setOrderType("room");
    }
  }, [initialRoom, searchParams]);

  // Load saved favorites & session orders from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedFavs = localStorage.getItem("banky_guest_favorites");
        if (savedFavs) setFavorites(JSON.parse(savedFavs));

        const savedOrders = localStorage.getItem("banky_guest_session_orders");
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          setOrdersHistory(parsed);
          if (parsed.length > 0) setActiveOrderForTracker(parsed[0]);
        }
      } catch {}
    }
  }, []);

  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      if (typeof window !== "undefined") {
        localStorage.setItem("banky_guest_favorites", JSON.stringify(next));
      }
      return next;
    });
  };

  // Cart totals
  const totalItemsCount = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => {
      const unit = item.unitPrice || item.item.price;
      return sum + unit * item.quantity;
    }, 0);
  }, [cart]);

  // Add / reduce item in cart
  const addToCartSimple = (item: MenuItem) => {
    if (!item.isAvailable) return;
    const key = item.id;
    setCart((prev) => {
      const existing = prev[key];
      const newQty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [key]: {
          cartKey: key,
          item,
          quantity: newQty,
          unitPrice: item.price,
        },
      };
    });
  };

  const addToCartDetailed = (
    item: MenuItem,
    quantity: number,
    addons: DishAddon[],
    notes: string
  ) => {
    if (!item.isAvailable) return;
    const addonsTotal = addons.reduce((acc, a) => acc + a.price, 0);
    const unitPrice = item.price + addonsTotal;
    const addonsKey = addons.map((a) => a.id).sort().join("-");
    const cartKey = addonsKey ? `${item.id}_${addonsKey}` : item.id;

    setCart((prev) => {
      const existing = prev[cartKey];
      const newQty = existing ? existing.quantity + quantity : quantity;
      return {
        ...prev,
        [cartKey]: {
          cartKey,
          item,
          quantity: newQty,
          selectedAddons: addons,
          notes: notes || existing?.notes,
          unitPrice,
        },
      };
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => {
      const existing = prev[cartKey];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const copy = { ...prev };
        delete copy[cartKey];
        return copy;
      }
      return {
        ...prev,
        [cartKey]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (showOnlyFavorites && !favorites[item.id]) {
        return false;
      }
      if (activeCategoryId !== "all" && item.categoryId !== activeCategoryId) {
        return false;
      }
      if (selectedTag !== "all" && !item.dietary?.includes(selectedTag as DietaryTag)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchCat = item.categoryName?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchCat;
      }
      return true;
    });
  }, [items, activeCategoryId, selectedTag, searchQuery, showOnlyFavorites, favorites]);

  // Featured / Chef's Recommendation list (top 4 items)
  const featuredItems = useMemo(() => {
    return items.filter((i) => i.isFeatured && i.isAvailable).slice(0, 4);
  }, [items]);

  // Handle Order Submit
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomOrTable.trim()) {
      setSubmitError("Please specify your Room Number or Table Location.");
      return;
    }
    if (totalItemsCount === 0) {
      setSubmitError("Your order basket is empty.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const orderItems = Object.values(cart).map((ci) => {
        const unit = ci.unitPrice || ci.item.price;
        const addonsText = ci.selectedAddons && ci.selectedAddons.length > 0
          ? ` (+${ci.selectedAddons.map((a) => a.name).join(", ")})`
          : "";
        return {
          id: ci.item.id,
          title: `${ci.item.title}${addonsText}`,
          categoryName: ci.item.categoryName,
          price: unit,
          quantity: ci.quantity,
          subtotal: unit * ci.quantity,
          notes: ci.notes,
        };
      });

      const newOrder = await submitGuestOrder({
        roomOrTable: roomOrTable.trim(),
        orderType,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        items: orderItems,
        totalAmount,
        totalItems: totalItemsCount,
      });

      setPlacedOrder(newOrder);
      setActiveOrderForTracker(newOrder);

      // Save to guest session history
      setOrdersHistory((prev) => {
        const updated = [newOrder, ...prev];
        if (typeof window !== "undefined") {
          localStorage.setItem("banky_guest_session_orders", JSON.stringify(updated));
        }
        return updated;
      });

      setCart({});
      setIsCartOpen(false);
    } catch (err: unknown) {
      console.error("Order submission error:", err);
      setSubmitError("Unable to transmit order to kitchen. Please try again or call Front Desk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppLink = (order: QrOrder) => {
    const hotelNumber = "2348037166121";
    const itemsList = order.items
      .map((i) => `• ${i.quantity}x ${i.title} (${formatNaira(i.subtotal)})`)
      .join("%0A");
    const msg = `*NEW ORDER - BANKY HOTEL & SUITES*%0A%0A*Order #:* ${order.orderNumber}%0A*Location:* ${order.roomOrTable} (${order.orderType})%0A${order.guestName ? `*Guest:* ${order.guestName}%0A` : ""}${order.specialInstructions ? `*Special Notes:* ${order.specialInstructions}%0A` : ""}%0A*Items:*%0A${itemsList}%0A%0A*Total:* ${formatNaira(order.totalAmount)}%0A%0A_Sent via In-Room QR Dining_`;
    return `https://wa.me/${hotelNumber}?text=${msg}`;
  };

  return (
    <div className="min-h-screen bg-[#11100f] text-[#f4efe6] pb-36 font-sans antialiased">
      {/* ── 1. Top Hospitality Header & Cover (infused from qmenu & foodscan) ── */}
      <header className="sticky top-0 z-40 bg-[#171614]/95 backdrop-blur-md border-b border-stone-800/80 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-full overflow-hidden border border-[#aa8453]/40 bg-[#222] p-1 flex-shrink-0 shadow">
              <Image
                src="/images/Banky Hotel & Suites Main Logo 1.png"
                alt="Banky Hotel Logo"
                fill
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-lg text-white font-medium tracking-wide leading-tight">
                  Banky Hotel & Suites
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                  <Star className="h-2.5 w-2.5 fill-amber-400" /> 4.9
                </span>
              </div>

              {/* Location Badge with Change Trigger */}
              <button
                onClick={() => setIsLocationPickerOpen(true)}
                className="flex items-center gap-1.5 mt-0.5 text-left group"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-stone-300 font-medium group-hover:text-white transition-colors">
                  {roomOrTable}
                </span>
                <span className="text-[10px] text-[#aa8453] bg-[#aa8453]/15 px-1.5 py-0.2 rounded font-mono group-hover:bg-[#aa8453]/25 flex items-center gap-0.5">
                  Change <ChevronDown className="h-2.5 w-2.5" />
                </span>
              </button>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Table QR Stand Modal */}
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all"
              title="View Table QR Code"
            >
              <QrIcon className="h-4 w-4 text-[#c89e63]" />
              <span className="hidden sm:inline">Table QR</span>
            </button>

            {/* My Orders / Live Tracker Button */}
            {ordersHistory.length > 0 && (
              <button
                onClick={() => setIsTrackerModalOpen(true)}
                className="relative p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all"
                title="Track Active Orders"
              >
                <Clock className="h-4 w-4 text-emerald-400" />
                <span className="hidden sm:inline">Live Orders</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping absolute top-1 right-1" />
              </button>
            )}

            {/* Cart Button */}
            {totalItemsCount > 0 && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 bg-[#aa8453] hover:bg-[#967344] text-white rounded-full shadow-md active:scale-95 transition-transform"
                aria-label="View Cart"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 bg-white text-[#111] text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow">
                  {totalItemsCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ── Hospitality Quick Action Bar (Call Waiter, Request Bill, Wi-Fi) ── */}
        <div className="max-w-2xl mx-auto px-4 pb-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setIsServiceModalOpen(true)}
            className="flex-shrink-0 h-7 px-3 rounded-full bg-[#aa8453]/20 border border-[#aa8453]/50 text-[#f5d799] text-[11px] font-medium flex items-center gap-1.5 hover:bg-[#aa8453]/30 transition-colors"
          >
            <BellRing className="h-3 w-3" />
            <span>Call Waiter</span>
          </button>

          <button
            onClick={() => setIsServiceModalOpen(true)}
            className="flex-shrink-0 h-7 px-3 rounded-full bg-stone-900 border border-stone-800 text-stone-300 text-[11px] font-medium flex items-center gap-1.5 hover:text-white hover:border-stone-700 transition-colors"
          >
            <Receipt className="h-3 w-3 text-stone-400" />
            <span>Request Bill</span>
          </button>

          <button
            onClick={() => {
              setShowOnlyFavorites(!showOnlyFavorites);
              if (!showOnlyFavorites) setActiveCategoryId("all");
            }}
            className={`flex-shrink-0 h-7 px-3 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors border ${
              showOnlyFavorites
                ? "bg-rose-950/80 border-rose-800 text-rose-300 font-semibold"
                : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            <Heart className={`h-3 w-3 ${showOnlyFavorites ? "fill-rose-400 text-rose-400" : ""}`} />
            <span>Favorites ({Object.values(favorites).filter(Boolean).length})</span>
          </button>

          <a
            href="tel:08037166121"
            className="flex-shrink-0 h-7 px-3 rounded-full bg-stone-900 border border-stone-800 text-stone-400 text-[11px] font-medium flex items-center gap-1.5 hover:text-stone-200 transition-colors"
          >
            <PhoneCall className="h-3 w-3 text-[#aa8453]" />
            <span>0803 716 6121</span>
          </a>

          <div className="flex-shrink-0 h-7 px-2.5 rounded-full bg-stone-900/60 border border-stone-800/80 text-stone-500 text-[10px] font-mono flex items-center gap-1">
            <Wifi className="h-3 w-3 text-emerald-500" />
            <span>BankyGuest-WiFi</span>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, grills, pepper soup, cocktails, jollof…"
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-stone-900/90 border border-stone-800 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#aa8453] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-1 text-stone-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        {/* ── 2. Visual Circular Category Stories Bar (infused from SanjayMarathi/FoodApp & FoodScan) ── */}
        <div className="mb-4 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-3.5 min-w-max">
            {/* All Category circle */}
            <button
              onClick={() => {
                setActiveCategoryId("all");
                setShowOnlyFavorites(false);
              }}
              className="flex flex-col items-center gap-1.5 group flex-shrink-0"
            >
              <div
                className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden transition-all duration-300 p-0.5 ${
                  activeCategoryId === "all" && !showOnlyFavorites
                    ? "ring-2 ring-[#c89e63] ring-offset-2 ring-offset-[#111] scale-105"
                    : "border border-stone-800 opacity-85 group-hover:opacity-100"
                }`}
              >
                <Image
                  src={CATEGORY_IMAGES.all}
                  alt="All items"
                  fill
                  className="object-cover rounded-full"
                  sizes="64px"
                />
              </div>
              <span
                className={`text-[11px] font-medium tracking-tight text-center whitespace-nowrap ${
                  activeCategoryId === "all" && !showOnlyFavorites
                    ? "text-[#f5d799] font-semibold"
                    : "text-stone-400 group-hover:text-stone-200"
                }`}
              >
                All Dishes
              </span>
            </button>

            {/* Category circles */}
            {categories.map((cat) => {
              const isActive = activeCategoryId === cat.id && !showOnlyFavorites;
              const imgUrl = CATEGORY_IMAGES[cat.slug] || CATEGORY_IMAGES.all;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategoryId(cat.id);
                    setShowOnlyFavorites(false);
                  }}
                  className="flex flex-col items-center gap-1.5 group flex-shrink-0"
                >
                  <div
                    className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden transition-all duration-300 p-0.5 ${
                      isActive
                        ? "ring-2 ring-[#c89e63] ring-offset-2 ring-offset-[#111] scale-105"
                        : "border border-stone-800 opacity-80 group-hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={imgUrl}
                      alt={cat.name}
                      fill
                      className="object-cover rounded-full"
                      sizes="64px"
                    />
                  </div>
                  <span
                    className={`text-[11px] font-medium tracking-tight text-center max-w-[70px] truncate ${
                      isActive
                        ? "text-[#f5d799] font-semibold"
                        : "text-stone-400 group-hover:text-stone-200"
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. Dietary & Special Tag Filters (infused from Wagamama / FoodScan) ── */}
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          {["all", "Chef Special", "Spicy", "Vegetarian", "Seafood", "Halal", "Platter"].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full flex-shrink-0 font-medium transition-all ${
                selectedTag === tag
                  ? "bg-stone-200 text-stone-900 font-semibold shadow-sm"
                  : "bg-stone-900/80 text-stone-400 border border-stone-800 hover:text-stone-200"
              }`}
            >
              {tag === "all" ? "All Tags" : tag === "Spicy" ? "🌶️ Spicy" : tag === "Chef Special" ? "⭐ Chef Special" : tag === "Vegetarian" ? "🌱 Vegetarian" : tag}
            </button>
          ))}
        </div>

        {/* ── 4. Chef's Recommendation / Trending Strip (infused from FoodApp / QMenu) ── */}
        {activeCategoryId === "all" && !searchQuery && !showOnlyFavorites && featuredItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#c89e63]" />
                <h3 className="font-display text-base text-white font-medium">
                  Chef&apos;s Signature Recommendations
                </h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-[#aa8453] font-mono">
                Top Guest Picks
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {featuredItems.map((fItem) => (
                <div
                  key={fItem.id}
                  onClick={() => setModalItem(fItem)}
                  className="bg-stone-900/70 border border-stone-800/90 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-[#aa8453]/60 transition-all group"
                >
                  <div className="relative h-28 w-full rounded-xl overflow-hidden bg-stone-950 mb-2">
                    <Image
                      src={imageErrors[fItem.id] ? "/images/dining.jpg" : fItem.imageUrl || "/images/dining.jpg"}
                      alt={fItem.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={() => setImageErrors((prev) => ({ ...prev, [fItem.id]: true }))}
                    />
                    <div className="absolute top-1.5 left-1.5 bg-[#aa8453] text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow">
                      Popular
                    </div>
                  </div>
                  <div>
                    <h4 className="font-display text-xs sm:text-sm font-medium text-white line-clamp-1">
                      {fItem.title}
                    </h4>
                    <p className="text-stone-400 text-[10px] line-clamp-1 mt-0.5">
                      {fItem.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-800/60">
                    <span className="font-display text-xs font-bold text-[#c89e63]">
                      {formatNaira(fItem.price)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCartSimple(fItem);
                      }}
                      className="h-6 w-6 rounded-lg bg-[#aa8453] text-white flex items-center justify-center shadow active:scale-90 transition-transform"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. Main Feed Heading ── */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-white font-medium flex items-center gap-2">
            {showOnlyFavorites
              ? "Your Saved Favorites"
              : activeCategoryId === "all"
              ? "All Dishes & Refreshments"
              : categories.find((c) => c.id === activeCategoryId)?.name || "Menu Items"}
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && !loading && (
          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-8 text-center my-6">
            <Utensils className="h-10 w-10 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-300 font-medium">No dishes match your selection</p>
            <p className="text-stone-500 text-xs mt-1">
              Try searching with different keywords or reset your filters.
            </p>
            <button
              onClick={() => {
                setActiveCategoryId("all");
                setSearchQuery("");
                setSelectedTag("all");
                setShowOnlyFavorites(false);
              }}
              className="mt-4 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* ── 6. Menu Items List with Tap-to-Customize ── */}
        <div className="space-y-3.5">
          {filteredItems.map((item) => {
            // Find total quantity of this item across standard & customized entries
            const matchingCartEntries = Object.values(cart).filter((c) => c.item.id === item.id);
            const totalQty = matchingCartEntries.reduce((sum, c) => sum + c.quantity, 0);
            const isOutOfStock = !item.isAvailable;
            const isFav = !!favorites[item.id];

            return (
              <article
                key={item.id}
                onClick={() => {
                  if (item.isAvailable) setModalItem(item);
                }}
                className={`relative bg-[#181715] border rounded-2xl p-3.5 transition-all duration-200 flex gap-3.5 cursor-pointer group ${
                  isOutOfStock
                    ? "border-stone-800/50 opacity-60 bg-stone-900/40"
                    : "border-stone-800/80 hover:border-stone-700 shadow-sm hover:shadow-md"
                }`}
              >
                {/* Food Image Thumbnail */}
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 rounded-xl overflow-hidden bg-stone-900 border border-stone-800">
                  <Image
                    src={imageErrors[item.id] ? "/images/dining.jpg" : item.imageUrl || "/images/dining.jpg"}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 112px, 120px"
                    className={`object-cover transition-transform duration-500 ${
                      isOutOfStock ? "grayscale" : "group-hover:scale-105"
                    }`}
                    onError={() => setImageErrors((prev) => ({ ...prev, [item.id]: true }))}
                    loading="lazy"
                  />
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-1 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/90 px-1.5 py-0.5 rounded border border-red-800/50">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  {item.isFeatured && !isOutOfStock && (
                    <div className="absolute top-1.5 left-1.5 bg-[#aa8453]/90 backdrop-blur-sm text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow">
                      Popular
                    </div>
                  )}
                </div>

                {/* Content details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="font-display text-sm sm:text-base text-white font-medium leading-snug line-clamp-1 group-hover:text-[#f5d799] transition-colors">
                        {item.title}
                      </h3>
                      {/* Favorite Heart Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                        className={`p-1 rounded-full transition-colors active:scale-90 ${
                          isFav ? "text-rose-400" : "text-stone-600 hover:text-stone-300"
                        }`}
                        aria-label="Save to favorites"
                      >
                        <Heart className={`h-4 w-4 ${isFav ? "fill-rose-400" : ""}`} />
                      </button>
                    </div>

                    {/* Dietary Tags */}
                    {item.dietary && item.dietary.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.dietary.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                              tag === "Spicy"
                                ? "bg-red-950/80 text-red-400 border border-red-900/50"
                                : tag === "Chef Special"
                                ? "bg-amber-950/80 text-amber-300 border border-amber-900/50"
                                : tag === "Vegetarian"
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-900/50"
                                : "bg-stone-800 text-stone-300"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-stone-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Price & Quantity Controls */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-800/60">
                    <div>
                      <span className="font-display text-base font-semibold text-[#c89e63] tracking-tight">
                        {formatNaira(item.price)}
                      </span>
                      {item.preparationTime && (
                        <span className="text-[10px] text-stone-500 block">
                          ~{item.preparationTime}
                        </span>
                      )}
                    </div>

                    {/* Actions: Add / Stepper */}
                    {isOutOfStock ? (
                      <span className="text-[11px] text-stone-500 italic bg-stone-900 px-2.5 py-1 rounded-md border border-stone-800">
                        Unavailable
                      </span>
                    ) : totalQty === 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCartSimple(item);
                        }}
                        className="h-8 px-3.5 bg-[#aa8453] hover:bg-[#967344] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 active:scale-95 transition-all shadow-sm shadow-[#aa8453]/20"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 bg-stone-900 border border-stone-700 rounded-lg p-0.5"
                      >
                        <button
                          onClick={() => removeFromCart(matchingCartEntries[0]?.cartKey || item.id)}
                          className="h-7 w-7 flex items-center justify-center text-stone-300 hover:text-white bg-stone-800 rounded active:scale-90 transition-transform"
                          aria-label="Reduce quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-bold text-white font-mono min-w-[1.2rem] text-center">
                          {totalQty}
                        </span>
                        <button
                          onClick={() => addToCartSimple(item)}
                          className="h-7 w-7 flex items-center justify-center text-white bg-[#aa8453] rounded active:scale-90 transition-transform"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* In-House Hospitality Banner */}
        <div className="mt-8 mb-4 p-4 rounded-2xl bg-gradient-to-r from-stone-900 via-[#1a1917] to-stone-900 border border-stone-800 text-center">
          <p className="text-xs text-stone-300 font-medium">
            Room Service • Restaurant Dining • Open Bar & Sitout
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Complimentary delivery for all hotel guests & in-house dining tables
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={() => setIsServiceModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#aa8453]/20 border border-[#aa8453]/40 text-[#f5d799] text-xs font-medium flex items-center gap-1.5 hover:bg-[#aa8453]/30"
            >
              <BellRing className="h-3.5 w-3.5" />
              <span>Call Waiter</span>
            </button>
            <a
              href="tel:08037166121"
              className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 text-xs font-medium flex items-center gap-1.5 hover:text-white"
            >
              <PhoneCall className="h-3.5 w-3.5 text-[#c89e63]" />
              <span>0803 716 6121</span>
            </a>
          </div>
        </div>
      </main>

      {/* ── 7. Floating Bottom "View Order" Bar ── */}
      <AnimatePresence>
        {totalItemsCount > 0 && !isCartOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-4 inset-x-0 z-50 px-4 max-w-2xl mx-auto"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full h-14 bg-gradient-to-r from-[#aa8453] via-[#b6915f] to-[#aa8453] text-white rounded-2xl px-5 flex items-center justify-between shadow-2xl shadow-black/80 border border-white/20 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-black/30 flex items-center justify-center font-mono font-bold text-xs">
                  {totalItemsCount}
                </div>
                <div className="text-left">
                  <span className="font-semibold text-sm tracking-wide block leading-tight">
                    View Your Order
                  </span>
                  <span className="text-[11px] text-white/80">
                    Delivering to {roomOrTable}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight">
                  {formatNaira(totalAmount)}
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 8. Slide-Up Checkout Drawer / Cart Modal ── */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm">
            <div className="flex-1" onClick={() => setIsCartOpen(false)} />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-[#171614] border-t border-stone-800 rounded-t-3xl max-w-2xl w-full mx-auto max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer header */}
              <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#aa8453]/20 text-[#aa8453]">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-base text-white font-medium">
                      In-House Dining Cart
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} selected
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {Object.values(cart).map(({ cartKey, item, quantity, selectedAddons, notes, unitPrice }) => {
                  const effectiveUnit = unitPrice || item.price;
                  const key = cartKey || item.id;
                  return (
                    <div
                      key={key}
                      className="bg-stone-900/70 border border-stone-800 p-3 rounded-xl space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-white line-clamp-1">
                            {item.title}
                          </h4>
                          {selectedAddons && selectedAddons.length > 0 && (
                            <p className="text-[11px] text-[#c89e63] mt-0.5">
                              + {selectedAddons.map((a) => a.name).join(", ")}
                            </p>
                          )}
                          {notes && (
                            <p className="text-[11px] text-stone-400 italic mt-0.5">
                              Note: {notes}
                            </p>
                          )}
                          <p className="text-xs text-stone-400 font-mono mt-0.5">
                            {formatNaira(effectiveUnit)} each
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-lg p-0.5">
                            <button
                              onClick={() => removeFromCart(key)}
                              className="h-6 w-6 flex items-center justify-center text-stone-300 hover:text-white bg-stone-800 rounded active:scale-90"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold text-white font-mono min-w-[1rem] text-center">
                              {quantity}
                            </span>
                            <button
                              onClick={() => addToCartSimple(item)}
                              className="h-6 w-6 flex items-center justify-center text-white bg-[#aa8453] rounded active:scale-90"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="w-16 text-right font-display text-xs font-semibold text-white">
                            {formatNaira(effectiveUnit * quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Delivery Information Form */}
                <form id="qr-checkout-form" onSubmit={handlePlaceOrder} className="pt-3 space-y-3">
                  <div className="border-t border-stone-800 pt-3">
                    <label className="text-xs font-semibold text-stone-300 block mb-2 uppercase tracking-wider">
                      Delivery Destination <span className="text-red-400">*</span>
                    </label>

                    {/* Order Type Toggle */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { id: "table", label: "Restaurant Table" },
                        { id: "room", label: "Room Service" },
                        { id: "poolside_garden", label: "Open Bar / Sitout" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setOrderType(t.id as "room" | "table" | "poolside_garden")}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-medium border transition-colors ${
                            orderType === t.id
                              ? "bg-[#aa8453] text-white border-[#aa8453]"
                              : "bg-stone-900 text-stone-400 border-stone-800 hover:text-white"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Room or Table Input */}
                    <div>
                      <input
                        type="text"
                        required
                        value={roomOrTable}
                        onChange={(e) => setRoomOrTable(e.target.value)}
                        placeholder={
                          orderType === "room"
                            ? "e.g. Room 204 or Executive Suite 3"
                            : orderType === "table"
                            ? "e.g. Table 1 (Main Hall)"
                            : "e.g. Poolside Table 4 or Garden Sitout"
                        }
                        className="w-full h-11 px-3.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#aa8453]"
                      />
                    </div>
                  </div>

                  {/* Guest Name & Phone */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-stone-400 block mb-1">
                        Guest Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Mr. David"
                        className="w-full h-9 px-3 rounded-lg bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#aa8453]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-stone-400 block mb-1">
                        Phone / WhatsApp (Optional)
                      </label>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="e.g. 080..."
                        className="w-full h-9 px-3 rounded-lg bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#aa8453]"
                      />
                    </div>
                  </div>

                  {/* Special Cooking Notes */}
                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1">
                      Special Cooking Notes or Allergies (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Less spicy, extra serviettes, ice on the side, well done..."
                      className="w-full p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#aa8453] resize-none"
                    />
                  </div>

                  {submitError && (
                    <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                      <Info className="h-4 w-4 flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}
                </form>
              </div>

              {/* Drawer footer */}
              <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>Subtotal</span>
                  <span className="text-white font-mono">{formatNaira(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>Delivery & Service</span>
                  <span className="text-emerald-400 font-mono">Complimentary In-House</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-white pt-1 border-t border-stone-800">
                  <span>Total Amount</span>
                  <span className="text-[#c89e63] font-display text-lg">
                    {formatNaira(totalAmount)}
                  </span>
                </div>

                <button
                  type="submit"
                  form="qr-checkout-form"
                  disabled={isSubmitting || totalItemsCount === 0}
                  className="w-full h-12 bg-[#aa8453] hover:bg-[#967344] disabled:bg-stone-800 disabled:text-stone-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#aa8453]/20 active:scale-[0.99] transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending to Kitchen…</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Place In-House Order ({formatNaira(totalAmount)})</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 9. Order Placed Confirmation Modal with Real-time Tracker Hook ── */}
      <AnimatePresence>
        {placedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#191816] border border-[#aa8453]/40 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative"
            >
              <div className="h-14 w-14 bg-emerald-950/80 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <span className="text-[10px] font-mono tracking-widest uppercase text-[#aa8453] bg-[#aa8453]/10 px-2.5 py-0.5 rounded-full border border-[#aa8453]/30">
                Order Received by Kitchen
              </span>

              <h3 className="font-display text-2xl text-white font-medium mt-2">
                Cooking in Progress!
              </h3>
              <p className="text-stone-400 text-xs mt-1">
                Your order is active and queued for fresh preparation by Banky Hotel chefs.
              </p>

              {/* Order summary card */}
              <div className="mt-4 bg-stone-900/90 border border-stone-800 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Order Ref</span>
                  <span className="font-mono text-white font-bold">{placedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Destination</span>
                  <span className="text-white font-medium">{placedOrder.roomOrTable}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Total Dishes</span>
                  <span className="text-white">{placedOrder.totalItems} items</span>
                </div>
                <div className="flex justify-between items-center font-semibold pt-1 border-t border-stone-800">
                  <span className="text-stone-300">Total Amount</span>
                  <span className="text-[#c89e63] font-display text-sm">
                    {formatNaira(placedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Estimated time */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-300 bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                <Clock className="h-4 w-4 text-[#aa8453]" />
                <span>Estimated arrival: <strong>15–25 mins</strong></span>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2">
                <button
                  onClick={() => {
                    setPlacedOrder(null);
                    setIsTrackerModalOpen(true);
                  }}
                  className="w-full h-11 bg-[#aa8453] hover:bg-[#967344] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  <span>Track Live Order Progress</span>
                </button>

                <a
                  href={getWhatsAppLink(placedOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 shadow transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Notify Kitchen / Waiter on WhatsApp</span>
                </a>

                <button
                  onClick={() => setPlacedOrder(null)}
                  className="w-full h-9 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Continue Browsing Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 10. Dish Customization & Add-ons Modal (infused from foodscan & wagamama) ── */}
      <DishDetailModal
        item={modalItem}
        isOpen={!!modalItem}
        onClose={() => setModalItem(null)}
        onAddToCart={addToCartDetailed}
        isFavorite={modalItem ? !!favorites[modalItem.id] : false}
        onToggleFavorite={toggleFavorite}
      />

      {/* ── 11. Table QR Stand Modal (infused from scan1 & scan2) ── */}
      <TableQrCardModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        roomOrTable={roomOrTable}
        orderType={orderType}
      />

      {/* ── 12. Service Request & Call Waiter Modal (infused from qmenu & foodscan) ── */}
      <ServiceRequestModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        roomOrTable={roomOrTable}
        orderType={orderType}
      />

      {/* ── 13. Live Order Tracker Modal (infused from SanjayMarathi/FoodApp & foodscan) ── */}
      <LiveOrderTrackerModal
        isOpen={isTrackerModalOpen}
        onClose={() => setIsTrackerModalOpen(false)}
        activeOrder={activeOrderForTracker}
        ordersHistory={ordersHistory}
        onSelectOrder={(ord) => setActiveOrderForTracker(ord)}
      />

      {/* ── 14. Quick Location Picker Modal ── */}
      <AnimatePresence>
        {isLocationPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="fixed inset-0" onClick={() => setIsLocationPickerOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 bg-[#171614] border border-stone-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#c89e63]" />
                  <h3 className="font-display text-sm font-medium text-white">
                    Select Your Dining Location
                  </h3>
                </div>
                <button
                  onClick={() => setIsLocationPickerOpen(false)}
                  className="p-1 text-stone-400 hover:text-white rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "table", label: "Table" },
                    { id: "room", label: "Room" },
                    { id: "poolside_garden", label: "Sitout" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setOrderType(t.id as "room" | "table" | "poolside_garden")}
                      className={`py-1.5 text-center rounded-lg text-xs font-medium border transition-colors ${
                        orderType === t.id
                          ? "bg-[#aa8453] text-white border-[#aa8453]"
                          : "bg-stone-900 text-stone-400 border-stone-800 hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">
                    Enter Table or Room Number:
                  </label>
                  <input
                    type="text"
                    value={roomOrTable}
                    onChange={(e) => setRoomOrTable(e.target.value)}
                    placeholder="e.g. Table 1 or Room 204"
                    className="w-full h-10 px-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#aa8453]"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-stone-500 w-full">Quick Suggestions:</span>
                  {["Table 1", "Table 2", "Table 4", "Room 101", "Room 204", "Poolside 1"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setRoomOrTable(s);
                        if (s.startsWith("Table")) setOrderType("table");
                        else if (s.startsWith("Room")) setOrderType("room");
                        else setOrderType("poolside_garden");
                      }}
                      className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-[10px] text-stone-300 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsLocationPickerOpen(false)}
                  className="w-full h-10 mt-2 bg-[#aa8453] hover:bg-[#967344] text-white rounded-xl text-xs font-semibold"
                >
                  Confirm Location
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QrMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121110] flex items-center justify-center text-stone-400 text-sm">
          Loading Banky Hotel dining menu…
        </div>
      }
    >
      <QrMenuContent />
    </Suspense>
  );
}
