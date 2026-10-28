import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description:
    "Explore photos of Banky Hotel & Suites — rooms and suites, the lobby, fine dining restaurant, open-air garden bar and Banky Hall in Ado-Ekiti.",
  alternates: {
    canonical: "/gallery",
  },
  openGraph: {
    title: "Photo Gallery — Banky Hotel & Suites",
    description:
      "Rooms, dining, gardens and event spaces at Banky Hotel & Suites, Ado-Ekiti.",
    images: ["/images/Hotel Lobby.jpg"],
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
