"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { HOTEL, whatsappLink, bookingMessage } from "@/lib/hotel";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { BankyLogo } from "@/components/common/BankyLogo";

const STAY = [
  { label: "Rooms & Suites", href: "/rooms" },
  { label: "Book a stay", href: "/booking" },
  { label: "Gallery", href: "/gallery" },
  { label: "FAQs", href: "/faqs" },
];

const HOTEL_LINKS = [
  { label: "The Restaurant", href: "/restaurant" },
  { label: "The Bar", href: "/bar" },
  { label: "Meetings & Events", href: "/events" },
  { label: "About us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/qr") || pathname?.startsWith("/admin")) return null;

  return (
    <footer className="surface-ink text-white">
      <div className="container-x py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <BankyLogo className="h-12 w-auto" variant="white" />
              <div>
                <p className="font-display text-xl leading-none text-white">Banky</p>
                <p className="mt-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/50">
                  Hotel &amp; Suites
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/60">
              Twenty-eight appointed rooms and suites, a kitchen rooted in Ekiti produce, an open-air
              bar and a 300-seat hall — five minutes from the heart of Ado-Ekiti.
            </p>
            <a
              id="footer-whatsapp-btn"
              href={whatsappLink(bookingMessage({}))}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-[#17140f]"
            >
              <WhatsAppIcon text="Chat with the front desk" iconClassName="h-4 w-4 shrink-0" />
            </a>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-4">
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/40">Your stay</p>
              <ul className="mt-5 space-y-3">
                {STAY.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/70 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/40">The hotel</p>
              <ul className="mt-5 space-y-3">
                {HOTEL_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/70 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3">
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/40">Reservations</p>
            <ul className="mt-5 space-y-4 text-sm text-white/70">
              {HOTEL.phones.map((phone) => (
                <li key={phone}>
                  <a href={`tel:${phone}`} className="flex items-start gap-2.5 transition-colors hover:text-white">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span>{phone}</span>
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${HOTEL.email}`} className="flex items-start gap-2.5 transition-colors hover:text-white">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                  <span className="break-all">{HOTEL.email}</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                <span className="leading-relaxed">{HOTEL.address}</span>
              </li>
            </ul>
            <p className="mt-6 text-[0.72rem] text-white/40">
              Check-in {HOTEL.checkIn} · Check-out {HOTEL.checkOut}
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[0.72rem] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Banky Hotel &amp; Suites. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link href="/faqs" className="transition-colors hover:text-white">Policies</Link>
            <Link href="/contact" className="transition-colors hover:text-white">Contact</Link>
            <Link href="/booking" className="inline-flex items-center gap-1 transition-colors hover:text-white">
              Book direct <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
