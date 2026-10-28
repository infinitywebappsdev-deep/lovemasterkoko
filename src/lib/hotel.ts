export const HOTEL = {
  name: "Banky Hotel & Suites",
  tagline: "Quiet Luxury in the Heart of Ado-Ekiti",
  address: "Km 5 NDLEA Junction Ado-Iworoko Road, Adebayo, Ado-Ekiti, Ekiti State, Nigeria",
  phone: "+2349035879708",
  whatsapp: "2349035879708",
  email: "reservations@bankyhotelandsuites.com",
  website: "https://bankyhotelandsuites.com",
  checkIn: "2:00 PM",
  checkOut: "12:00 PM",
};

export type Room = {
  slug: string;
  name: string;
  rate: number;
  qty: number;
  /** CMS switch: "disabled" rooms are hidden from the public site and
   *  filtered out of the booking engine (which queries status == "active"). */
  status?: "active" | "disabled";
  occupancy?: string;
  bed?: string;
  image: string;
  images?: string[];
  video?: string;
  blurb: string;
  features: string[];
};

export const ROOMS: Room[] = [
  { slug: "luxury-suite", name: "Luxury Suite", rate: 200000, qty: 1, image: "/images/signature suite room.jpg", video: "/videos/luxury-suite-room.mp4", blurb: "Our premier luxury residence: a sunlit master living parlor, private dressing area, and an opulent master suite framed by full-height windows.", features: ["Private living room", "Butler service", "Complimentary breakfast", "VIP airport transfer"] },
  { slug: "luxury", name: "Luxury", rate: 100000, qty: 3, image: "/images/Presidential.jpg", images: ["/images/Presidential.jpg", "/images/presidential 17.jpg", "/images/presidential23.jpg", "/images/presidential3.jpg"], video: "/videos/luxury-room.mp4", blurb: "A stately luxury residence featuring an executive parlor, marble-finished bathroom, and expansive entertaining lounge suited for visiting dignitaries and VIPs.", features: ["Executive parlor", "VIP lounge access", "Complimentary breakfast", "Late checkout"] },
  { slug: "super-executive", name: "Super Executive", rate: 60000, qty: 1, image: "/images/superexecutive.jpg", images: ["/images/superexecutive.jpg", "/images/super executive1.jpg", "/images/super executive 2.jpg"], video: "/videos/super-executive-room.mp4", blurb: "An expansive, peaceful haven featuring a private reading corner, plush appointments, and soft natural daylight throughout the day.", features: ["Reading corner", "Smart TV", "Daily housekeeping", "Courtyard view"] },
  { slug: "executive", name: "Executive", rate: 50000, qty: 8, image: "/images/EXECUTIVE Main.jpeg", images: ["/images/EXECUTIVE Main.jpeg", "/images/EXECUTIVE MAIN2.jpeg"], video: "/videos/executive-room.mp4", blurb: "Rich warm timber, crisp Egyptian cotton linen, and an ergonomic workstation tailored for restful and productive executive stays.", features: ["Work desk", "Rain shower", "Complimentary Wi-Fi", "Daily housekeeping"] },
  { slug: "standard-plus", name: "Standard Plus", rate: 45000, qty: 4, image: "/images/Standard PLUS.jpeg", images: ["/images/Standard PLUS.jpeg", "/images/STANDARD PLUS MAIN .jpeg"], video: "/videos/standard-plus-room.mp4", blurb: "An elevated retreat offering an extended lounge seating area, comfortable dedicated workspace, and serene courtyard views.", features: ["Seating area", "Smart TV", "Air conditioning", "Complimentary Wi-Fi"] },
  { slug: "deluxe", name: "Deluxe", rate: 40000, qty: 5, image: "/images/DELUXE MAIN1.jpeg", images: ["/images/DELUXE MAIN1.jpeg", "/images/DELUXE MAIN2.jpeg"], video: "/videos/deluxe-room.mp4", blurb: "Understated luxury with modern ambient ceiling lighting, executive comfort, flat-screen entertainment, and a soothing warm palette.", features: ["Smart TV", "Mood lighting", "Air conditioning", "Work desk", "24-hour room service"] },
  { slug: "studio", name: "Studio", rate: 35000, qty: 1, image: "/images/Suite1.jpg", video: "/videos/studio-room.mp4", blurb: "A versatile open-plan studio residence designed for extended city stays, complete with an integrated kitchenette and cozy dining nook.", features: ["Open plan", "Kitchenette", "Work nook", "Laundry service"] },
  { slug: "standard", name: "Standard", rate: 30000, qty: 5, image: "/images/Standard room.jpg", images: ["/images/Standard room.jpg", "/images/standard.jpg"], video: "/videos/standard-room.mp4", blurb: "A welcoming, quiet sanctuary featuring refined contemporary essentials, whisper-quiet climate control, and dedicated service.", features: ["Smart TV", "Air conditioning", "Complimentary Wi-Fi", "En-suite bathroom"] },
];

export const naira = (v: number) => `₦${v.toLocaleString("en-NG")}`;

export function whatsappLink(msg: string) {
  return `https://wa.me/${HOTEL.whatsapp}?text=${encodeURIComponent(msg)}`;
}

export function bookingMessage(o: { room?: string; name?: string; checkIn?: string; checkOut?: string; guests?: string | number; rate?: number }) {
  return [
    `Hello ${HOTEL.name}, I would like to make a reservation.`,
    o.name ? `Name: ${o.name}` : null,
    o.room ? `Room: ${o.room}` : null,
    o.checkIn ? `Check-in: ${o.checkIn}` : null,
    o.checkOut ? `Check-out: ${o.checkOut}` : null,
    o.guests ? `Guests: ${o.guests}` : null,
    o.rate ? `Rate: ${naira(o.rate)} per night` : null,
  ].filter(Boolean).join("\n");
}

export function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
  return d > 0 ? Math.round(d) : 0;
}

