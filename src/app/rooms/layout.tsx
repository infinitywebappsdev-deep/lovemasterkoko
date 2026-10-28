import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rooms & Suites",
  description:
    "Browse 28 rooms and suites at Banky Hotel & Suites in Ado-Ekiti — Standard, Deluxe, Executive, Super Executive and Luxury Suites from ₦30,000 per night. Book direct for the best rates.",
  alternates: {
    canonical: "/rooms",
  },
  openGraph: {
    title: "Rooms & Suites at Banky Hotel & Suites",
    description:
      "28 luxury rooms and suites in Ado-Ekiti, from ₦30,000 per night. Free Wi-Fi, daily housekeeping and 24-hour room service.",
    images: ["/images/Presidential.jpg"],
  },
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
