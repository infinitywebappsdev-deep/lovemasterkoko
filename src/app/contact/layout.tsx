import type { Metadata } from "next";
import { HOTEL } from "@/lib/hotel";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Call, email or WhatsApp Banky Hotel & Suites — ${HOTEL.address}. Reservations and inquiries are available 24 hours a day.`,
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Banky Hotel & Suites",
    description:
      "Phone, email, WhatsApp and directions to Banky Hotel & Suites in Ado-Ekiti, Ekiti State.",
    images: ["/images/hotel-front-left.jpg"],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
