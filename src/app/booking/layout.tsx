import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Room",
  description:
    "Reserve your stay at Banky Hotel & Suites, Ado-Ekiti. Check availability across 28 rooms and suites, see live rates, and pay securely online with Paystack or bank transfer.",
  alternates: {
    canonical: "/booking",
  },
  openGraph: {
    title: "Book a Room — Banky Hotel & Suites",
    description:
      "Check availability and book rooms and suites at Banky Hotel & Suites, Ado-Ekiti. Secure Paystack checkout and instant confirmation.",
    images: ["/images/hero.jpg"],
  },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
