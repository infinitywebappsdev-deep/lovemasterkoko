"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Calendar, Sun, Moon } from "lucide-react";
import { PhoneSolidIcon } from "@/components/icons/PhoneSolidIcon";
import { HOTEL } from "@/lib/hotel";
import { useTheme } from "@/lib/ThemeContext";
import { BankyLogo } from "@/components/common/BankyLogo";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/rooms", label: "Rooms & Suites" },
  { to: "/dining", label: "Restaurant & Bar" },
  { to: "/events", label: "Meetings & Events" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Transparent header with white text at top; solid brand-blue bar with white text once scrolled past 50px.
  const iconBtnColor = scrolled
    ? "text-white hover:text-[var(--accent-light)]"
    : "text-white hover:text-[var(--accent-light)]";

  useEffect(() => {
    // Lightweight, performant scroll listener: passive + rAF-throttled (max one state update per frame).
    let ticking = false;
    const update = () => {
      setScrolled(window.scrollY > 50);
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
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className={`transition-all duration-[400ms] ease-in-out ${scrolled ? "bg-[#0a2777] shadow-[0_4px_12px_rgba(0,0,0,0.18)]" : "bg-transparent"}`}>
        <div className={`container-x flex items-center justify-between transition-all duration-[400ms] ease-in-out ${scrolled ? "py-1.5" : "py-2 sm:py-2.5"}`}>
          {/* Left — Hamburger on mobile & tablet; Phone on desktop */}
          <div className="flex-1 flex items-center justify-start max-lg:self-stretch max-lg:items-start">
            {/* Mobile & Tablet: Hamburger menu icon at top-left with no border and no background */}
            <button
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close menu" : "Open menu"}
              className={`lg:hidden p-2 -ml-2 mt-1.5 bg-transparent border-none shadow-none transition-transform active:scale-90 flex items-center justify-center cursor-pointer ${iconBtnColor}`}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Desktop: Phone number */}
            <a
              href={`tel:${HOTEL.phone}`}
              className={`hidden lg:inline-flex items-center gap-2 font-condensed text-[0.76rem] tracking-[0.16em] uppercase font-medium py-1.5 px-3 transition-colors duration-[400ms] ease-in-out ${scrolled ? "text-white/90 hover:text-white" : "text-white/90 hover:text-white"}`}
            >
              <PhoneSolidIcon className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              <span>+234 903 587 9708</span>
            </a>
          </div>

          {/* Center — logo. Same "Main Logo 1" asset in both states; a light border + 4px padding fades in once scrolled. */}
          <Link href="/" className="flex items-center group shrink-0">
            <span
              className={`shrink-0 flex items-center justify-center w-[185px] sm:w-[222px] h-[124px] sm:h-[146px] transition-all duration-[400ms] ease-in-out group-hover:scale-105 ${
                scrolled
                  ? "bg-white border border-[#e0e0e0] p-1"
                  : "bg-transparent border border-transparent p-0"
              }`}
            >
              <img
                src="/images/Banky Hotel & Suites Main Logo 1.png"
                alt="Banky Hotel & Suites Main Logo"
                className="w-full h-full object-contain"
              />
            </span>
          </Link>

          {/* Right — Day/Night toggle on mobile & tablet; Reserve + Day/Night + Menu on desktop */}
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 max-lg:self-stretch max-lg:items-start">
            {/* Mobile & Tablet Mode: Day or Night toggle button at the top-right */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              className={`p-2 -mr-2 mt-1.5 sm:mr-0 bg-transparent border-none shadow-none transition-transform active:scale-90 flex items-center justify-center cursor-pointer ${iconBtnColor}`}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <Sun className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </button>

            {/* Desktop: Reserve button */}
            <Link
              href="/booking"
              className="hidden lg:inline-flex rounded-none px-5 sm:px-6 py-2 sm:py-2.5 text-[0.76rem] font-condensed font-medium tracking-[0.22em] uppercase text-white transition-all min-h-[40px] items-center gap-1.5"
              style={{ backgroundColor: "var(--accent)" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-dark)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--accent)"}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Reserve Room</span>
            </Link>

            {/* Desktop: Menu button */}
            <button
              onClick={() => setOpen(!open)}
              className={`hidden lg:flex items-center gap-2 h-10 sm:h-11 px-3 sm:px-4 transition-all duration-[400ms] ease-in-out active:scale-95 border ${scrolled ? "bg-white/10 text-white border-white/20 hover:bg-white/20" : "bg-transparent text-white border-white/30 hover:bg-white/10"}`}
            >
              <span className="hidden sm:inline font-condensed text-xs uppercase tracking-[0.22em] font-medium">{open ? "Close" : "Menu"}</span>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#1b1b1b] text-white flex flex-col justify-between overflow-y-auto animate-fade-in">
          <div className="container-x py-4 sm:py-6 flex items-center justify-between border-b border-white/10 shrink-0">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
              <span className="shrink-0 flex items-center justify-center bg-transparent p-0">
                <BankyLogo
                  className="w-[68px] sm:w-[80px] h-auto"
                  variant="white"
                />
              </span>
              <div>
                <span className="font-display text-xl sm:text-2xl text-white block leading-tight font-normal">Banky Hotel &amp; Suites</span>
                <span className="font-condensed text-[0.62rem] tracking-[0.25em] uppercase" style={{ color: "var(--accent)" }}>The Luxury Experience</span>
              </div>
            </Link>
            <button onClick={() => setOpen(false)} className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white transition-all" style={{ ["--tw-ring-opacity" as string]: "1" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
              aria-label="Close menu"
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
                <Link key={item.to} href={item.to} onClick={() => setOpen(false)} className="flex items-center justify-between py-3 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display text-stone-200 hover:text-[var(--accent)] transition-all border-b border-white/5 hover:translate-x-2 group">
                  <span className="flex items-baseline gap-4">
                    <span className="font-condensed text-xs sm:text-sm tracking-[0.2em] opacity-60" style={{ color: "var(--accent)" }}>0{i + 1}.</span>
                    <span>{item.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="container-x py-4 border-t border-white/10 flex justify-between items-center text-xs text-stone-400 shrink-0">
            <span>&copy; {new Date().getFullYear()} Banky Hotel &amp; Suites</span>
            <span className="font-condensed uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>Four-Star Luxury Hotel &middot; Ado-Ekiti</span>
          </div>
        </div>
      )}
    </header>
  );
}
