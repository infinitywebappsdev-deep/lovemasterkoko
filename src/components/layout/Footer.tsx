"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HOTEL, whatsappLink, bookingMessage } from "@/lib/hotel";
import { Mail, MapPin } from "lucide-react";
import { PhoneSolidIcon } from "@/components/icons/PhoneSolidIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { BankyLogo } from "@/components/common/BankyLogo";

const LINKS = [
  { label: "Rooms & Suites", href: "/rooms" },
  { label: "The Restaurant", href: "/restaurant" },
  { label: "Lounge", href: "/bar" },
  { label: "Meetings & Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Reservations", href: "/booking" },
  { label: "FAQs", href: "/faqs" },
];

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/qr") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-[#0a2777] dark:bg-[#18181b] text-white border-t border-transparent dark:border-[#3a3a42]" style={{ borderColor: "color-mix(in srgb, #0000dd 20%, transparent)" }}>
      <div className="container-x py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4 space-y-5">
            <div className="flex items-center gap-3.5">
              <span className="shrink-0 flex items-center justify-center bg-transparent p-0">
                <BankyLogo
                  className="w-[82px] sm:w-[96px] h-auto"
                  variant="white"
                />
              </span>
              <div>
                <span className="font-display text-2xl text-white block leading-tight font-normal uppercase tracking-wider">BANKY</span>
                <span className="font-condensed text-[0.65rem] tracking-[0.25em] uppercase font-medium" style={{ color: "var(--accent-light)" }}>Hotel &amp; Suites</span>
              </div>
            </div>
            <p className="text-sm text-stone-200 font-normal leading-relaxed max-w-sm">
              A sanctuary of calm in Ekiti State. Twenty-eight appointed rooms and suites, authentic culinary artistry, and gracious hospitality.
            </p>
            <a
              id="footer-whatsapp-btn"
              href={whatsappLink(bookingMessage({}))}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white transition-all font-condensed tracking-[0.16em] uppercase text-xs py-3 px-6 rounded-full font-medium shadow-md active:scale-95"
            >
              <WhatsAppIcon text="Chat on WhatsApp" iconClassName="h-4 w-4 shrink-0" />
            </a>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-4">
            <h4 className="font-condensed text-xs uppercase tracking-[0.25em] font-medium mb-6" style={{ color: "var(--accent-light)" }}>Quick Links</h4>
            <div className="grid grid-cols-2 gap-3">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="text-sm text-stone-200 hover:text-white font-normal transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4 space-y-5">
            <h4 className="font-condensed text-xs uppercase tracking-[0.25em] font-medium mb-6" style={{ color: "var(--accent-light)" }}>Contact</h4>
            <div className="space-y-4">
              <a href={`tel:${HOTEL.phone}`} className="flex items-start gap-3 text-sm text-stone-200 hover:text-white font-normal transition-colors">
                <PhoneSolidIcon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--accent-light)" }} />
                <span>{HOTEL.phone}</span>
              </a>
              <a href={`mailto:${HOTEL.email}`} className="flex items-start gap-3 text-sm text-stone-200 hover:text-white font-normal transition-colors">
                <Mail className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--accent-light)" }} />
                <span className="break-all">{HOTEL.email}</span>
              </a>
              <div className="flex items-start gap-3 text-sm text-stone-200 font-normal">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--accent-light)" }} />
                <span>{HOTEL.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
        <div className="container-x flex flex-col sm:flex-row items-center justify-between text-xs text-stone-300 font-normal gap-2">
          <span>© {new Date().getFullYear()} Banky Hotel &amp; Suites. All Rights Reserved.</span>
          <span className="font-condensed uppercase tracking-[0.2em] font-medium" style={{ color: "var(--accent-light)" }}>Four-Star Luxury Hotel &middot; Ado-Ekiti</span>
        </div>
      </div>
    </footer>
  );
}
