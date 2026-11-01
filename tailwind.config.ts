import type { Config } from "tailwindcss";

/**
 * Design tokens mirror the CSS variables in globals.css so utility classes and
 * hand-written component classes stay in sync. Anything theme-driven (accent,
 * paper, ink) reads the variable; the fixed ramps below are for illustrative
 * work such as illustrations and charts.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
          dark: "var(--accent-dark)",
          soft: "var(--accent-surface)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
          dark: "var(--accent-dark)",
          surface: "var(--accent-surface)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          soft: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        paper: "var(--paper)",
        surface: { DEFAULT: "var(--surface)", alt: "var(--surface-alt)" },
        line: { DEFAULT: "var(--border)", strong: "var(--border-strong)" },
        forest: { DEFAULT: "#123f33", deep: "#0b2c24", light: "#1e5a48" },
        copper: { DEFAULT: "#b06a3b", light: "#c9834f", deep: "#8d5229" },
        sand: { DEFAULT: "#efe8db", deep: "#e3d9c8" },
        ivory: "#faf8f4",
        midnight: "#17140f",
        cream: "#f4efe7",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        condensed: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: { site: "1240px" },
      container: { center: true, padding: { DEFAULT: "1.25rem", sm: "2rem", lg: "2.5rem" } },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem", "3xl": "1.5rem" },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
      },
      animation: {
        rise: "rise 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn 0.2s ease-out both",
        sheet: "sheetUp 0.24s cubic-bezier(0.16,1,0.3,1) both",
        ticker: "ticker 40s linear infinite",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(18px)" }, to: { opacity: "1", transform: "none" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        sheetUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
        ticker: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
    },
  },
  plugins: [],
};

export default config;
