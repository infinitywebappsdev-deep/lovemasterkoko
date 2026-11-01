"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, Moon, Phone, Sun, X } from "lucide-react";
import { HOTEL } from "@/lib/hotel";
import { DEFAULT_BRAND_IDENTITY } from "@/lib/brand-identity";
import { useTheme } from "@/lib/ThemeContext";

const NAV = [
  { to: "/rooms", label: "Rooms & Suites" },
  { to: "/restaurant", label: "Dining" },
  { to: "/bar", label: "The Bar" },
  { to: "/events", label: "Events" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    let ticking = false;
    const update = () => {
      const headerEl = headerRef.current;
      const headerHeight = headerEl ? headerEl.offsetHeight : 72;
      const hero = document.querySelector<HTMLElement>("main > section:first-of-type");
      if (hero && typeof hero.getBoundingClientRect === "function") {
        // Stay transparent for the full hero video/image, then turn solid.
        setScrolled(hero.getBoundingClientRect().bottom <= headerHeight);
      } else {
        setScrolled(window.scrollY > 40);
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  if (pathname?.startsWith("/qr") || pathname?.startsWith("/admin")) return null;

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-all duration-300 ${
          scrolled || open
            ? "border-b border-[var(--border)] bg-[var(--surface)]/92 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="container-x flex h-[64px] items-center justify-between gap-4 sm:h-[74px]">
          {/* Brand */}
          <Link href="/" aria-label="Banky Hotel & Suites — home" className="flex items-center gap-2.5">
            <Image
              src={DEFAULT_BRAND_IDENTITY.activeLogoUrl}
              alt="Banky Hotel & Suites"
              width={150}
              height={60}
              priority
              referrerPolicy="no-referrer"
              className="h-9 w-auto object-contain sm:h-10"
            />
            {!scrolled && <span className="sr-only">Banky Hotel & Suites</span>}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => {
              const active = pathname === item.to || pathname?.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={`relative text-[0.78rem] tracking-[0.02em] transition-colors ${
                    scrolled
                      ? active
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      : "text-white/85 hover:text-white"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute -bottom-1.5 left-0 h-px w-full"
                      style={{ backgroundColor: scrolled ? "var(--accent)" : "rgba(255,255,255,0.9)" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <a
              href={`tel:${HOTEL.phone}`}
              className={`hidden items-center gap-2 text-[0.78rem] transition-colors md:inline-flex ${
                scrolled ? "text-[var(--text-secondary)] hover:text-[var(--text-primary)]" : "text-white/85 hover:text-white"
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">+234 903 587 9708</span>
            </a>

            <button
              type="button"
              suppressHydrationWarning
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to night mode" : "Switch to day mode"}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                scrolled
                  ? "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
                  : "border-white/25 text-white hover:bg-white/10"
              }`}
            >
              <span suppressHydrationWarning className="inline-flex">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
            </button>

            <Link
              href="/booking"
              className="hidden items-center gap-1.5 rounded-full px-5 py-2.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white transition-all hover:-translate-y-px sm:inline-flex"
              style={{ backgroundColor: scrolled ? "var(--text-primary)" : "var(--accent)" }}
            >
              Book a stay
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors lg:hidden ${
                scrolled || open
                  ? "border-[var(--border)] text-[var(--text-primary)]"
                  : "border-white/25 text-white"
              }`}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-x-0 top-[64px] bottom-0 z-40 animate-sheet overflow-y-auto border-t border-[var(--border)] bg-[var(--surface)] lg:hidden">
          <div className="container-x flex min-h-full flex-col justify-between py-6">
            <nav className="flex flex-col">
              {NAV.map((item, i) => (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline justify-between border-b border-[var(--border)] py-4"
                >
                  <span className="font-display text-[1.55rem] leading-none text-[var(--text-primary)]">
                    {item.label}
                  </span>
                  <span className="text-[0.62rem] tracking-[0.2em] text-[var(--text-muted)]">
                    0{i + 1}
                  </span>
                </Link>
              ))}
            </nav>

            <div className="mt-8 space-y-4">
              <Link href="/booking" onClick={() => setOpen(false)} className="btn-gold w-full">
                Book a stay
              </Link>
              <div className="flex flex-col gap-2 text-sm text-[var(--text-muted)]">
                <a href={`tel:${HOTEL.phone}`} className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> {HOTEL.phone}
                </a>
                <span className="text-xs leading-relaxed">{HOTEL.address}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
