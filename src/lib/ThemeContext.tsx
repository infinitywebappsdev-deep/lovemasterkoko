"use client";
import { createContext, useContext, useEffect, useState, useCallback, useTransition } from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  resetToAuto: () => void;
  isAuto: boolean;
  watTimeString: string;
  isLightSchedule: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  resetToAuto: () => {},
  isAuto: true,
  watTimeString: "",
  isLightSchedule: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Calculates current time in West Africa Time (WAT = UTC+1, Lagos, Nigeria).
 * Light Mode: 07:00 AM to 06:59 PM WAT (minutes 420 to 1139)
 * Dark Mode:  07:00 PM to 06:59 AM WAT (minutes 1140 to 419)
 *
 * This schedule strictly overrides phone, tablet, and laptop OS dark/light settings.
 */
export function getLagosWATTheme(): {
  theme: Theme;
  watHour: number;
  watMin: number;
  isLightSchedule: boolean;
  watTimeString: string;
} {
  const now = new Date();
  // West Africa Time (WAT) is UTC+1 with no Daylight Saving Time
  const watHour = (now.getUTCHours() + 1) % 24;
  const watMin = now.getUTCMinutes();
  const minutesSinceMidnight = watHour * 60 + watMin;

  // 07:00 AM = 7 * 60 = 420 minutes
  // 07:00 PM = 19 * 60 = 1140 minutes
  // Light mode between 07:00 am and 06:59 pm (inclusive, i.e., < 1140)
  // Dark mode between 07:00 pm and 06:59 am (inclusive, i.e., < 420 || >= 1140)
  const isLightSchedule = minutesSinceMidnight >= 420 && minutesSinceMidnight < 1140;
  const theme: Theme = isLightSchedule ? "light" : "dark";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const period = watHour >= 12 ? "PM" : "AM";
  const displayHour = watHour % 12 === 0 ? 12 : watHour % 12;
  const watTimeString = `${displayHour}:${pad(watMin)} ${period} WAT`;

  return { theme, watHour, watMin, isLightSchedule, watTimeString };
}

/**
 * Returns milliseconds until the next scheduled mode change (07:00 AM or 07:00 PM WAT).
 */
function getMsUntilNextTransition(): number {
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24;
  const watMin = now.getUTCMinutes();
  const watSec = now.getUTCSeconds();
  const watMs = now.getUTCMilliseconds();

  const currentSeconds = watHour * 3600 + watMin * 60 + watSec;

  const target7AM = 7 * 3600;   // 07:00:00
  const target7PM = 19 * 3600;  // 19:00:00

  let secondsUntil = 0;
  if (currentSeconds < target7AM) {
    secondsUntil = target7AM - currentSeconds;
  } else if (currentSeconds < target7PM) {
    secondsUntil = target7PM - currentSeconds;
  } else {
    // Until tomorrow 7 AM
    secondsUntil = (24 * 3600 - currentSeconds) + target7AM;
  }

  return Math.max(1000, secondsUntil * 1000 - watMs);
}

const MANUAL_OVERRIDE_KEY = "banky-theme-manual";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [isAuto, setIsAuto] = useState(true);
  const [watInfo, setWatInfo] = useState<{ watTimeString: string; isLightSchedule: boolean }>({
    watTimeString: "",
    isLightSchedule: true,
  });
  const [mounted, setMounted] = useState(false);

  // Synchronize with Lagos WAT time
  const applyScheduledTheme = useCallback((allowOverride = true) => {
    const wat = getLagosWATTheme();
    setWatInfo({
      watTimeString: wat.watTimeString,
      isLightSchedule: wat.isLightSchedule,
    });

    let effectiveTheme = wat.theme;
    let manualActive = false;

    if (allowOverride && typeof window !== "undefined") {
      try {
        const manual = sessionStorage.getItem(MANUAL_OVERRIDE_KEY);
        if (manual === "light" || manual === "dark") {
          effectiveTheme = manual;
          manualActive = true;
        }
      } catch {}
    }

    setTheme(effectiveTheme);
    setIsAuto(!manualActive);

    // Apply class directly to <html> element to guarantee instant update
    if (typeof document !== "undefined") {
      if (effectiveTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  useEffect(() => {
    // Clean up any legacy persistent theme that might permanently conflict with WAT schedule
    try {
      localStorage.removeItem("banky-theme");
    } catch {}

    // Initialize theme based on Lagos WAT
    applyScheduledTheme(true);
    setMounted(true);

    // Set precise timer to switch automatically at exact 07:00 AM or 07:00 PM WAT
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const scheduleNextTransition = () => {
      const ms = getMsUntilNextTransition();
      timerId = setTimeout(() => {
        // When schedule boundary arrives, clear manual override so schedule automatically kicks in
        try {
          sessionStorage.removeItem(MANUAL_OVERRIDE_KEY);
        } catch {}
        applyScheduledTheme(false);
        scheduleNextTransition();
      }, ms);
    };
    scheduleNextTransition();

    // Fallback interval (every 20 seconds) to ensure time stays strictly in sync
    const interval = setInterval(() => {
      applyScheduledTheme(true);
    }, 20 * 1000);

    // Handle tab visibility / device wake up
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        applyScheduledTheme(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      if (timerId) clearTimeout(timerId);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [applyScheduledTheme]);

  // Synchronize DOM whenever theme changes
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        sessionStorage.setItem(MANUAL_OVERRIDE_KEY, next);
      } catch {}
      setIsAuto(false);
      return next;
    });
  }, []);

  const resetToAuto = useCallback(() => {
    try {
      sessionStorage.removeItem(MANUAL_OVERRIDE_KEY);
    } catch {}
    applyScheduledTheme(false);
  }, [applyScheduledTheme]);

  // Render provider immediately to prevent hydration mismatch
  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        resetToAuto,
        isAuto,
        watTimeString: watInfo.watTimeString,
        isLightSchedule: watInfo.isLightSchedule,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
