import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";
import firebaseConfigData from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = initializeApp(firebaseConfig, "seeder-app");
const db = getFirestore(app, firebaseConfigData.firestoreDatabaseId);

async function populateProductionDb() {
  console.log("🚀 Starting database population for Firestore DB:", firebaseConfigData.firestoreDatabaseId);

  // 1. Organization
  console.log("Seeding organization...");
  await setDoc(doc(db, "organizations", "banky-hospitality-group"), {
    id: "banky-hospitality-group",
    name: "Banky Hospitality Group",
    legal_name: "Banky Hotel and Suites Limited",
    email: "reservations@bankyhotelandsuites.com",
    phone: "+2349035879708",
    country: "Nigeria",
    timezone: "Africa/Lagos",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { merge: true });

  // 2. Property
  console.log("Seeding property...");
  await setDoc(doc(db, "properties", "banky-hotel-ado-ekiti"), {
    id: "banky-hotel-ado-ekiti",
    organization_id: "banky-hospitality-group",
    name: "Banky Hotel & Suites",
    code: "BHS-ADO",
    description: "Quiet Luxury in the Heart of Ado-Ekiti. 28 appointed residences, serene ambiance, fine dining, swimming pool, and private event venues.",
    address: "Km 5 NDLEA Junction Ado-Iworoko Road, Adebayo",
    city: "Ado-Ekiti",
    state: "Ekiti State",
    country: "Nigeria",
    timezone: "Africa/Lagos",
    currency: "NGN",
    check_in_time: "14:00",
    check_out_time: "12:00",
    vat_percent: 7.5,
    service_charge_percent: 5.0,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { merge: true });

  // 3. Site Settings
  console.log("Seeding site settings...");
  await setDoc(doc(db, "site_settings", "primary"), {
    id: "primary",
    hotel_name: "Banky Hotel & Suites",
    tagline: "Quiet Luxury in the Heart of Ado-Ekiti",
    logo_url: "/logo.png",
    favicon_url: "/favicon.ico",
    color_primary: "#c59a3f",
    color_accent: "#d4af37",
    color_background: "#111111",
    phone: "+2349035879708",
    whatsapp: "2349035879708",
    email: "reservations@bankyhotelandsuites.com",
    address: "Km 5 NDLEA Junction Ado-Iworoko Road, Adebayo, Ado-Ekiti, Ekiti State, Nigeria",
    paystack_url: "https://paystack.shop/pay/bankyhotelandsuites",
    audit_retention_days: 365,
    audit_archive_enabled: true,
    updated_at: new Date().toISOString(),
  }, { merge: true });

  // 4. Room Types & Rooms Catalog
  console.log("Seeding room types and catalogs...");
  const ROOM_TYPES = [
    {
      slug: "luxury-suite",
      name: "Luxury Suite",
      qty: 1,
      baseRate: 20000000, // ₦200,000 in kobo
      rate: 200000,
      maxOccupancy: 3,
      bed: "King Canopy Bed",
      size: "85 sqm",
      image: "/images/signature suite room.jpg",
      video: "/videos/luxury-suite-room.mp4",
      blurb: "Our premier luxury residence: a sunlit master living parlor, private dressing area, and an opulent king canopy bedroom framed by full-height windows.",
      features: ["Private living room", "Butler service", "Complimentary breakfast", "VIP airport transfer", "Walk-in closet", "Marble bath"],
      amenities: ["High-speed Wi-Fi", "Smart 65\" 4K TV", "Espresso Machine", "Mini Bar", "Luxury Linens", "Bathtub & Rain Shower"],
      availability_status: "available",
      published: true,
      sort_order: 1,
      status: "active",
    },
    {
      slug: "luxury",
      name: "Luxury",
      qty: 3,
      baseRate: 10000000, // ₦100,000 in kobo
      rate: 100000,
      maxOccupancy: 3,
      bed: "King Canopy Bed",
      size: "70 sqm",
      image: "/images/Presidential.jpg",
      images: ["/images/Presidential.jpg", "/images/presidential 17.jpg", "/images/presidential23.jpg", "/images/presidential3.jpg"],
      video: "/videos/luxury-room.mp4",
      blurb: "A stately luxury residence featuring an executive parlor, marble-finished bathroom, and expansive entertaining lounge.",
      features: ["Executive parlor", "King canopy bed", "Complimentary breakfast", "Late checkout", "Dining area"],
      amenities: ["High-speed Wi-Fi", "Smart TV", "Executive desk", "Mini Bar", "Room Service", "En-suite Bath"],
      availability_status: "available",
      published: true,
      sort_order: 2,
      status: "active",
    },
    {
      slug: "super-executive",
      name: "Super Executive",
      qty: 1,
      baseRate: 6000000, // ₦60,000 in kobo
      rate: 60000,
      maxOccupancy: 2,
      bed: "King Bed",
      size: "52 sqm",
      image: "/images/superexecutive.jpg",
      images: ["/images/superexecutive.jpg", "/images/super executive1.jpg", "/images/super executive 2.jpg"],
      video: "/videos/super-executive-room.mp4",
      blurb: "An expansive, peaceful haven featuring a private reading corner, plush appointments, and soft natural daylight.",
      features: ["King bed", "Reading corner", "Smart TV", "Daily housekeeping", "Courtyard view"],
      amenities: ["Wi-Fi", "Smart TV", "Mini Refrigerator", "Work Desk", "Air Conditioning"],
      availability_status: "available",
      published: true,
      sort_order: 3,
      status: "active",
    },
    {
      slug: "executive",
      name: "Executive",
      qty: 8,
      baseRate: 5000000, // ₦50,000 in kobo
      rate: 50000,
      maxOccupancy: 2,
      bed: "King Bed",
      size: "45 sqm",
      image: "/images/EXECUTIVE Main.jpeg",
      images: ["/images/EXECUTIVE Main.jpeg", "/images/EXECUTIVE MAIN2.jpeg"],
      video: "/videos/executive-room.mp4",
      blurb: "Rich warm timber, crisp Egyptian cotton linen, and an ergonomic workstation tailored for productive executive stays.",
      features: ["King bed", "Work desk", "Rain shower", "Complimentary Wi-Fi", "Daily housekeeping"],
      amenities: ["Wi-Fi", "Smart TV", "Coffee & Tea Maker", "Air Conditioning", "En-suite Bathroom"],
      availability_status: "available",
      published: true,
      sort_order: 4,
      status: "active",
    },
    {
      slug: "standard-plus",
      name: "Standard Plus",
      qty: 4,
      baseRate: 4500000, // ₦45,000 in kobo
      rate: 45000,
      maxOccupancy: 3,
      bed: "Queen Bed",
      size: "38 sqm",
      image: "/images/Standard PLUS.jpeg",
      images: ["/images/Standard PLUS.jpeg", "/images/STANDARD PLUS MAIN .jpeg"],
      video: "/videos/standard-plus-room.mp4",
      blurb: "An elevated retreat offering an extended lounge seating area, comfortable dedicated workspace, and serene courtyard views.",
      features: ["Queen bed", "Seating area", "Smart TV", "Air conditioning", "Complimentary Wi-Fi"],
      amenities: ["Wi-Fi", "Smart TV", "Desk", "Air Conditioning"],
      availability_status: "available",
      published: true,
      sort_order: 5,
      status: "active",
    },
    {
      slug: "deluxe",
      name: "Deluxe",
      qty: 5,
      baseRate: 4000000, // ₦40,000 in kobo
      rate: 40000,
      maxOccupancy: 2,
      bed: "Queen Bed",
      size: "34 sqm",
      image: "/images/DELUXE MAIN1.jpeg",
      images: ["/images/DELUXE MAIN1.jpeg", "/images/DELUXE MAIN2.jpeg"],
      video: "/videos/deluxe-room.mp4",
      blurb: "Understated luxury with modern ambient ceiling lighting, executive comfort, flat-screen entertainment, and a soothing warm palette.",
      features: ["Smart TV", "Mood lighting", "Air conditioning", "Work desk", "24-hour room service"],
      amenities: ["Wi-Fi", "Smart TV", "Mini Refrigerator", "Air Conditioning"],
      availability_status: "available",
      published: true,
      sort_order: 6,
      status: "active",
    },
    {
      slug: "studio",
      name: "Studio",
      qty: 1,
      baseRate: 3500000, // ₦35,000 in kobo
      rate: 35000,
      maxOccupancy: 2,
      bed: "Queen Bed",
      size: "36 sqm",
      image: "/images/Suite1.jpg",
      video: "/videos/studio-room.mp4",
      blurb: "A versatile open-plan studio residence designed for extended city stays, complete with an integrated kitchenette and cozy dining nook.",
      features: ["Open plan", "Kitchenette", "Work nook", "Laundry service", "Dining corner"],
      amenities: ["Wi-Fi", "Smart TV", "Kitchenette", "Microwave", "Air Conditioning"],
      availability_status: "available",
      published: true,
      sort_order: 7,
      status: "active",
    },
    {
      slug: "standard",
      name: "Standard",
      qty: 5,
      baseRate: 3000000, // ₦30,000 in kobo
      rate: 30000,
      maxOccupancy: 2,
      bed: "Double Bed",
      size: "28 sqm",
      image: "/images/Standard room.jpg",
      images: ["/images/Standard room.jpg", "/images/standard.jpg"],
      video: "/videos/standard-room.mp4",
      blurb: "A welcoming, quiet sanctuary featuring refined contemporary essentials, whisper-quiet climate control, and dedicated service.",
      features: ["Double bed", "Smart TV", "Air conditioning", "Complimentary Wi-Fi", "En-suite bathroom"],
      amenities: ["Wi-Fi", "Smart TV", "Air Conditioning", "En-suite Bathroom"],
      availability_status: "available",
      published: true,
      sort_order: 8,
      status: "active",
    },
  ];

  for (const rt of ROOM_TYPES) {
    const docData = {
      ...rt,
      property_id: "banky-hotel-ado-ekiti",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Seed both room_types and rooms collections for compatibility
    await setDoc(doc(db, "room_types", rt.slug), docData, { merge: true });
    await setDoc(doc(db, "rooms", rt.slug), docData, { merge: true });
    console.log(`  ✓ Room Category: ${rt.name} (${rt.qty} units)`);
  }

  // 5. Physical Rooms (28 room units)
  console.log("Seeding physical rooms (28 units)...");
  const roomFloors: Record<string, { start: number; prefix: string }> = {
    "standard": { start: 101, prefix: "10" },
    "deluxe": { start: 201, prefix: "20" },
    "standard-plus": { start: 251, prefix: "25" },
    "executive": { start: 301, prefix: "30" },
    "super-executive": { start: 381, prefix: "38" },
    "luxury": { start: 401, prefix: "40" },
    "luxury-suite": { start: 401, prefix: "40" },
    "presidential-suite": { start: 401, prefix: "40" },
    "signature-suite": { start: 501, prefix: "50" },
    "studio": { start: 551, prefix: "55" },
  };

  for (const rt of ROOM_TYPES) {
    const meta = roomFloors[rt.slug] || { start: 101, prefix: "10" };
    for (let i = 0; i < rt.qty; i++) {
      const roomNum = String(meta.start + i);
      const roomId = `room-${roomNum}`;
      await setDoc(doc(db, "physical_rooms", roomId), {
        id: roomId,
        property_id: "banky-hotel-ado-ekiti",
        roomTypeId: rt.slug,
        room_type_id: rt.slug,
        number: roomNum,
        room_number: roomNum,
        floor: Math.floor(parseInt(roomNum, 10) / 100),
        status: "active",
        housekeeping: "clean",
        housekeeping_status: "clean",
        maintenance_status: "operational",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true });
    }
  }
  console.log("  ✓ 28 Physical rooms registered.");

  // 6. Rate Plans
  console.log("Seeding rate plans...");
  const RATE_PLANS = [
    {
      id: "flexible",
      name: "Flexible Rate",
      code: "FLEX",
      meal_plan: "room_only",
      refundable: true,
      priceModifier: { type: "percent", value: 0 },
      freeCancellationDays: 1,
      cancellationPolicy: "flexible",
      payment_policy: "50% advance deposit to secure, balance at check-in.",
      depositPercent: 50,
      minNights: 1,
      description: "Free cancellation until 24 hours before check-in. 50% deposit secures reservation.",
      active: true,
      status: "active",
    },
    {
      id: "non-refundable-saver",
      name: "Non-Refundable Saver",
      code: "NR-10",
      meal_plan: "room_only",
      refundable: false,
      priceModifier: { type: "percent", value: -10 },
      freeCancellationDays: 0,
      cancellationPolicy: "non_refundable",
      payment_policy: "100% full prepayment at reservation.",
      depositPercent: 100,
      minNights: 1,
      description: "Pay in full, save 10%. Non-refundable once confirmed.",
      active: true,
      status: "active",
    },
    {
      id: "bed-breakfast",
      name: "Bed & Breakfast Package",
      code: "BNB",
      meal_plan: "breakfast_included",
      refundable: true,
      priceModifier: { type: "percent", value: 5 },
      freeCancellationDays: 2,
      cancellationPolicy: "flexible",
      payment_policy: "50% advance deposit, balance at front desk.",
      depositPercent: 50,
      minNights: 1,
      description: "Includes daily gourmet hot breakfast for two guests. Free cancellation up to 48 hours before arrival.",
      active: true,
      status: "active",
    },
  ];

  for (const rp of RATE_PLANS) {
    await setDoc(doc(db, "rate_plans", rp.id), {
      ...rp,
      property_id: "banky-hotel-ado-ekiti",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
    console.log(`  ✓ Rate plan: ${rp.name}`);
  }

  // 7. Rate Rules
  console.log("Seeding rate rules...");
  await setDoc(doc(db, "rate_rules", "weekend-uplift"), {
    id: "weekend-uplift",
    property_id: "banky-hotel-ado-ekiti",
    name: "Weekend Premium Uplift",
    kind: "weekend",
    rule_type: "weekend",
    adjustmentPercent: 10,
    adjustment_type: "percentage",
    adjustment_value: 10,
    daysOfWeek: [5, 6], // Friday & Saturday
    days_of_week: [5, 6],
    startDate: "2026-01-01",
    endDate: "2030-12-31",
    start_date: "2026-01-01",
    end_date: "2030-12-31",
    min_stay: 1,
    active: true,
    status: "active",
  }, { merge: true });

  await setDoc(doc(db, "rate_rules", "holiday-festive"), {
    id: "holiday-festive",
    property_id: "banky-hotel-ado-ekiti",
    name: "Holiday & Festive Season",
    kind: "seasonal",
    rule_type: "seasonal",
    adjustmentPercent: 15,
    adjustment_type: "percentage",
    adjustment_value: 15,
    startDate: "2026-12-15",
    endDate: "2027-01-10",
    start_date: "2026-12-15",
    end_date: "2027-01-10",
    min_stay: 2,
    active: true,
    status: "active",
  }, { merge: true });

  // 8. Addons & Extras
  console.log("Seeding addons & extras...");
  const ADDONS = [
    {
      id: "airport-transfer",
      name: "VIP Airport Transfer",
      description: "Private air-conditioned pickup and drop-off to/from Akure Airport directly to Banky Hotel.",
      price: 2500000, // ₦25,000 in kobo
      unit: "per_stay",
      active: true,
    },
    {
      id: "early-checkin",
      name: "Early Check-in (from 10:00 AM)",
      description: "Guaranteed early access to your luxury room upon morning arrival.",
      price: 1000000, // ₦10,000 in kobo
      unit: "per_stay",
      active: true,
    },
    {
      id: "late-checkout",
      name: "Late Checkout (until 4:00 PM)",
      description: "Extend your restful stay with a relaxed late afternoon checkout.",
      price: 1000000, // ₦10,000 in kobo
      unit: "per_stay",
      active: true,
    },
    {
      id: "extra-bed",
      name: "Rollaway Luxury Bed",
      description: "Plush extra rollaway bed complete with premium duvet and pillows.",
      price: 1500000, // ₦15,000 in kobo
      unit: "per_night",
      active: true,
    },
    {
      id: "anniversary-setup",
      name: "Romance & Celebration Setup",
      description: "Chilled sparkling wine, hand-crafted floral bouquet, chocolates, and bed petal decor.",
      price: 3000000, // ₦30,000 in kobo
      unit: "per_stay",
      active: true,
    },
  ];

  for (const addon of ADDONS) {
    await setDoc(doc(db, "addons", addon.id), {
      ...addon,
      created_at: new Date().toISOString(),
    }, { merge: true });
    console.log(`  ✓ Add-on: ${addon.name}`);
  }

  // 9. Promotions
  console.log("Seeding promotions...");
  await setDoc(doc(db, "promotions", "WELCOME10"), {
    id: "WELCOME10",
    name: "Welcome Direct Guest Discount",
    code: "WELCOME10",
    discount_type: "percent",
    discountType: "percent",
    discount_value: 10,
    value: 10,
    min_nights: 2,
    minBookingAmount: 5000000,
    usage_limit: 500,
    usage_count: 14,
    start_date: "2026-01-01",
    end_date: "2028-12-31",
    validFrom: "2026-01-01",
    validTo: "2028-12-31",
    active: true,
    status: "active",
  }, { merge: true });

  await setDoc(doc(db, "promotions", "BANKYVIP"), {
    id: "BANKYVIP",
    name: "Banky VIP Resident Perk",
    code: "BANKYVIP",
    discount_type: "percent",
    discountType: "percent",
    discount_value: 15,
    value: 15,
    min_nights: 1,
    minBookingAmount: 10000000,
    usage_limit: 200,
    usage_count: 5,
    start_date: "2026-01-01",
    end_date: "2028-12-31",
    validFrom: "2026-01-01",
    validTo: "2028-12-31",
    active: true,
    status: "active",
  }, { merge: true });

  // 10. QR Menu Categories & Items
  console.log("Seeding QR restaurant & in-room menu...");
  const MENU_CATEGORIES = [
    { id: "starters", name: "Starters & Appetizers", slug: "starters", order: 1, icon: "Soup", is_active: true, description: "Delightful warm soups and appetizers to begin your dining experience." },
    { id: "nigerian-delicacies", name: "Authentic Nigerian Delicacies", slug: "nigerian-delicacies", order: 2, icon: "Utensils", is_active: true, description: "Rich traditional native soups served with freshly prepared swallows and aromatic jollof." },
    { id: "continental-grills", name: "Continental & Grills", slug: "continental-grills", order: 3, icon: "Flame", is_active: true, description: "Prime beef, poultry, and fresh ocean seafood flame-grilled by our executive chef." },
    { id: "suya-bar", name: "Suya & Evening Bites", slug: "suya-bar", order: 4, icon: "Sparkles", is_active: true, description: "Tender wood-fired suya seasoned with authentic yaji spice." },
    { id: "cocktails", name: "Signature Cocktails & Drinks", slug: "cocktails", order: 5, icon: "Wine", is_active: true, description: "Crafted cocktails, mocktails, fresh tropical juices, and chilled beverages." },
  ];

  for (const cat of MENU_CATEGORIES) {
    await setDoc(doc(db, "menu_categories", cat.id), {
      ...cat,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }

  const MENU_ITEMS = [
    {
      id: "catfish-pepper-soup",
      category_id: "starters",
      category_name: "Starters & Appetizers",
      title: "Point & Kill Catfish Pepper Soup",
      description: "Live fresh catfish infused in fragrant indigenous herbs, uziza leaves, and aromatic pepper broth.",
      price: 6500,
      image_url: "/images/food-peppersoup.jpg",
      dietary: ["Gluten-Free", "Spicy", "Chef Special"],
      is_available: true,
      is_featured: true,
      preparation_time: "25 mins",
      order: 1,
    },
    {
      id: "goat-meat-pepper-soup",
      category_id: "starters",
      category_name: "Starters & Appetizers",
      title: "Asun Style Goat Meat Pepper Soup",
      description: "Slow-simmered tender goat cuts seasoned with native spices and hot chili peppers.",
      price: 5500,
      image_url: "/images/food-goatpeppersoup.jpg",
      dietary: ["Spicy", "High Protein"],
      is_available: true,
      is_featured: false,
      preparation_time: "20 mins",
      order: 2,
    },
    {
      id: "banky-special-jollof",
      category_id: "nigerian-delicacies",
      category_name: "Authentic Nigerian Delicacies",
      title: "Banky Signature Party Jollof Rice",
      description: "Smoky firewood-style jollof rice served with grilled chicken, sweet plantain (dodo), and fresh garden coleslaw.",
      price: 6000,
      image_url: "/images/food-jollof.jpg",
      dietary: ["Best Seller", "Signature"],
      is_available: true,
      is_featured: true,
      preparation_time: "20 mins",
      order: 3,
    },
    {
      id: "pounded-yam-egusi",
      category_id: "nigerian-delicacies",
      category_name: "Authentic Nigerian Delicacies",
      title: "Pounded Yam with Rich Egusi Soup",
      description: "Authentic Ekiti-style pounded yam served with melon seed soup, stockfish, dried panla, and assorted meats.",
      price: 7500,
      image_url: "/images/food-egusi.jpg",
      dietary: ["Traditional", "Hearty"],
      is_available: true,
      is_featured: true,
      preparation_time: "25 mins",
      order: 4,
    },
    {
      id: "grilled-croaker-fish",
      category_id: "continental-grills",
      category_name: "Continental & Grills",
      title: "Whole Charcoal-Grilled Croaker Fish",
      description: "Plump Atlantic croaker fish marinated in garlic, rosemary, and ginger, garnished with grilled bell peppers and chips.",
      price: 12000,
      image_url: "/images/food-fish.jpg",
      dietary: ["High Protein", "Chef Special"],
      is_available: true,
      is_featured: true,
      preparation_time: "35 mins",
      order: 5,
    },
    {
      id: "beef-suya-platter",
      category_id: "suya-bar",
      category_name: "Suya & Evening Bites",
      title: "Executive Beef Suya Platter",
      description: "Thinly sliced tender prime sirloin grilled over charcoal, dusted with spicy kuli-kuli yaji, sliced sweet onions, and tomatoes.",
      price: 4500,
      image_url: "/images/food-suya.jpg",
      dietary: ["Spicy", "Authentic"],
      is_available: true,
      is_featured: true,
      preparation_time: "15 mins",
      order: 6,
    },
    {
      id: "banky-sunset-chapman",
      category_id: "cocktails",
      category_name: "Signature Cocktails & Drinks",
      title: "Banky Sunset Chapman (Signature Mocktail)",
      description: "Classic Nigerian refreshing drink with Angostura bitters, fresh cucumber wheels, mint sprig, and citrus.",
      price: 2500,
      image_url: "/images/drink-chapman.jpg",
      dietary: ["Non-Alcoholic", "Refreshing"],
      is_available: true,
      is_featured: true,
      preparation_time: "5 mins",
      order: 7,
    },
  ];

  for (const item of MENU_ITEMS) {
    await setDoc(doc(db, "menu_items", item.id), {
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
    console.log(`  ✓ Menu item: ${item.title}`);
  }

  // 11. FAQs
  console.log("Seeding FAQs...");
  const FAQS = [
    {
      id: "checkin-checkout-times",
      question: "What are the standard check-in and check-out times at Banky Hotel & Suites?",
      answer: "Standard check-in begins at 2:00 PM (14:00) and check-out is at 12:00 PM (noon). Early check-in from 10:00 AM and late checkout until 4:00 PM can be arranged upon request.",
      sort_order: 1,
      published: true,
    },
    {
      id: "airport-pickup",
      question: "Is airport transportation available to the hotel?",
      answer: "Yes, we provide VIP private chauffeured airport transfers from Akure Airport (AKR) straight to the hotel. You can select this add-on during booking or contact our concierge.",
      sort_order: 2,
      published: true,
    },
    {
      id: "payment-methods",
      question: "Which payment methods are accepted?",
      answer: "We accept secure online debit/credit card payments via Paystack, direct Nigerian bank transfers, POS terminals at the front desk, and direct cash settlement upon check-in.",
      sort_order: 3,
      published: true,
    },
    {
      id: "pool-and-amenities",
      question: "What recreation facilities and amenities are available on-site?",
      answer: "Guests enjoy our private swimming pool, upscale cocktail lounge, 24-hour restaurant with in-room dining, high-speed fiber Wi-Fi, constant power backup, and guarded security.",
      sort_order: 4,
      published: true,
    },
    {
      id: "in-room-dining-qr",
      question: "Can I order food and drinks directly to my room or poolside table?",
      answer: "Yes! Every room and lounge table is equipped with a digital QR code menu at /qr. Simply scan or navigate to order hot food, cocktails, and amenities directly with zero phone delay.",
      sort_order: 5,
      published: true,
    },
    {
      id: "cancellation-policy",
      question: "What is the cancellation and refund policy?",
      answer: "Reservations on our Flexible Rate can be cancelled free of charge up to 24 hours prior to arrival. Non-Refundable Saver rates offer a 10% discount and cannot be refunded once confirmed.",
      sort_order: 6,
      published: true,
    },
  ];

  for (const faq of FAQS) {
    await setDoc(doc(db, "faqs", faq.id), {
      ...faq,
      created_at: new Date().toISOString(),
    }, { merge: true });
    console.log(`  ✓ FAQ: ${faq.question.slice(0, 40)}...`);
  }

  // 12. Gallery Images
  console.log("Seeding gallery images...");
  const GALLERY = [
    { id: "exterior-1", url: "/images/signature suite room.jpg", caption: "Signature Master Residence Interior", category: "suites", published: true, sort_order: 1 },
    { id: "exterior-2", url: "/images/Presidential.jpg", caption: "Luxury Executive Parlor", category: "suites", published: true, sort_order: 2 },
    { id: "exterior-3", url: "/images/EXECUTIVE Main.jpeg", caption: "Executive Room Workspace & Bed", category: "rooms", published: true, sort_order: 3 },
    { id: "exterior-4", url: "/images/DELUXE MAIN1.jpeg", caption: "Deluxe Residence Ambient Lighting", category: "rooms", published: true, sort_order: 4 },
    { id: "exterior-5", url: "/images/Standard PLUS.jpeg", caption: "Standard Plus Lounge Corner", category: "rooms", published: true, sort_order: 5 },
    { id: "exterior-6", url: "/images/superexecutive.jpg", caption: "Super Executive Reading Sanctuary", category: "rooms", published: true, sort_order: 6 },
  ];

  for (const img of GALLERY) {
    await setDoc(doc(db, "gallery_images", img.id), {
      ...img,
      created_at: new Date().toISOString(),
    }, { merge: true });
  }

  // 13. Guest Reviews
  console.log("Seeding guest reviews & testimonials...");
  const REVIEWS = [
    {
      id: "review-dignitary-1",
      guest_name: "Dr. Oladipo Adeleke",
      guest_email: "o.adeleke@example.com",
      rating_overall: 5,
      rating_cleanliness: 5,
      rating_service: 5,
      rating_comfort: 5,
      rating_dining: 5,
      rating_value: 5,
      review_title: "Exceptional Serenity & High-Level Security",
      review_text: "I spent three nights in the Luxury room during an official summit in Ado-Ekiti. The staff were discreet and attentive, the catfish pepper soup was world-class, and the peaceful ambiance allowed me to rest completely. Banky Hotel is now my go-to residence in Ekiti State.",
      room_category: "Luxury",
      stay_purpose: "Business / Official",
      verified_stay: true,
      allow_public_display: true,
      status: "published",
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: "review-couple-2",
      guest_name: "Mrs. Funmi & Tunde Balogun",
      guest_email: "fbalogun@example.com",
      rating_overall: 5,
      rating_cleanliness: 5,
      rating_service: 5,
      rating_comfort: 5,
      rating_dining: 5,
      rating_value: 5,
      review_title: "Unmatched Hospitality and Pristine Rooms",
      review_text: "The Luxury Suite is simply magnificent. The bedding is ultra plush, climate control is whisper quiet, and the slow-motion video tours matched reality perfectly. The front desk was extraordinarily warm.",
      room_category: "Luxury Suite",
      stay_purpose: "Leisure / Anniversary",
      verified_stay: true,
      allow_public_display: true,
      status: "published",
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
      id: "review-exec-3",
      guest_name: "Engr. Kenneth Nwosu",
      guest_email: "knwosu@example.com",
      rating_overall: 5,
      rating_cleanliness: 5,
      rating_service: 5,
      rating_comfort: 5,
      rating_dining: 4,
      rating_value: 5,
      review_title: "Seamless High-Speed Wi-Fi & Productivity",
      review_text: "Clean, comfortable executive room with constant uninterrupted electricity and rock-solid internet for video conferences. Highly recommended for business travelers.",
      room_category: "Executive",
      stay_purpose: "Business",
      verified_stay: true,
      allow_public_display: true,
      status: "published",
      created_at: new Date(Date.now() - 19 * 86400000).toISOString(),
    },
  ];

  for (const rev of REVIEWS) {
    await setDoc(doc(db, "guest_reviews", rev.id), {
      ...rev,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    console.log(`  ✓ Review by: ${rev.guest_name}`);
  }

  // 14. Content Pages
  console.log("Seeding content pages...");
  const PAGES = [
    {
      id: "about",
      slug: "about",
      title: "About Banky Hotel & Suites",
      subtitle: "A Sanctuary of Sophisticated Living in Ado-Ekiti",
      body: "Banky Hotel & Suites is nestled strategically along Ado-Iworoko Road, offering 28 meticulously styled residences that merge contemporary elegance with bespoke Nigerian hospitality. From corporate summits to quiet private getaways, every detail is tuned for your utmost peace.",
      meta_description: "Discover Banky Hotel & Suites, Ado-Ekiti's premier boutique luxury hotel offering suites, fine dining, and peaceful hospitality.",
      nav_label: "About Us",
      sort_order: 1,
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "amenities",
      slug: "amenities",
      title: "Hotel Amenities & Services",
      subtitle: "Crafted for Rest, Rejuvenation & Executive Living",
      body: "Enjoy uninterrupted 24/7 power supply, high-speed fiber internet, private swimming pool, 24-hour in-room dining, executive transport, and round-the-clock guarded security.",
      meta_description: "Experience world-class amenities at Banky Hotel & Suites in Ado-Ekiti, Ekiti State.",
      nav_label: "Amenities",
      sort_order: 2,
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "dining",
      slug: "dining",
      title: "Culinary Experiences & Bar",
      subtitle: "Gourmet Local and Continental Flavors",
      body: "Our kitchen honors Nigerian culinary heritage with signature party jollof, authentic pounded yam, and spicy catfish pepper soup alongside grilled continental favorites.",
      meta_description: "Explore the dining and cocktail menu at Banky Hotel & Suites.",
      nav_label: "Dining",
      sort_order: 3,
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "contact",
      slug: "contact",
      title: "Contact & Concierge",
      subtitle: "We Are Always at Your Service",
      body: "Located at Km 5 NDLEA Junction, Ado-Iworoko Road, Adebayo, Ado-Ekiti, Ekiti State, Nigeria. Phone: +2349035879708. Email: reservations@bankyhotelandsuites.com.",
      meta_description: "Contact Banky Hotel & Suites concierge, reception, and reservation team.",
      nav_label: "Contact",
      sort_order: 4,
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const page of PAGES) {
    await setDoc(doc(db, "pages", page.id), page, { merge: true });
    console.log(`  ✓ Page: ${page.title}`);
  }

  // 15. User Roles (Super Admin seed)
  console.log("Seeding staff user roles...");
  const STAFF_EMAILS = [
    { email: "chrisbllack@gmail.com", role: "super_admin", id: "staff-chrisbllack" },
    { email: "bankyhotelado@gmail.com", role: "admin", id: "staff-bankyhotelado" },
    { email: "admin@bankyhotelandsuites.com", role: "admin", id: "staff-hoteladmin" },
  ];

  for (const staff of STAFF_EMAILS) {
    await setDoc(doc(db, "user_roles", staff.id), {
      id: staff.id,
      email: staff.email,
      user_id: staff.id,
      role: staff.role,
      created_at: new Date().toISOString(),
    }, { merge: true });
    console.log(`  ✓ User Role: ${staff.email} (${staff.role})`);
  }

  console.log("🎉 ALL FIRESTORE COLLECTIONS SUCCESSFULLY POPULATED!");
}

populateProductionDb()
  .then(() => {
    console.log("Seeding process finished with exit code 0.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FATAL: Failed to populate production DB:", err);
    process.exit(1);
  });
