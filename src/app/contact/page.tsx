"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Mail, MapPin, Phone } from "lucide-react";
import { HOTEL, whatsappLink, bookingMessage } from "@/lib/hotel";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      setError("Please add your name and a message so we can reply to you.");
      return;
    }
    setError(null);
    const text = [
      `Hello ${HOTEL.name},`,
      "",
      form.message.trim(),
      "",
      `Name: ${form.name.trim()}`,
      form.email.trim() ? `Email: ${form.email.trim()}` : null,
      form.phone.trim() ? `Phone: ${form.phone.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
    setSent(true);
  };

  return (
    <>
      <section className="container-x pb-8 pt-28 sm:pt-36">
        <nav className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <Link href="/" className="transition-colors hover:text-[var(--text-primary)]">Home</Link>
          <span>/</span>
          <span className="text-[var(--text-primary)]">Contact</span>
        </nav>
        <div className="mt-6 max-w-2xl">
          <p className="text-[0.66rem] font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
            Front desk, 24 hours
          </p>
          <h1 className="display-lg mt-3">Talk to the house</h1>
          <p className="lede mt-4">
            Reservations, dining bookings and event enquiries are answered around the clock. WhatsApp is
            usually the fastest route.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-10 pb-16 pt-6 lg:grid-cols-12 lg:gap-14">
        {/* Details */}
        <div className="lg:col-span-5">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--surface-alt)]">
            <Image
              src="/images/hotel-front-right.jpg"
              alt="Banky Hotel & Suites entrance"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
          </div>

          <ul className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {HOTEL.phones.map((phone) => (
              <li key={phone}>
                <a href={`tel:${phone}`} className="flex items-center gap-4 py-4 transition-colors hover:text-[var(--accent)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)]">
                    <Phone className="h-4 w-4 text-[var(--accent)]" />
                  </span>
                  <span>
                    <span className="block text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">Phone</span>
                    <span className="text-[0.92rem]">{phone}</span>
                  </span>
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${HOTEL.email}`} className="flex items-center gap-4 py-4 transition-colors hover:text-[var(--accent)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)]">
                  <Mail className="h-4 w-4 text-[var(--accent)]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">Email</span>
                  <span className="break-all text-[0.92rem]">{HOTEL.email}</span>
                </span>
              </a>
            </li>
            <li className="flex items-start gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)]">
                <MapPin className="h-4 w-4 text-[var(--accent)]" />
              </span>
              <span>
                <span className="block text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">Address</span>
                <span className="text-[0.92rem] leading-relaxed">{HOTEL.address}</span>
              </span>
            </li>
            <li className="flex items-start gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)]">
                <Clock className="h-4 w-4 text-[var(--accent)]" />
              </span>
              <span>
                <span className="block text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">Arrival</span>
                <span className="text-[0.92rem]">Check-in {HOTEL.checkIn} · Check-out {HOTEL.checkOut}</span>
              </span>
            </li>
          </ul>

          <a
            href={whatsappLink(bookingMessage({}))}
            target="_blank"
            rel="noreferrer"
            className="btn-brand mt-6 w-full"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Chat with the front desk
          </a>
        </div>

        {/* Form */}
        <div className="lg:col-span-7">
          <div className="card p-6 sm:p-8">
            <h2 className="font-display text-2xl">Send a message</h2>
            <p className="mt-2 text-[0.84rem] leading-relaxed text-[var(--text-muted)]">
              It opens WhatsApp with your note already written — the team replies within minutes.
            </p>

            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <label className="block sm:col-span-2">
                <span className="field-label">Your name *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="field"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
              <label className="block">
                <span className="field-label">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="field"
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </label>
              <label className="block">
                <span className="field-label">Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="field"
                  placeholder="+234…"
                  autoComplete="tel"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="field-label">Message *</span>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="field resize-none"
                  placeholder="Tell us what you need — a room, a table, or the hall."
                />
              </label>

              {error && (
                <p role="alert" className="flex items-center gap-2 text-[0.78rem] text-red-600 sm:col-span-2 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" /> {error}
                </p>
              )}
              {sent && (
                <p role="status" className="flex items-center gap-2 text-[0.78rem] text-emerald-700 sm:col-span-2 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  WhatsApp is open with your message — press send there and we will reply right away.
                </p>
              )}

              <div className="sm:col-span-2">
                <button type="submit" className="btn-gold w-full sm:w-auto">
                  Send message
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/booking" className="card-flat flex items-center justify-between p-5 transition-colors hover:border-[var(--border-strong)]">
              <span>
                <span className="block text-[0.9rem] font-medium">Reserve a room</span>
                <span className="mt-0.5 block text-[0.76rem] text-[var(--text-muted)]">Live availability</span>
              </span>
              <span className="text-[var(--accent)]">→</span>
            </Link>
            <Link href="/events" className="card-flat flex items-center justify-between p-5 transition-colors hover:border-[var(--border-strong)]">
              <span>
                <span className="block text-[0.9rem] font-medium">Book Banky Hall</span>
                <span className="mt-0.5 block text-[0.76rem] text-[var(--text-muted)]">300 seated guests</span>
              </span>
              <span className="text-[var(--accent)]">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
