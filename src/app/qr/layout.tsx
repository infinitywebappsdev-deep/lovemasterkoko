import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "In-Room & Table Dining Menu | Banky Hotel & Suites",
  description: "Private in-house dining menu for room service and restaurant tables.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
};

export default function QrLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121110] text-[#f4efe6] antialiased selection:bg-[#ffbf00] selection:text-black font-sans">
      {children}
    </div>
  );
}
