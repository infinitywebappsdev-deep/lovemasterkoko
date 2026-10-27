"use client";
import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { whatsappLink, bookingMessage } from "@/lib/hotel";

export function WhatsAppFab() {
  const pathname = usePathname();

  if (pathname?.startsWith("/qr") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <a
      id="whatsapp-fab-btn"
      href={whatsappLink(bookingMessage({}))}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20bd5a] text-white h-14 w-14 rounded-full flex items-center justify-center shadow-xl shadow-[#25D366]/30 dark:shadow-[#25D366]/20 transition-all hover:scale-110"
      aria-label="Chat on WhatsApp"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
