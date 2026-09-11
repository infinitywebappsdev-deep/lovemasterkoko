/**
 * Seed script — provisions the hotel's real inventory into Firestore.
 * Run: npx tsx scripts/seed-booking.ts
 *
 * Uses FIREBASE_SERVICE_ACCOUNT_JSON from the environment (set via
 * Settings → Environment). Idempotent: re-running updates, not duplicates.
 */
import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfigData from "../firebase-applet-config.json";

type RoomTypeSeed = {
  slug: string;
  name: string;
  qty: number;
  baseRate: number;
  maxOccupancy: number;
  bed: string;
  image: string;
  blurb: string;
  features: string[];
};

const ROOM_TYPES: RoomTypeSeed[] = [
  { slug: "signature-suite", name: "Signature Suite", qty: 1, baseRate: 20000000, maxOccupancy: 3, bed: "King Canopy Bed", image: "/images/signature suite room.jpg", blurb: "Our premier signature residence: a sunlit master living parlor, private dressing area, and an opulent king canopy bedroom framed by full-height windows.", features: ["Private living room", "Butler service", "Complimentary breakfast", "VIP airport transfer"] },
  { slug: "presidential-suite", name: "Presidential Suite", qty: 3, baseRate: 10000000, maxOccupancy: 3, bed: "King Canopy Bed", image: "/images/presidential 17.jpg", blurb: "A stately presidential residence featuring an executive parlor, marble-finished bathroom, and expansive entertaining lounge.", features: ["Executive parlor", "King canopy bed", "Complimentary breakfast", "Late checkout"] },
  { slug: "super-executive", name: "Super Executive", qty: 1, baseRate: 6000000, maxOccupancy: 2, bed: "King Bed", image: "/images/superexecutive.jpg", blurb: "An expansive, peaceful haven featuring a private reading corner, plush bedding, and soft natural daylight.", features: ["King bed", "Reading corner", "Smart TV", "Daily housekeeping"] },
  { slug: "executive", name: "Executive", qty: 8, baseRate: 5000000, maxOccupancy: 2, bed: "King Bed", image: "/images/executive.jpg", blurb: "Rich warm timber, crisp Egyptian cotton linen, and an ergonomic workstation for productive executive stays.", features: ["King bed", "Work desk", "Rain shower", "Complimentary Wi-Fi"] },
  { slug: "standard-plus", name: "Standard Plus", qty: 4, baseRate: 4500000, maxOccupancy: 3, bed: "Queen Bed", image: "/images/standar plus.jpg", blurb: "An elevated retreat offering an extended lounge seating area, workspace, and serene courtyard views.", features: ["Queen bed", "Seating area", "Smart TV", "Air conditioning"] },
  { slug: "deluxe", name: "Deluxe", qty: 5, baseRate: 4000000, maxOccupancy: 2, bed: "Queen Bed", image: "/images/deluxe.jpg", blurb: "Understated luxury with scenic garden-facing windows and a soothing contemporary palette.", features: ["Queen bed", "Garden view", "Smart TV", "24-hour room service"] },
  { slug: "studio", name: "Studio", qty: 1, baseRate: 3500000, maxOccupancy: 2, bed: "Queen Bed", image: "/images/studio3.jpg", blurb: "A versatile open-plan studio residence for extended stays with kitchenette and dining nook.", features: ["Open plan", "Kitchenette", "Work nook", "Laundry service"] },
  { slug: "standard", name: "Standard", qty: 5, baseRate: 3000000, maxOccupancy: 2, bed: "Double Bed", image: "/images/standard.jpg", blurb: "A welcoming, quiet sanctuary featuring premium bedding and refined contemporary essentials.", features: ["Double bed", "Smart TV", "Air conditioning", "Complimentary Wi-Fi"] },
];

const RATE_PLANS = [
  {
    id: "flexible",
    name: "Flexible",
    priceModifier: { type: "percent", value: 0 },
    freeCancellationDays: 1,
    cancellationPolicy: "flexible",
    depositPercent: 50,
    minNights: 1,
    description: "Free cancellation until 1 day before check-in. 50% deposit to secure.",
    active: true,
  },
  {
    id: "non-refundable-saver",
    name: "Non-Refundable Saver",
    priceModifier: { type: "percent", value: -10 },
    freeCancellationDays: 0,
    cancellationPolicy: "non_refundable",
    depositPercent: 100,
    minNights: 1,
    description: "Pay in full, save 10%. Non-refundable once confirmed.",
    active: true,
  },
  {
    id: "bed-breakfast",
    name: "Bed & Breakfast",
    priceModifier: { type: "percent", value: 5 },
    freeCancellationDays: 2,
    cancellationPolicy: "flexible",
    depositPercent: 50,
    minNights: 1,
    description: "Includes daily gourmet breakfast for two. Free cancellation until 2 days before arrival.",
    active: true,
  },
];

const ADDONS = [
  { id: "airport-transfer", name: "VIP Airport Transfer", price: 2500000, unit: "per_stay", active: true, description: "Private air-conditioned transfer to/from the airport." },
  { id: "early-checkin", name: "Early Check-in (from 10 AM)", price: 1000000, unit: "per_stay", active: true },
  { id: "late-checkout", name: "Late Checkout (until 4 PM)", price: 1000000, unit: "per_stay", active: true },
  { id: "extra-bed", name: "Extra Bed", price: 1500000, unit: "per_night", active: true },
  { id: "anniversary", name: "Anniversary / Special Occasion Setup", price: 3000000, unit: "per_stay", active: true },
];

function roomNumber(rt: RoomTypeSeed, i: number): string {
  const floorBase: Record<string, number> = {
    "standard": 100, "deluxe": 200, "standard-plus": 250, "executive": 300,
    "super-executive": 380, "presidential-suite": 400, "signature-suite": 500, "studio": 550,
  };
  const base = floorBase[rt.slug] ?? 100;
  return String(base + i + 1);
}

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON is not set. Add it in Settings → Environment first.");
    process.exit(1);
  }
  const app = getApps().length === 0 ? initializeApp({ credential: cert(JSON.parse(raw)) }) : getApps()[0];
  const db = getFirestore(app, firebaseConfigData?.firestoreDatabaseId);

  console.log("Seeding room types…");
  for (const rt of ROOM_TYPES) {
    const slug = rt.slug;
    const docRef = db.collection("room_types").doc(slug);
    await docRef.set({ ...rt, status: "active" }, { merge: true });

    // Physical rooms — ids deterministic: room_types/{slug}/rooms/{number}
    const existing = await db.collection("physical_rooms").where("roomTypeId", "==", slug).get();
    const wantNumbers = Array.from({ length: rt.qty }, (_, i) => roomNumber(rt, i));
    const haveNumbers = new Set(existing.docs.map((d) => d.data().number));
    for (const n of wantNumbers) {
      if (haveNumbers.has(n)) continue;
      const num = Number(n);
      await db.collection("physical_rooms").add({
        roomTypeId: slug,
        number: n,
        floor: Math.floor(num / 100),
        status: "active",
        housekeeping: "clean",
      });
    }
    console.log(`  ${rt.name}: ${rt.qty} rooms (${wantNumbers.join(", ")})`);
  }

  console.log("Seeding rate plans…");
  for (const p of RATE_PLANS) {
    await db.collection("rate_plans").doc(p.id).set(p, { merge: true });
  }

  console.log("Seeding add-ons…");
  for (const a of ADDONS) {
    await db.collection("addons").doc(a.id).set(a, { merge: true });
  }

  console.log("Seeding weekend rate rule…");
  await db
    .collection("rate_rules")
    .doc("weekend-uplift")
    .set(
      {
        name: "Weekend uplift",
        kind: "weekend",
        adjustmentPercent: 10,
        // 5 = Friday, 6 = Saturday
        daysOfWeek: [5, 6],
        startDate: "2026-01-01",
        endDate: "2030-12-31",
        active: true,
      },
      { merge: true },
    );

  console.log("✅ Seed complete.");
  console.log("   Room types, physical rooms, rate plans, add-ons, and the weekend rule are provisioned.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
