"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Calendar, Sun, Moon } from "lucide-react";
import { PhoneSolidIcon } from "@/components/icons/PhoneSolidIcon";
import { HOTEL } from "@/lib/hotel";
import { DEFAULT_BRAND_IDENTITY } from "@/lib/brand-identity";
import { useTheme } from "@/lib/ThemeContext";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/rooms", label: "Rooms & Suites" },
  { to: "/restaurant", label: "The Restaurant" },
  { to: "/bar", label: "Lounge" },
  { to: "/events", label: "Meetings & Events" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // When the menu opened — lets us swallow the rapid "second tap" that lands
  // on the overlay's logo (which sits exactly where the hamburger is) before
  // the menu has visually appeared.
  const menuOpenedAtRef = useRef(0);
  const { theme, toggleTheme, watTimeString } = useTheme();
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  // Transparent header with white text at top; solid brand-blue bar with white text once scrolled past the hero media.
  const iconBtnColor = scrolled
    ? "text-white hover:text-[var(--accent-light)]"
    : "text-white hover:text-[var(--accent-light)]";

  useEffect(() => {
    let ticking = false;
    const update = () => {
      const headerEl = headerRef.current;
      const headerHeight = headerEl ? headerEl.offsetHeight : 64;

      // Find the hero or top media section (video or image header)
      const heroSection = document.querySelector<HTMLElement>("main > section:first-of-type, section:first-of-type");
      if (heroSection) {
        const rect = heroSection.getBoundingClientRect();
        // Nav bar only transitions to solid color AFTER scrolling past the video or image header
        setScrolled(rect.bottom <= headerHeight);
      } else {
        setScrolled(window.scrollY > 300);
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
    if (open) menuOpenedAtRef.current = Date.now();
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const toggleMenu = useCallback(() => setOpen((prev) => !prev), []);

  if (pathname?.startsWith("/qr") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50">
      <div className={`transition-all duration-[400ms] ease-in-out ${scrolled ? "bg-[#0a2777]/40 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.18)]" : "bg-transparent"}`} >
        <div className={`container-x grid grid-cols-[1fr_auto_1fr] items-center transition-all duration-[400ms] ease-in-out ${scrolled ? "py-0.5" : "py-0.5 sm:py-1"}`}>
          {/* Left — Hamburger (mobile/tablet) · Phone (desktop) */}
          <div className="flex items-center justify-start min-w-0">
            {/* Mobile & Tablet: Hamburger menu icon */}
            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className={`lg:hidden p-1.5 bg-transparent border-none shadow-none transition-transform active:scale-90 flex items-center justify-center cursor-pointer ${iconBtnColor}`}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Desktop: Phone number */}
            <a
              href={`tel:${HOTEL.phone}`}
              className={`hidden lg:inline-flex items-center gap-2 font-condensed text-[0.76rem] tracking-[0.16em] uppercase font-medium py-1 px-2.5 transition-colors duration-[400ms] ease-in-out ${scrolled ? "text-white/90 hover:text-white" : "text-white/90 hover:text-white"}`}
            >
              <PhoneSolidIcon className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              <span>+234 903 587 9708</span>
            </a>
          </div>

          {/* Center — Logo, dead-centered by the 1fr / auto / 1fr grid */}
          <Link href="/" className="flex items-center justify-center group shrink-0" aria-label="Banky Hotel & Suites Home">
            <span className="shrink-0 flex items-center justify-center w-auto h-[54px] sm:h-[64px] lg:h-[72px] xl:h-[78px] bg-transparent border-none p-0 transition-all duration-[400ms] ease-in-out group-hover:scale-105">
              <Image
                src={DEFAULT_BRAND_IDENTITY.activeLogoUrl}
                alt="Banky Hotel & Suites"
                width={180}
                height={78}
                priority
                referrerPolicy="no-referrer"
                className="h-full w-auto max-w-[130px] sm:max-w-[155px] lg:max-w-[180px] object-contain bg-transparent select-none drop-shadow-sm"
              />
            </span>
          </Link>

          {/* Right — Day/Night toggle, Reserve, Menu */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            {/* Mobile & tablet: Day/Night toggle */}
            <button
              suppressHydrationWarning
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to night mode" : "Switch to day mode"}
              title={theme === "light" ? "Switch to night mode" : "Switch to day mode"}
              className={`p-1.5 -mr-1.5 sm:mr-0 bg-transparent border-none shadow-none transition-transform active:scale-90 flex items-center justify-center cursor-pointer ${iconBtnColor}`}
            >
              <span suppressHydrationWarning className="inline-flex">
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )
              }
              </span>
            </button>

            {/* Desktop: Reserve button */}
            <Link
              href="/booking"
              className="hidden lg:inline-flex rounded-full px-4 sm:px-5 h-[34px] sm:h-9 text-[0.74rem] font-condensed font-medium tracking-[0.2em] uppercase text-white transition-all items-center justify-center gap-1.5 shadow-sm active:scale-95"
              style={{ backgroundColor: "var(--accent)" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-dark)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--accent)"}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Reserve Room</span>
            </Link>

            {/* Desktop: Menu button */}
            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className={`hidden lg:flex items-center justify-center gap-2 h-[34px] sm:h-9 px-3 rounded-full transition-all duration-[400ms] ease-in-out active:scale-95 border ${scrolled ? "bg-white/10 text-white border-white/20 hover:bg-white/20" : "bg-transparent text-white border-white/30 hover:bg-white/10"}`}
            >
              <span className="hidden sm:inline font-condensed text-xs uppercase tracking-[0.22em] font-medium">{open ? "Close" : "Menu"}</span>
              {open ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & tablet full-screen menu overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col justify-between overflow-y-auto animate-fade-in">
          <div className="container-x py-4 sm:py-6 flex items-center justify-between border-b border-white/10 shrink-0">
            <Link
              href="/"
              onClick={(e) => {
                // Ignore taps during the first moment after opening — the logo
                // sits under the hamburger, so an impatient double-tap would
                // otherwise slam the menu shut before it is even seen.
                if (Date.now() - menuOpenedAtRef.current < 500) {
                  e.preventDefault();
                  return;
                }
                setOpen(false);
              }}
              className="flex items-center group shrink-0"
              aria-label="Banky Hotel & Suites Home"
            >
              <span className="shrink-0 flex items-center justify-center bg-transparent p-0 h-12 sm:h-14">
                <Image
                  src={DEFAULT_BRAND_IDENTITY.activeLogoUrl}
                  alt="Banky Hotel & Suites"
                  width={150}
                  height={56}
                  referrerPolicy="no-referrer"
                  className="h-full w-auto object-contain bg-transparent select-none drop-shadow-sm"
                />
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                // The X sits directly above the desktop Menu pill — swallow the
                // impatient double-click so the menu can't close before it shows.
                if (Date.now() - menuOpenedAtRef.current < 500) return;
                setOpen(false);
              }}
              aria-label="Close menu"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white transition-all hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="container-x py-8 sm:py-12 md:py-16 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-6" style={{ color: "var(--accent)" }}>
              <span className="h-px w-6" style={{ backgroundColor: "var(--accent)" }} />
              <span className="font-condensed text-xs uppercase tracking-[0.25em] font-medium">Navigation Menu</span>
            </div>
            <div className="space-y-2">
              {NAV.map((item, i) => (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-3 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display text-stone-200 hover:text-[var(--accent)] transition-all border-b border-white/5 hover:translate-x-2 group"
                >
                  <span className="flex items-baseline gap-4">
                    <span className="font-condensed text-xs sm:text-sm tracking-[0.2em] opacity-60" style={{ color: "var(--accent)" }}>0{i + 1}.</span>
                    <span>{item.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="container-x py-4 border-t border-white/10 flex justify-between items-center text-xs text-stone-400 shrink-0">
            <span>&copy; {new Date().getFullYear()} Banky Hotel & Suites</span>
            <span className="font-condensed uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>Four-Star Luxury Hotel &middot; Ado-Ekiti</span>
          </div>
        </div>
      )}
    </header>
  );
}