"use client";

import { useState } from "react";
import Image from "next/image";
import {
  X,
  Plus,
  Minus,
  Clock,
  Flame,
  Check,
  ShoppingBag,
  Heart,
  Sparkles,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MenuItem, DishAddon, DietaryTag } from "@/lib/qr-menu/types";
import { formatNaira } from "@/lib/qr-menu/store";

// Preset popular accompaniments / add-ons for Banky Hotel dining
const POPULAR_ADDONS: Record<string, DishAddon[]> = {
  default: [
    { id: "addon-dodo", name: "Extra Fried Golden Plantain (Dodo)", price: 1500 },
    { id: "addon-coleslaw", name: "Fresh Gourmet Coleslaw", price: 1000 },
    { id: "addon-pepper-sauce", name: "Signature Hot Pepper Sauce", price: 800 },
    { id: "addon-chapman", name: "Chilled Banky Special Chapman", price: 2500 },
  ],
  rice: [
    { id: "addon-dodo", name: "Extra Fried Golden Plantain (Dodo)", price: 1500 },
    { id: "addon-coleslaw", name: "Fresh Gourmet Coleslaw", price: 1000 },
    { id: "addon-chicken", name: "Extra Grilled Quarter Chicken", price: 3500 },
    { id: "addon-chapman", name: "Chilled Banky Special Chapman", price: 2500 },
  ],
  soups: [
    { id: "addon-swallow", name: "Extra Hot Swallow (Pounded Yam / Eba)", price: 1200 },
    { id: "addon-beef", name: "Extra Assorted Meat / Goat Meat", price: 3000 },
    { id: "addon-fish", name: "Extra Fresh Catfish Portion", price: 4000 },
    { id: "addon-water", name: "Chilled Bottled Spring Water (75cl)", price: 600 },
  ],
  grills: [
    { id: "addon-chips", name: "Gourmet French Fries / Potato Chips", price: 2000 },
    { id: "addon-dodo", name: "Extra Fried Sweet Plantain", price: 1500 },
    { id: "addon-suya-pepper", name: "Extra Yaji / Suya Spice & Onions", price: 600 },
    { id: "addon-malt", name: "Chilled Malt / Soft Drink", price: 1000 },
  ],
  breakfast: [
    { id: "addon-eggs", name: "Extra Pair of Fried / Scrambled Eggs", price: 1500 },
    { id: "addon-sausage", name: "Pair of Grilled Beef Sausages", price: 1800 },
    { id: "addon-toast", name: "Buttered Toast (2 Slices)", price: 800 },
    { id: "addon-coffee", name: "Freshly Brewed Hot Coffee / Tea", price: 1200 },
  ],
};

interface DishDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, addons: DishAddon[], notes: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (itemId: string) => void;
}

export function DishDetailModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
}: DishDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<DishAddon[]>([]);
  const [cookingNotes, setCookingNotes] = useState("");
  const [spicePreference, setSpicePreference] = useState<"Mild" | "Medium" | "Hot">("Medium");

  if (!isOpen || !item) return null;

  // Pick addons based on category
  const categoryAddons =
    POPULAR_ADDONS[item.categoryId] ||
    (item.categoryId.includes("soup") ? POPULAR_ADDONS.soups : POPULAR_ADDONS.default);

  const addonsTotal = selectedAddons.reduce((acc, a) => acc + a.price, 0);
  const totalCost = (item.price + addonsTotal) * quantity;

  const toggleAddon = (addon: DishAddon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const handleAdd = () => {
    const notesWithSpice = [
      spicePreference ? `Spice: ${spicePreference}` : "",
      cookingNotes.trim(),
    ]
      .filter(Boolean)
      .join(" • ");

    onAddToCart(item, quantity, selectedAddons, notesWithSpice);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative z-10 bg-[#171614] border-t sm:border border-stone-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Top image header with close & favorite buttons */}
          <div className="relative h-56 sm:h-64 w-full bg-stone-900 flex-shrink-0">
            <Image
              src={item.imageUrl || "/images/dining.jpg"}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 500px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171614] via-transparent to-black/60" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 active:scale-90 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Favorite button */}
            <button
              onClick={() => onToggleFavorite(item.id)}
              className={`absolute top-3.5 left-3.5 p-2 rounded-full backdrop-blur-md transition-all active:scale-90 ${
                isFavorite
                  ? "bg-rose-500/90 text-white"
                  : "bg-black/60 text-stone-300 hover:text-white"
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-white" : ""}`} />
            </button>

            {/* Badges on image */}
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider bg-[#aa8453]/90 text-white px-2 py-0.5 rounded shadow">
                  {item.categoryName}
                </span>
                <h2 className="font-display text-lg sm:text-xl text-white font-medium mt-1 leading-snug drop-shadow-md">
                  {item.title}
                </h2>
              </div>
              <span className="font-display text-lg sm:text-xl font-bold text-[#c89e63] bg-black/70 px-2.5 py-0.5 rounded-lg border border-[#aa8453]/40 shadow">
                {formatNaira(item.price)}
              </span>
            </div>
          </div>

          {/* Scrollable details */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Meta info strip: prep time, dietary tags */}
            <div className="flex flex-wrap items-center gap-2">
              {item.preparationTime && (
                <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-md font-mono">
                  <Clock className="h-3 w-3 text-[#aa8453]" />
                  {item.preparationTime}
                </span>
              )}

              {item.dietary?.map((tag: DietaryTag) => (
                <span
                  key={tag}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
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

            {/* Description */}
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              {item.description}
            </p>

            {/* Spice Preference Selector (for warm luxury hospitality) */}
            <div className="bg-stone-900/60 border border-stone-800 p-3 rounded-xl">
              <label className="text-xs font-medium text-stone-300 flex items-center gap-1.5 mb-2">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Spice Level Preference</span>
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(["Mild", "Medium", "Hot"] as const).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSpicePreference(sp)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                      spicePreference === sp
                        ? "bg-[#aa8453] text-white border-[#aa8453] font-semibold"
                        : "bg-stone-950 text-stone-400 border-stone-800 hover:text-white"
                    }`}
                  >
                    {sp === "Mild" ? "Mild (Gentle)" : sp === "Medium" ? "Medium (Traditional)" : "Hot 🌶️ (Fiery)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Add-ons / Accompaniments (infused from foodscan.xyz & wagamama) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#c89e63]" />
                  <span>Enhance Your Dish (Add-ons)</span>
                </label>
                <span className="text-[10px] text-stone-500 font-mono">Optional</span>
              </div>

              <div className="space-y-2">
                {categoryAddons.map((addon) => {
                  const isChecked = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-[#aa8453]/15 border-[#aa8453] text-white"
                          : "bg-stone-900/70 border-stone-800/80 text-stone-300 hover:border-stone-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? "bg-[#aa8453] border-[#aa8453] text-white"
                              : "border-stone-700 bg-stone-950"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-xs font-medium">{addon.name}</span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-[#c89e63]">
                        +{formatNaira(addon.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chef Notes / Allergies Input */}
            <div>
              <label className="text-xs font-medium text-stone-400 block mb-1.5">
                Special Cooking Instructions or Dietary Restrictions (Optional)
              </label>
              <textarea
                value={cookingNotes}
                onChange={(e) => setCookingNotes(e.target.value)}
                placeholder="e.g. Less salt, crisp skin, separate soup bowl, extra serviettes..."
                rows={2}
                className="w-full p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#aa8453] resize-none"
              />
            </div>
          </div>

          {/* Footer Controls: Quantity Stepper & Add to Cart */}
          <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center gap-3">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-xl p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-white bg-stone-800 active:scale-90 transition-transform"
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-7 text-center font-mono font-bold text-sm text-white">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-white bg-[#aa8453] active:scale-90 transition-transform"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Add to Basket button */}
            <button
              onClick={handleAdd}
              className="flex-1 h-11 px-4 bg-[#aa8453] hover:bg-[#967344] text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-[#aa8453]/20 active:scale-[0.98] transition-all"
            >
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                <span>Add to Order</span>
              </span>
              <span className="font-display font-bold text-sm tracking-tight">
                {formatNaira(totalCost)}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
