"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, Utensils, Wine, Loader2, QrCode, ArrowRight } from "lucide-react";
import { MenuCategory, MenuItem } from "@/lib/qr-menu/types";
import {
  subscribeMenuCategories,
  subscribeMenuItems,
  formatNaira,
} from "@/lib/qr-menu/store";
import { whatsappLink, HOTEL } from "@/lib/hotel";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

type Tab = "food" | "drinks";

/** Categories matching this pattern belong on the Drinks tab, everything else is Food. */
const DRINK_PATTERN = /\bbar\b|drink|wine|cocktail|beverage|smoothie|juice|beer|spirit|champagne|water/i;

function tabForCategory(cat: MenuCategory): Tab {
  return DRINK_PATTERN.test(`${cat.id} ${cat.name}`) ? "drinks" : "food";
}

function DietaryBadges({ tags }: { tags: string[] }) {
  const shown = tags
    .filter((t) => ["Spicy", "Chef Special", "Vegetarian", "Platter", "Seafood"].includes(t))
    .slice(0, 2);
  if (shown.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5 mt-1">
      {shown.map((t) => (
        <span
          key={t}
          className="text-[0.6rem] uppercase tracking-wider font-condensed font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent-dark)] dark:text-[var(--accent)]"
        >
          {t === "Spicy" ? "🌶 Spicy" : t === "Chef Special" ? "★ Chef's Pick" : t}
        </span>
      ))}
    </span>
  );
}

export function MenuViewer() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("food");
  const [query, setQuery] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const unsubCats = subscribeMenuCategories(setCategories);
    const unsubItems = subscribeMenuItems((list) => {
      setItems(list);
      setLoading(false);
    });
    return () => {
      unsubCats();
      unsubItems();
    };
  }, []);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visibleCats = categories
      .filter((c) => c.isActive !== false && tabForCategory(c) === tab)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return visibleCats
      .map((cat) => {
        const catItems = items
          .filter((i) => i.categoryId === cat.id)
          .filter(
            (i) =>
              !q ||
              i.title.toLowerCase().includes(q) ||
              (i.description || "").toLowerCase().includes(q)
          )
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return { cat, items: catItems };
      })
      .filter((s) => s.items.length > 0);
  }, [categories, items, tab, query]);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const orderMessage =
    `Hello ${HOTEL.name}, I would like to place an order from the menu.\n` +
    `Item(s): \n` +
    `Room / Table: `;

  const totalMatches = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="container-x max-w-4xl pb-20">
      {/* Search */}
      <div className="relative mt-8 mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search dishes, drinks, price…"
          aria-label="Search the menu"
          className="w-full pl-11 pr-11 py-3.5 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#26262b] text-sm text-[#222] dark:text-[#f4efe6] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#222] dark:hover:text-[#f4efe6]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Food / Drinks tabs */}
      <div
        className="grid grid-cols-2 gap-1 p-1 rounded-full bg-stone-100 dark:bg-[#26262b] border border-stone-200 dark:border-stone-700"
        role="tablist"
        aria-label="Menu sections"
      >
        {(
          [
            { key: "food", label: "Food", icon: Utensils },
            { key: "drinks", label: "Drinks", icon: Wine },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setQuery("");
            }}
            className={`py-3 rounded-full text-xs font-condensed uppercase tracking-[0.18em] font-semibold inline-flex items-center justify-center gap-2 transition-all ${
              tab === key
                ? "bg-[#1b1b1b] text-[var(--accent)] dark:bg-[var(--accent)] dark:text-black shadow"
                : "text-stone-500 dark:text-stone-400 hover:text-[#222] dark:hover:text-[#f4efe6]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Sticky section chips */}
      {sections.length > 1 && (
        <nav
          className="sticky top-16 z-20 -mx-5 px-5 py-3 mt-5 bg-white/90 dark:bg-[#202023]/90 backdrop-blur border-b border-stone-200/70 dark:border-stone-700/70 overflow-x-auto"
          aria-label="Menu categories"
        >
          <div className="flex gap-2 w-max">
            {sections.map(({ cat }) => (
              <button
                key={cat.id}
                onClick={() => scrollToSection(cat.id)}
                className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-[0.7rem] font-condensed uppercase tracking-wider font-semibold border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:border-[var(--accent)] hover:text-[var(--accent-dark)] dark:hover:text-[var(--accent)] transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-stone-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading menu…
        </div>
      )}

      {/* Sections */}
      {!loading && (
        <div className="mt-8 space-y-14">
          {sections.map(({ cat, items: catItems }) => (
            <section
              key={cat.id}
              id={`section-${cat.id}`}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
              className="scroll-mt-36"
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="h-px w-8 bg-[var(--accent)]" />
                  <h2 className="font-display text-2xl sm:text-3xl text-[#222] dark:text-[#f4efe6]">
                    {cat.name}
                  </h2>
                  <span className="h-px w-8 bg-[var(--accent)]" />
                </div>
                {cat.description && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xl mx-auto">
                    {cat.description}
                  </p>
                )}
              </div>

              <ul className="divide-y divide-stone-100 dark:divide-stone-700/60">
                {catItems.map((item) => {
                  const unavailable = item.isAvailable === false;
                  return (
                    <li
                      key={item.id}
                      className={`py-4 ${unavailable ? "opacity-55" : ""}`}
                    >
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`font-medium text-[0.98rem] text-[#222] dark:text-[#f4efe6] ${
                            unavailable ? "line-through decoration-stone-400" : ""
                          }`}
                        >
                          {item.title}
                          {item.isFeatured && !unavailable && (
                            <span className="ml-1.5 text-[var(--accent-dark)] dark:text-[var(--accent)]" aria-label="Featured">
                              ★
                            </span>
                          )}
                        </span>
                        <span
                          className="flex-1 border-b border-dotted border-stone-300 dark:border-stone-600 translate-y-[-4px]"
                          aria-hidden="true"
                        />
                        {unavailable ? (
                          <span className="text-[0.65rem] font-condensed uppercase tracking-wider text-stone-400 whitespace-nowrap">
                            Unavailable
                          </span>
                        ) : (
                          <span className="font-display text-[1.02rem] text-[var(--accent-dark)] dark:text-[var(--accent)] whitespace-nowrap">
                            {formatNaira(item.price)}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400 pr-16">
                          {item.description}
                        </p>
                      )}
                      {item.dietary && item.dietary.length > 0 && (
                        <DietaryBadges tags={item.dietary} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {totalMatches === 0 && (
            <div className="text-center py-14 text-stone-400 text-sm">
              {query ? (
                <>
                  Nothing matches “{query}”.{" "}
                  <button
                    onClick={() => setQuery("")}
                    className="text-[var(--accent-dark)] dark:text-[var(--accent)] underline"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                "No items in this section yet."
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer CTA */}
      <div className="mt-16 rounded-3xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#26262b] p-6 sm:p-8 text-center">
        <p className="text-xs font-condensed uppercase tracking-[0.2em] text-[var(--accent-dark)] dark:text-[var(--accent)] mb-2">
          Ready to order?
        </p>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-5 max-w-md mx-auto">
          Message us on WhatsApp to order for your room or table — or show your QR card to
          our staff. Prices are in Naira and include preparation.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={whatsappLink(orderMessage)}
            target="_blank"
            rel="noreferrer"
            className="btn-gold px-6 py-3 text-xs inline-flex items-center gap-2"
          >
            <WhatsAppIcon text="Order on WhatsApp" iconClassName="h-3.5 w-3.5" />
          </a>
          <Link
            href="/qr"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-condensed tracking-wider uppercase font-semibold border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:border-[var(--accent)] hover:text-[var(--accent-dark)] dark:hover:text-[var(--accent)] transition-colors"
          >
            <QrCode className="h-3.5 w-3.5" />
            Table / Room ordering
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mt-5 text-[0.7rem] text-stone-400">
          All dishes prepared fresh at {HOTEL.name}. Kindly inform us of any allergies.
        </p>
      </div>
    </div>
  );
}
