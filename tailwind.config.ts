import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: "var(--accent)", light: "var(--accent-light)", soft: "var(--accent-surface)" },
        ivory: "#f8f5f0",
        midnight: "#1b1b1b",
        cream: "#f4eee6",
      },
      fontFamily: {
        display: ['var(--font-gilda)', "Georgia", "serif"],
        sans: ['var(--font-barlow)', "ui-sans-serif", "system-ui", "sans-serif"],
        condensed: ['var(--font-barlow-condensed)', 'var(--font-barlow)', "sans-serif"],
      },
      container: { center: true, padding: { DEFAULT: "1.25rem", sm: "2rem", lg: "2.5rem" } },
      animation: {
        rise: "rise 0.8s cubic-bezier(0.16,1,0.3,1) both",
        ticker: "ticker 36s linear infinite",
        "fade-in": "fadeIn 0.18s ease-out",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "none" } },
        ticker: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
    },
  },
  plugins: [],
};

export default config;
