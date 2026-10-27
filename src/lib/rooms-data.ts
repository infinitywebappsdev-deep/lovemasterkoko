import { db } from "@/lib/firebase";
import { ROOMS as DEFAULT_ROOMS, Room } from "@/lib/hotel";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

const ROOMS_COLLECTION = "rooms";
const LOCAL_STORAGE_KEY = "banky_custom_rooms_cache";

/**
 * Normalizes room data ensuring required fields and array formats
 */
export function normalizeRoom(data: any, id: string): Room {
  return {
    slug: data.slug || id,
    name: data.name || "Unnamed Room",
    rate: Number(data.rate) || 30000,
    qty: Number(data.qty) || 1,
    occupancy: data.occupancy || "2 Guests",
    bed: data.bed || "King Bed",
    image: data.image || "/images/Standard room.jpg",
    images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [data.image || "/images/Standard room.jpg"],
    video: data.video || (data.slug ? `/videos/${data.slug}-room.mp4` : undefined),
    blurb: data.blurb || "Comfortable and elegantly appointed hotel accommodation at Banky Hotel & Suites.",
    features: Array.isArray(data.features) && data.features.length > 0
      ? data.features
      : ["Smart TV", "Air conditioning", "Complimentary Wi-Fi", "Daily housekeeping"],
  };
}

/**
 * Gets cached rooms from localStorage or default ROOMS
 */
export function getCachedRooms(): Room[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r) => normalizeRoom(r, r.slug));
        }
      }
    } catch {}
  }
  return [...DEFAULT_ROOMS];
}

/**
 * Saves rooms to localStorage cache
 */
function cacheRooms(rooms: Room[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rooms));
    } catch {}
  }
}

/**
 * Subscribes to live room categories from Firestore
 * Automatically seeds defaults into Firestore if collection is empty
 */
export function subscribeRooms(callback: (rooms: Room[]) => void): () => void {
  let initialLoaded = false;

  // Immediately invoke with cached or default rooms for instantaneous zero-latency rendering
  const initial = getCachedRooms();
  callback(initial);

  try {
    const roomsCol = collection(db, ROOMS_COLLECTION);
    const unsubscribe = onSnapshot(
      roomsCol,
      async (snapshot) => {
        if (snapshot.empty && !initialLoaded) {
          initialLoaded = true;
          // Optionally seed defaults into Firestore
          try {
            await seedDefaultRooms();
          } catch (e) {
            console.warn("Could not seed default rooms to Firestore:", e);
          }
          callback([...DEFAULT_ROOMS]);
          return;
        }

        initialLoaded = true;
        if (!snapshot.empty) {
          const liveRooms: Room[] = [];
          snapshot.forEach((docSnap) => {
            liveRooms.push(normalizeRoom(docSnap.data(), docSnap.id));
          });
          cacheRooms(liveRooms);
          callback(liveRooms);
        }
      },
      (error) => {
        console.warn("Firestore rooms listener warning:", error.message);
        // Fallback to cache or defaults
        callback(getCachedRooms());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Failed to subscribe to rooms collection:", err);
    callback(getCachedRooms());
    return () => {};
  }
}

/**
 * Fetches all rooms once from Firestore with fallback to defaults
 */
export async function fetchRooms(): Promise<Room[]> {
  try {
    const snapshot = await getDocs(collection(db, ROOMS_COLLECTION));
    if (snapshot.empty) {
      return [...DEFAULT_ROOMS];
    }
    const liveRooms: Room[] = [];
    snapshot.forEach((docSnap) => {
      liveRooms.push(normalizeRoom(docSnap.data(), docSnap.id));
    });
    cacheRooms(liveRooms);
    return liveRooms;
  } catch (err) {
    console.warn("Fetch rooms error, using fallback:", err);
    return getCachedRooms();
  }
}

/**
 * Saves (creates or updates) a room category in Firestore
 */
export async function saveRoomCategory(room: Room): Promise<void> {
  const cleanSlug = (room.slug || room.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();
  const roomData = {
    slug: cleanSlug,
    name: room.name.trim(),
    rate: Number(room.rate) || 30000,
    qty: Number(room.qty) || 1,
    occupancy: room.occupancy || "2 Guests",
    bed: room.bed || "King Bed",
    image: room.image || "/images/Standard room.jpg",
    images: room.images && room.images.length > 0 ? room.images : [room.image || "/images/Standard room.jpg"],
    video: room.video || `/videos/${cleanSlug}-room.mp4`,
    blurb: room.blurb || "",
    features: room.features || [],
    updatedAt: new Date().toISOString(),
  };

  // 1. Update Firestore rooms collection
  const roomDoc = doc(db, ROOMS_COLLECTION, cleanSlug);
  await setDoc(roomDoc, roomData, { merge: true });

  // 1b. Also sync to room_types for booking engine compatibility
  try {
    const roomTypeDoc = doc(db, "room_types", cleanSlug);
    await setDoc(
      roomTypeDoc,
      {
        id: cleanSlug,
        slug: cleanSlug,
        name: roomData.name,
        baseRate: Number(roomData.rate) * 100,
        rate: Number(roomData.rate),
        qty: Number(roomData.qty),
        image: roomData.image,
        images: roomData.images,
        video: roomData.video,
        blurb: roomData.blurb,
        features: roomData.features,
        status: "active",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Sync to room_types optional notice:", e);
  }

  // 2. Update local cache
  const current = getCachedRooms();
  const existingIdx = current.findIndex((r) => r.slug === cleanSlug);
  let updatedList: Room[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = normalizeRoom(roomData, cleanSlug);
  } else {
    updatedList = [...current, normalizeRoom(roomData, cleanSlug)];
  }
  cacheRooms(updatedList);
}

/**
 * Deletes a room category from Firestore
 */
export async function deleteRoomCategory(slug: string): Promise<void> {
  const roomDoc = doc(db, ROOMS_COLLECTION, slug);
  await deleteDoc(roomDoc);

  try {
    await deleteDoc(doc(db, "room_types", slug));
  } catch {}

  // Update local cache
  const current = getCachedRooms();
  const filtered = current.filter((r) => r.slug !== slug);
  cacheRooms(filtered);
}

/**
 * Seeds default Banky Hotel rooms into Firestore
 */
export async function seedDefaultRooms(): Promise<void> {
  for (const r of DEFAULT_ROOMS) {
    const roomDoc = doc(db, ROOMS_COLLECTION, r.slug);
    await setDoc(
      roomDoc,
      {
        ...r,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    try {
      const roomTypeDoc = doc(db, "room_types", r.slug);
      await setDoc(
        roomTypeDoc,
        {
          id: r.slug,
          slug: r.slug,
          name: r.name,
          baseRate: Number(r.rate) * 100,
          rate: Number(r.rate),
          qty: Number(r.qty),
          image: r.image,
          images: r.images || [r.image],
          video: r.video,
          blurb: r.blurb,
          features: r.features,
          status: "active",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}
  }
  cacheRooms([...DEFAULT_ROOMS]);
}
