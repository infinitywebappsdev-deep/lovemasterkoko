"use client";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const pathname = usePathname();
  const { theme, toggleTheme, watTimeString } = useTheme();

  if (pathname?.startsWith("/qr") || pathname?.startsWith("/admin")) {
    return null;
  }

  const titleText = theme === "light"
    ? "Switch to night mode"
    : "Switch to day mode";

  return (
    <button
      suppressHydrationWarning
      id="theme-mode-toggle-btn"
      onClick={toggleTheme}
      aria-label={titleText}
      title={titleText}
      className="hidden lg:flex fixed bottom-6 left-24 z-40 h-14 w-14 rounded-full border border-[#ece6dd] dark:border-[#3a3a42] bg-white dark:bg-[#28282d] text-[#ffbf00] items-center justify-center shadow-xl hover:scale-110 transition-all duration-300 hover:shadow-2xl hover:border-[#ffbf00]"
    >
      <span suppressHydrationWarning className="inline-flex">
        {theme === "light" ? (
          <Moon className="h-6 w-6" />
        ) : (
          <Sun className="h-6 w-6" />
        )}
      </span>
    </button>
  );
}
