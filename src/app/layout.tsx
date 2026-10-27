import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Gilda_Display } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ColorSchemeToggle } from "@/components/layout/ColorSchemeToggle";
import { ThemeProvider } from "@/lib/ThemeContext";
import { ColorSchemeProvider } from "@/lib/ColorSchemeContext";
import { HotelSchema } from "@/components/seo/StructuredData";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-barlow-condensed",
});

const gildaDisplay = Gilda_Display({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-gilda",
});

const SITE_URL = "https://bankyhotelandsuites.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Banky Hotel & Suites — Luxury Hotel in Ado-Ekiti",
    template: "%s | Banky Hotel & Suites",
  },
  description:
    "Banky Hotel & Suites is a four-star luxury hotel in Ado-Ekiti with 28 rooms and suites, fine dining, an open-air bar and Banky Hall for weddings and conferences.",
  keywords: [
    "hotel in Ado-Ekiti",
    "luxury hotel Ekiti",
    "Banky Hotel",
    "hotel booking Ado-Ekiti",
    "event hall Ado-Ekiti",
    "Banky Hall",
    "conference hall Ekiti",
    "wedding venue Ado-Ekiti",
    "hotel reservation Nigeria",
    "boutique hotel Ekiti State",
  ],
  authors: [{ name: "Banky Hotel & Suites" }],
  creator: "Banky Hotel & Suites",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: "Banky Hotel & Suites",
    title: "Banky Hotel & Suites — Luxury Hotel in Ado-Ekiti",
    description:
      "A four-star luxury hotel with 28 rooms, fine dining, an open-air garden bar, and a 300-seat event hall in Ado-Ekiti, Ekiti State.",
    images: [
      { url: "/images/hero.jpg", width: 1920, height: 1080, alt: "Banky Hotel & Suites exterior" },
      { url: "/images/Hotel Lobby.jpg", width: 1920, height: 1080, alt: "Banky Hotel lobby" },
      { url: "/images/OpenBar Garden 2.jpg", width: 1920, height: 1080, alt: "Open-air garden bar" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Banky Hotel & Suites — Luxury Hotel in Ado-Ekiti",
    description:
      "28 luxury rooms, fine dining, open-air bar, and a 300-seat event hall. Book direct for the best rates.",
    images: ["/images/hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${barlow.variable} ${barlowCondensed.variable} ${gildaDisplay.variable}`}>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        {/* Prevent FOUC: apply dark class based on Lagos, Nigeria WAT schedule (07:00am-06:59pm Light, 07:00pm-06:59am Dark) */}
        <script src="/theme-init.js" defer />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-white dark:bg-[#202023] text-[#222] dark:text-[#f4efe6]">
        <ThemeProvider>
          <ColorSchemeProvider>
            <HotelSchema />
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <WhatsAppFab />
            <ThemeToggle />
            <ColorSchemeToggle />
          </ColorSchemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
