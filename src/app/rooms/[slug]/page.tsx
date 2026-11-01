"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BedDouble,
  Check,
  ChevronRight,
  Clock,
  Maximize,
  Pause,
  Play,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { HOTEL, naira, whatsappLink, bookingMessage, type Room } from "@/lib/hotel";
import { ROOMS } from "@/lib/hotel";
import { subscribeRooms } from "@/lib/rooms-data";
import { RoomSchema } from "@/components/seo/StructuredData";

function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function RoomDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  useEffect(
    () =>
      subscribeRooms((live) => {
        if (live.length) setRooms(live);
      }),
    [],
  );

  const found = useMemo(
    () =>
      rooms.find(
        (r) =>
          r.slug === slug ||
          (slug === "signature-suite" && r.slug === "luxury-suite") ||
          (slug === "presidential-suite" && r.slug === "luxury"),
      ) || null,
    [rooms, slug],
  );

  const room = found ?? rooms[0];
  const disabled = !!found && found.status === "disabled";

  const images = room ? (room.images?.length ? room.images : [room.image]) : [];
  const [activeImage, setActiveImage] = useState(0);
  useEffect(() => setActiveImage(0), [slug]);

  // Dates for the sticky booking card
  const today = useMemo(todayISO, []);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDaysISO(today, 2));
  const [adults, setAdults] = useState(2);

  const nights = useMemo(() => {
    const a = new Date(`${checkIn}T12:00:00`).getTime();
    const b = new Date(`${checkOut}T12:00:00`).getTime();
    const n = Math.round((b - a) / 86_400_000);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [checkIn, checkOut]);

  const bookingHref = room
    ? `/booking?checkIn=${checkIn}&checkOut=${nights ? checkOut : addDaysISO(checkIn, 1)}&adults=${adults}&children=0&rooms=1&autosearch=true`
    : "/booking";

  // Room tour video
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(true);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setVideoPlaying(true)).catch(() => {});
    else {
      v.pause();
      setVideoPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setVideoMuted(v.muted);
  };

  if (!room) return null;

  if (disabled) {
    return (
      <section className="container-x flex min-h-[70vh] flex-col items-center justify-center py-32 text-center">
        <p className="eyebrow">Not currently bookable</p>
        <h1 className="display-lg mt-4 max-w-xl">This room is off sale for now</h1>
        <p className="lede mt-4 max-w-md">
          The category is being refurbished. The front desk can place you in the closest available room
          at the same rate.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/rooms" className="btn-gold">Browse other rooms</Link>
          <a href={whatsappLink(bookingMessage({ room: room.name }))} target="_blank" rel="noreferrer" className="btn-outline">
            Ask the front desk
          </a>
        </div>
      </section>
    );
  }

  const others = rooms.filter((r) => r.slug !== room.slug && r.status !== "disabled").slice(0, 3);
  const videoSrc = room.video || `/videos/${room.slug}-room.mp4`;

  return (
    <>
      <RoomSchema slug={room.slug} />

      <section className="container-x pt-24 sm:pt-32">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <Link href="/" className="transition-colors hover:text-[var(--text-primary)]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/rooms" className="transition-colors hover:text-[var(--text-primary)]">Rooms</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--text-primary)]">{room.name}</span>
        </nav>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="display-lg">{room.name}</h1>
            <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
              {room.blurb}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-[1.9rem] leading-none">{naira(room.rate)}</p>
            <p className="mt-1 text-[0.64rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              per night · taxes included at checkout
            </p>
          </div>
        </div>
      </section>

      {/* Gallery + booking card */}
      <section className="container-x mt-8 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-8">
          <div className="relative aspect-[16/11] overflow-hidden rounded-2xl bg-[var(--surface-alt)]">
            <Image
              src={images[activeImage] || room.image}
              alt={`${room.name} — photo ${activeImage + 1}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                    i === activeImage ? "border-[var(--accent)]" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={src} alt="" fill sizes="112px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Booking card */}
        <div className="lg:col-span-4">
          <div className="card sticky top-24 p-6">
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.22em] text-[var(--accent)]">
              Reserve this room
            </p>
            <p className="mt-3 font-display text-[1.8rem] leading-none">
              {naira(room.rate)}
              <span className="ml-1.5 font-sans text-[0.7rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                / night
              </span>
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="field-label">Check in</span>
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCheckIn(next);
                    if (next && (!checkOut || checkOut <= next)) setCheckOut(addDaysISO(next, 1));
                  }}
                  className="field"
                />
              </label>
              <label className="block">
                <span className="field-label">Check out</span>
                <input
                  type="date"
                  value={checkOut}
                  min={addDaysISO(checkIn, 1)}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="field"
                />
              </label>
              <label className="col-span-2 block">
                <span className="field-label">Guests</span>
                <select
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="field"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} adult{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4 text-[0.82rem]">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>
                  {naira(room.rate)} × {nights || 1} night{(nights || 1) > 1 ? "s" : ""}
                </span>
                <span>{naira(room.rate * (nights || 1))}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Taxes &amp; service</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-[var(--border)] pt-3 text-[var(--text-primary)]">
                <span className="text-[0.72rem] uppercase tracking-[0.14em]">Estimated total</span>
                <span className="font-display text-xl leading-none">{naira(room.rate * (nights || 1))}</span>
              </div>
            </div>

            <Link href={bookingHref} className="btn-gold mt-5 w-full">
              Check availability
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappLink(
                bookingMessage({ room: room.name, checkIn, checkOut, guests: adults, rate: room.rate }),
              )}
              target="_blank"
              rel="noreferrer"
              className="btn-outline mt-2.5 w-full"
            >
              Reserve on WhatsApp
            </a>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[0.68rem] text-[var(--text-muted)]">
              <Clock className="h-3 w-3" />
              Check-in {HOTEL.checkIn} · Check-out {HOTEL.checkOut}
            </p>
          </div>
        </div>
      </section>

      {/* Detail */}
      <section className="container-x mt-16 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <h2 className="display-md">The room</h2>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">{room.blurb}</p>
          <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--text-muted)]">
            Every category includes fibre Wi-Fi, 24-hour power, daily housekeeping and room service.
            Cots, extra beds and early check-in are arranged by the front desk on request.
          </p>

          {videoSrc && (
            <div className="relative mt-8 overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                src={videoSrc}
                poster={room.image}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                onPlaying={() => setVideoPlaying(true)}
                className="aspect-video w-full object-cover"
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={videoPlaying ? "Pause room tour" : "Play room tour"}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md"
                >
                  {videoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={videoMuted ? "Unmute room tour" : "Mute room tour"}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md"
                >
                  {videoMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Users, k: "Sleeps", v: room.occupancy || "2 guests" },
              { icon: BedDouble, k: "Bed", v: room.bed || "King" },
              { icon: Maximize, k: "View", v: "Courtyard" },
            ].map(({ icon: Icon, k, v }) => (
              <div key={k} className="card-flat p-4">
                <Icon className="h-4 w-4 text-[var(--accent)]" />
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">{k}</p>
                <p className="mt-1 text-[0.82rem] font-medium leading-tight">{v}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-8 text-[0.66rem] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            In this room
          </h3>
          <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              ...(room.features || []),
              "Fibre Wi-Fi",
              "Air conditioning",
              "Daily housekeeping",
              "24-hour power",
            ]
              .filter((f, i, arr) => arr.indexOf(f) === i)
              .map((f) => (
                <li key={f} className="flex items-start gap-2 text-[0.85rem] text-[var(--text-secondary)]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                  {f}
                </li>
              ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="mt-3 font-display text-lg leading-tight">Booking direct is cheaper</h3>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
              No platform commission is added here, and cancellations are handled by the same team that
              checks you in.
            </p>
          </div>
        </aside>
      </section>

      {/* Other rooms */}
      <section className="container-x mt-20 border-t border-[var(--border)] pt-14">
        <div className="flex items-end justify-between gap-6">
          <h2 className="display-md">Other rooms</h2>
          <Link href="/rooms" className="btn-quiet">
            All rooms <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {others.map((r) => (
            <Link key={r.slug} href={`/rooms/${r.slug}`} className="group card card-hover overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-alt)]">
                <Image
                  src={r.image}
                  alt={r.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex items-center justify-between p-5">
                <div>
                  <h3 className="font-display text-lg leading-tight">{r.name}</h3>
                  <p className="mt-1 text-[0.7rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    {naira(r.rate)} / night
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--accent)] transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
