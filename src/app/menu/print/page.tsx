import type { Metadata } from "next";
import { MenuQrPrint } from "@/components/menu/MenuQrPrint";

export const metadata: Metadata = {
  title: "Print Menu QR Card",
  description: "Printable QR code card for the Banky Hotel & Suites menu.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MenuPrintPage() {
  return <MenuQrPrint />;
}
