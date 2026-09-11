import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuCategory, MenuItem, QrOrder, OrderStatus } from "./types";
import { DEFAULT_CATEGORIES, DEFAULT_MENU_ITEMS } from "./seed";

const LOCAL_STORAGE_ITEMS_KEY = "banky_qr_menu_items_cache";
const LOCAL_STORAGE_CATS_KEY = "banky_qr_menu_cats_cache";
const LOCAL_STORAGE_ORDERS_KEY = "banky_qr_orders_cache";

/**
 * Sound notification for kitchen/bar orders using Web Audio API
 */
export function playOrderChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Pleasant two-tone luxury chime (E5 -> G#5 -> B5)
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(659.25, now, 0.4); // E5
    playTone(830.61, now + 0.15, 0.5); // G#5
    playTone(987.77, now + 0.35, 0.7); // B5
  } catch {
    // Audio play might be blocked by browser policy until interaction
  }
}

/**
 * Format Nigerian Naira currency
 */
export function formatNaira(amount: number): string {
  return "₦" + Number(amount || 0).toLocaleString("en-NG");
}

/**
 * Seed initial menu into Firestore if empty
 */
export async function seedMenuToFirestore(): Promise<{ count: number }> {
  try {
    const catsCol = collection(db, "menu_categories");
    const itemsCol = collection(db, "menu_items");

    // Seed categories
    for (const cat of DEFAULT_CATEGORIES) {
      await setDoc(doc(catsCol, cat.id), cat, { merge: true });
    }

    // Seed items
    for (const item of DEFAULT_MENU_ITEMS) {
      await setDoc(doc(itemsCol, item.id), item, { merge: true });
    }

    return { count: DEFAULT_MENU_ITEMS.length };
  } catch (err) {
    console.warn("Firestore seed failed or offline, saving to localStorage:", err);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_CATS_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(DEFAULT_MENU_ITEMS));
    }
    return { count: DEFAULT_MENU_ITEMS.length };
  }
}

/**
 * Real-time listener for Menu Categories
 */
export function subscribeMenuCategories(
  onUpdate: (categories: MenuCategory[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Start with cached/default
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CATS_KEY);
      if (cached) {
        onUpdate(JSON.parse(cached));
      } else {
        onUpdate(DEFAULT_CATEGORIES);
      }
    } catch {
      onUpdate(DEFAULT_CATEGORIES);
    }
  } else {
    onUpdate(DEFAULT_CATEGORIES);
  }

  try {
    const catsRef = collection(db, "menu_categories");
    const q = query(catsRef, orderBy("order", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: MenuCategory[] = [];
          snapshot.forEach((d) => {
            list.push({ ...d.data(), id: d.id } as MenuCategory);
          });
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_CATS_KEY, JSON.stringify(list));
          }
          onUpdate(list);
        } else {
          // If empty in Firestore, trigger background seed and return default
          seedMenuToFirestore().catch(() => {});
          onUpdate(DEFAULT_CATEGORIES);
        }
      },
      (err) => {
        console.warn("Categories real-time snapshot error:", err.message);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Could not attach categories snapshot:", err);
    return () => {};
  }
}

/**
 * Real-time listener for Menu Items
 */
export function subscribeMenuItems(
  onUpdate: (items: MenuItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Immediate initial load from cache or seed for instant first paint
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      if (cached) {
        onUpdate(JSON.parse(cached));
      } else {
        onUpdate(DEFAULT_MENU_ITEMS);
      }
    } catch {
      onUpdate(DEFAULT_MENU_ITEMS);
    }
  } else {
    onUpdate(DEFAULT_MENU_ITEMS);
  }

  try {
    const itemsRef = collection(db, "menu_items");
    const q = query(itemsRef, orderBy("order", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: MenuItem[] = [];
          snapshot.forEach((d) => {
            list.push({ ...d.data(), id: d.id } as MenuItem);
          });
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(list));
          }
          onUpdate(list);
        } else {
          // Empty in Firestore, seed and use default
          seedMenuToFirestore().catch(() => {});
          onUpdate(DEFAULT_MENU_ITEMS);
        }
      },
      (err) => {
        console.warn("Menu items snapshot error:", err.message);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Could not attach items snapshot:", err);
    return () => {};
  }
}

/**
 * Update an individual menu item in Firestore & cache
 */
export async function updateMenuItemInDb(item: MenuItem): Promise<void> {
  try {
    const ref = doc(db, "menu_items", item.id);
    await setDoc(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn("Firestore item update error:", err);
  }

  // Also update local cache so changes are immediate even offline
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      const items: MenuItem[] = cached ? JSON.parse(cached) : [...DEFAULT_MENU_ITEMS];
      const index = items.findIndex((i) => i.id === item.id);
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
    } catch {}
  }
}

/**
 * Toggle Item Stock Availability
 */
export async function toggleItemAvailabilityInDb(itemId: string, isAvailable: boolean): Promise<void> {
  try {
    const ref = doc(db, "menu_items", itemId);
    await updateDoc(ref, { isAvailable, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn("Firestore availability toggle error:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      if (cached) {
        const items: MenuItem[] = JSON.parse(cached);
        const target = items.find((i) => i.id === itemId);
        if (target) {
          target.isAvailable = isAvailable;
          localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
        }
      }
    } catch {}
  }
}

/**
 * Delete a menu item
 */
export async function deleteMenuItemFromDb(itemId: string): Promise<void> {
  try {
    const ref = doc(db, "menu_items", itemId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Firestore delete item error:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      if (cached) {
        const items: MenuItem[] = JSON.parse(cached).filter((i: MenuItem) => i.id !== itemId);
        localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
      }
    } catch {}
  }
}

/**
 * Real-time listener for Orders (Kitchen / Bar live feed)
 */
export function subscribeOrders(
  onUpdate: (orders: QrOrder[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      if (cached) onUpdate(JSON.parse(cached));
    } catch {}
  }

  try {
    const ordersRef = collection(db, "qr_orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: QrOrder[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as QrOrder);
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(list));
        }
        onUpdate(list);
      },
      (err) => {
        console.warn("Orders snapshot error:", err.message);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Could not attach orders snapshot:", err);
    return () => {};
  }
}

/**
 * Place a new guest order
 */
export async function submitGuestOrder(order: Omit<QrOrder, "id" | "createdAt" | "status" | "orderNumber">): Promise<QrOrder> {
  const timestamp = new Date();
  const orderSuffix = Math.floor(1000 + Math.random() * 9000);
  const dateStr = timestamp.toISOString().slice(2, 10).replace(/-/g, "");
  const orderNumber = `BKY-${dateStr}-${orderSuffix}`;
  const id = `ord_${Date.now()}_${orderSuffix}`;

  const newOrder: QrOrder = {
    ...order,
    id,
    orderNumber,
    status: "pending",
    createdAt: timestamp.toISOString(),
  };

  try {
    const ref = doc(db, "qr_orders", id);
    await setDoc(ref, newOrder);
  } catch (err) {
    console.warn("Firestore submit order fallback:", err);
  }

  // Update local orders cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      const orders: QrOrder[] = cached ? JSON.parse(cached) : [];
      orders.unshift(newOrder);
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
    } catch {}
  }

  return newOrder;
}

/**
 * Update Order Status (e.g. pending -> in_progress -> fulfilled)
 */
export async function updateOrderStatusInDb(orderId: string, status: OrderStatus): Promise<void> {
  try {
    const ref = doc(db, "qr_orders", orderId);
    await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn("Firestore update order status error:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      if (cached) {
        const orders: QrOrder[] = JSON.parse(cached);
        const target = orders.find((o) => o.id === orderId);
        if (target) {
          target.status = status;
          localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
        }
      }
    } catch {}
  }
}

/**
 * Real-time listener for a single Order by ID (used for Live Guest Order Tracker)
 */
export function subscribeOrderById(
  orderId: string,
  onUpdate: (order: QrOrder | null) => void
): () => void {
  // Check local cache first
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      if (cached) {
        const orders: QrOrder[] = JSON.parse(cached);
        const found = orders.find((o) => o.id === orderId);
        if (found) onUpdate(found);
      }
    } catch {}
  }

  try {
    const ref = doc(db, "qr_orders", orderId);
    const unsub = onSnapshot(
      ref,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { ...docSnap.data(), id: docSnap.id } as QrOrder;
          onUpdate(data);
        }
      },
      (err) => {
        console.warn("Order by id snapshot error:", err.message);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

const LOCAL_STORAGE_SERVICE_KEY = "banky_qr_service_requests_cache";

/**
 * Submit Call Waiter or Request Bill
 */
export async function submitServiceRequest(
  req: Omit<import("./types").ServiceRequest, "id" | "createdAt" | "status">
): Promise<import("./types").ServiceRequest> {
  const id = `srv_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const fullReq: import("./types").ServiceRequest = {
    ...req,
    id,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  try {
    const ref = doc(db, "service_requests", id);
    await setDoc(ref, fullReq);
  } catch (err) {
    console.warn("Firestore service request error:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SERVICE_KEY);
      const list = cached ? JSON.parse(cached) : [];
      list.unshift(fullReq);
      localStorage.setItem(LOCAL_STORAGE_SERVICE_KEY, JSON.stringify(list));
    } catch {}
  }

  return fullReq;
}

