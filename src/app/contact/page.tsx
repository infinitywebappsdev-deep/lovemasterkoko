"use client";
import Image from "next/image";
import { HOTEL, whatsappLink, bookingMessage } from "@/lib/hotel";
import { Mail, MapPin } from "lucide-react";
import { PhoneSolidIcon } from "@/components/icons/PhoneSolidIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export default function ContactPage() {
  return (
    <>
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 bg-[#1b1b1b] dark:bg-[#1a1a1d]">
        <Image
          src="/images/hotel-front-left.jpg"
          alt="Banky Hotel Exterior"
          fill
          priority
          referrerPolicy="no-referrer"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b1b1b]/90 dark:from-[#202023]/90 via-[#1b1b1b]/70 to-[#1b1b1b]" />
        <div className="container-x relative z-10 text-center">
          <span className="eyebrow text-[var(--accent)] block mb-3">Get in Touch</span>
          <h1 className="font-display font-normal text-4xl sm:text-5xl md:text-6xl text-white">Contact Us</h1>
        </div>
      </section>
      <section className="py-16 sm:py-24 bg-white dark:bg-[#202023]">
        <div className="container-x max-w-4xl">
          {/* Landscape Exterior Feature */}
          <div className="mb-12 overflow-hidden rounded-2xl border border-[#ece6dd] dark:border-[#2e2b26] shadow-md aspect-[16/10] sm:aspect-[21/9] relative bg-stone-200 dark:bg-stone-800">
            {/* Blurred placeholder background using CSS filter: blur(20px) while full image loads */}
            <div
              className="img-blur-bg absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-700"
              style={{
                backgroundImage: "url('/images/hotel-front-right.jpg')",
                filter: "blur(20px)",
                WebkitFilter: "blur(20px)",
                transform: "scale(1.15)",
              }}
              data-placeholder="blur"
              aria-hidden="true"
            />
            <Image
              src="/images/hotel-front-right.jpg"
              alt="Banky Hotel & Suites Entrance"
              fill
              sizes="(max-width: 768px) 100vw, 896px"
              referrerPolicy="no-referrer"
              className="relative z-10 object-cover transition-opacity duration-500"
              onLoad={(e) => {
                const sibling = e.currentTarget.previousElementSibling as HTMLElement | null;
                if (sibling) {
                  sibling.style.opacity = "0";
                  sibling.classList.add("is-loaded");
                }
              }}
            />
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-6">
              <div>
                <span className="text-[var(--accent)] text-xs font-condensed tracking-wider uppercase font-bold block mb-1">Visit Us In Person</span>
                <p className="text-white text-base sm:text-lg font-display">Ado-Ekiti, Ekiti State · Warmly Welcoming Guests Daily</p>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-2xl text-[#222] dark:text-[#f4efe6] mb-4">Reservations &amp; Inquiries</h2>
                <p className="text-sm text-[#666] dark:text-[#a8a29e] leading-relaxed">Available 24 hours daily for room reservations, dining bookings, and event hall inquiries.</p>
              </div>
              <div className="space-y-5">
                <a href={`tel:${HOTEL.phone}`} className="flex items-center gap-4 text-sm text-[#666] dark:text-[#a8a29e] hover:text-[var(--accent)] transition-colors">
                  <div className="h-12 w-12 rounded-full border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0"><PhoneSolidIcon className="h-5 w-5" /></div>
                  <div><span className="font-condensed uppercase text-xs text-[var(--accent)] font-semibold block mb-0.5">Phone</span>{HOTEL.phone}</div>
                </a>
                <a href={`mailto:${HOTEL.email}`} className="flex items-center gap-4 text-sm text-[#666] dark:text-[#a8a29e] hover:text-[var(--accent)] transition-colors">
                  <div className="h-12 w-12 rounded-full border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0"><Mail className="h-5 w-5" /></div>
                  <div><span className="font-condensed uppercase text-xs text-[var(--accent)] font-semibold block mb-0.5">Email</span><span className="break-all">{HOTEL.email}</span></div>
                </a>
                <div className="flex items-center gap-4 text-sm text-[#666] dark:text-[#a8a29e]">
                  <div className="h-12 w-12 rounded-full border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0"><MapPin className="h-5 w-5" /></div>
                  <div><span className="font-condensed uppercase text-xs text-[var(--accent)] font-semibold block mb-0.5">Address</span>{HOTEL.address}</div>
                </div>
              </div>
              <a href={whatsappLink(bookingMessage({}))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 text-xs font-condensed uppercase tracking-[0.16em] font-semibold hover:bg-[#20bd5a] transition-colors">
                <WhatsAppIcon className="h-4 w-4" />Chat on WhatsApp
              </a>
            </div>
            <div className="bg-[#f8f5f0] dark:bg-[#1c1a17] p-8 border border-[#ece6dd] dark:border-[#2e2b26]">
              <h3 className="font-display text-xl text-[#222] dark:text-[#f4efe6] mb-6">Send Us a Message</h3>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <input placeholder="Your Name" className="w-full border-b border-[#ece6dd] dark:border-[#2e2b26] py-2.5 text-sm bg-transparent outline-none placeholder:text-stone-400 text-[#222] dark:text-[#f4efe6]" />
                <input type="email" placeholder="Email Address" className="w-full border-b border-[#ece6dd] dark:border-[#2e2b26] py-2.5 text-sm bg-transparent outline-none placeholder:text-stone-400 text-[#222] dark:text-[#f4efe6]" />
                <input type="tel" placeholder="Phone Number" className="w-full border-b border-[#ece6dd] dark:border-[#2e2b26] py-2.5 text-sm bg-transparent outline-none placeholder:text-stone-400 text-[#222] dark:text-[#f4efe6]" />
                <textarea rows={4} placeholder="Your Message" className="w-full border-b border-[#ece6dd] dark:border-[#2e2b26] py-2.5 text-sm bg-transparent outline-none resize-none placeholder:text-stone-400 text-[#222] dark:text-[#f4efe6]" />
                <button type="submit" className="btn-gold w-full py-3.5 text-xs">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
