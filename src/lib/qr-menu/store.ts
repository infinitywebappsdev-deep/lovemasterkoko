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

/** Sound notification for kitchen/bar orders using Web Audio API */
export function playOrderChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

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

    playTone(659.25, now, 0.4);
    playTone(830.61, now + 0.15, 0.5);
    playTone(987.77, now + 0.35, 0.7);
  } catch {}
}

/** Format Nigerian Naira currency */
export function formatNaira(amount: number): string {
  return "₦" + Number(amount || 0).toLocaleString("en-NG");
}

/** Seed initial menu into Firestore if empty */
export async function seedMenuToFirestore(): Promise<{ count: number }> {
  try {
    const catsCol = collection(db, "menu_categories");
    const itemsCol = collection(db, "menu_items");

    for (const cat of DEFAULT_CATEGORIES) {
      await setDoc(doc(catsCol, cat.id), cat, { merge: true });
    }
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

/** Real-time listener for Menu Categories */
export function subscribeMenuCategories(
  onUpdate: (categories: MenuCategory[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CATS_KEY);
      if (cached) onUpdate(JSON.parse(cached));
      else onUpdate(DEFAULT_CATEGORIES);
    } catch { onUpdate(DEFAULT_CATEGORIES); }
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
          snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as MenuCategory));
          if (typeof window !== "undefined") localStorage.setItem(LOCAL_STORAGE_CATS_KEY, JSON.stringify(list));
          onUpdate(list);
        } else {
          seedMenuToFirestore().catch(() => {});
          onUpdate(DEFAULT_CATEGORIES);
        }
      },
      (err) => { console.warn("Categories snapshot error:", err.message); if (onError) onError(err); }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

/** Real-time listener for Menu Items */
export function subscribeMenuItems(
  onUpdate: (items: MenuItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      if (cached) onUpdate(JSON.parse(cached));
      else onUpdate(DEFAULT_MENU_ITEMS);
    } catch { onUpdate(DEFAULT_MENU_ITEMS); }
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
          snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as MenuItem));
          if (typeof window !== "undefined") localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(list));
          onUpdate(list);
        } else {
          seedMenuToFirestore().catch(() => {});
          onUpdate(DEFAULT_MENU_ITEMS);
        }
      },
      (err) => { console.warn("Menu items snapshot error:", err.message); if (onError) onError(err); }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

/** Update a Menu Category in Firestore & cache with cascade rename */
export async function updateMenuCategoryInDb(
  category: MenuCategory,
  previousName?: string
): Promise<void> {
  try {
    const ref = doc(db, "menu_categories", category.id);
    await setDoc(ref, category, { merge: true });
    if (previousName && previousName !== category.name) {
      const itemsCol = collection(db, "menu_items");
      const itemsSnap = await getDocs(itemsCol);
      const updates: Promise<unknown>[] = [];
      itemsSnap.forEach((itemDoc) => {
        const data = itemDoc.data() as MenuItem;
        if (data.categoryId === category.id) {
          updates.push(updateDoc(doc(db, "menu_items", itemDoc.id), {
            categoryName: category.name,
            updatedAt: new Date().toISOString(),
          }));
        }
      });
      await Promise.all(updates);
    }
  } catch (err) { console.warn("Firestore category update error:", err); }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CATS_KEY);
      const cats: MenuCategory[] = cached ? JSON.parse(cached) : [...DEFAULT_CATEGORIES];
      const index = cats.findIndex((c) => c.id === category.id);
      if (index >= 0) cats[index] = category;
      else cats.push(category);
      cats.sort((a, b) => (a.order || 0) - (b.order || 0));
      localStorage.setItem(LOCAL_STORAGE_CATS_KEY, JSON.stringify(cats));
      if (previousName && previousName !== category.name) {
        const cachedItems = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
        if (cachedItems) {
          const items: MenuItem[] = JSON.parse(cachedItems);
          let changed = false;
          items.forEach((it) => { if (it.categoryId === category.id) { it.categoryName = category.name; changed = true; } });
          if (changed) localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
        }
      }
    } catch {}
  }
}

/** Delete a menu category */
export async function deleteMenuCategoryFromDb(categoryId: string): Promise<void> {
  try { await deleteDoc(doc(db, "menu_categories", categoryId)); } catch (err) { console.warn("Firestore delete category error:", err); }
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CATS_KEY);
      if (cached) localStorage.setItem(LOCAL_STORAGE_CATS_KEY, JSON.stringify(JSON.parse(cached).filter((c: MenuCategory) => c.id !== categoryId)));
    } catch {}
  }
}

/** Update a menu item in Firestore & cache */
export async function updateMenuItemInDb(item: MenuItem): Promise<void> {
  try { await setDoc(doc(db, "menu_items", item.id), { ...item, updatedAt: new Date().toISOString() }, { merge: true }); } catch (err) { console.warn("Firestore item update error:", err); }
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      const items: MenuItem[] = cached ? JSON.parse(cached) : [...DEFAULT_MENU_ITEMS];
      const index = items.findIndex((i) => i.id === item.id);
      if (index >= 0) items[index] = item; else items.push(item);
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
    } catch {}
  }
}

/** Toggle item stock availability */
export async function toggleItemAvailabilityInDb(itemId: string, isAvailable: boolean): Promise<void> {
  try { await updateDoc(doc(db, "menu_items", itemId), { isAvailable, updatedAt: new Date().toISOString() }); } catch (err) { console.warn("Firestore availability toggle error:", err); }
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      if (cached) {
        const items: MenuItem[] = JSON.parse(cached);
        const target = items.find((i) => i.id === itemId);
        if (target) { target.isAvailable = isAvailable; localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items)); }
      }
    } catch {}
  }
}

/** Delete a menu item */
export async function deleteMenuItemFromDb(itemId: string): Promise<void> {
  try { await deleteDoc(doc(db, "menu_items", itemId)); } catch (err) { console.warn("Firestore delete item error:", err); }
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      if (cached) localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(JSON.parse(cached).filter((i: MenuItem) => i.id !== itemId)));
    } catch {}
  }
}

/** Real-time listener for Orders (Kitchen / Bar live feed) */
export function subscribeOrders(
  onUpdate: (orders: QrOrder[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (typeof window !== "undefined") {
    try { const cached = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY); if (cached) onUpdate(JSON.parse(cached)); } catch {}
  }
  try {
    const ordersRef = collection(db, "qr_orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: QrOrder[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as QrOrder));
        if (typeof window !== "undefined") localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(list));
        onUpdate(list);
      },
      (err) => { console.warn("Orders snapshot error:", err.message); if (onError) onError(err); }
    );
    return unsubscribe;
  } catch { return () => {}; }
}

/**
 * Generate a unique order number (BKY-YYMMDD-XXXX)
 */
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `BKY-${dateStr}-${suffix}`;
}

/**
 * Generate a unique order ID
 */
function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Convert a MenuItem to an OrderedItemSnapshot — captures price and details
 * at the moment of ordering so menu price changes never alter existing orders.
 * This is the FoodApp-style price-snapshot pattern.
 */
export function snapshotOrderItem(
  item: MenuItem,
  quantity: number,
  notes?: string
): { id: string; title: string; categoryName: string; priceAtOrder: number; quantity: number; subtotal: number; notes?: string } {
  const unitPrice = item.price;
  const subtotal = unitPrice * quantity;
  return {
    id: item.id,
    title: item.title,
    categoryName: item.categoryName,
    priceAtOrder: unitPrice,
    quantity,
    subtotal,
    notes,
  };
}

/**
 * Place a new guest order with price snapshots.
 * The submitted `items` array should contain the raw { id, quantity, notes }
 * for each line; we look up the current MenuItem price and snapshot it.
 */
export async function submitGuestOrder(
  order: {
    roomOrTable: string;
    orderType: "room" | "table" | "poolside_garden";
    guestName?: string;
    guestPhone?: string;
    specialInstructions?: string;
    items: { id: string; quantity: number; notes?: string }[];
    totalAmount: number;
    totalItems: number;
  }
): Promise<QrOrder> {
  const timestamp = new Date();
  const orderNumber = generateOrderNumber();
  const id = generateOrderId();

  // Fetch current menu items to snapshot their prices
  const SnapshotItem = {
    id: "" as string,
    title: "" as string,
    categoryName: "" as string,
    priceAtOrder: 0 as number,
    quantity: 0 as number,
    subtotal: 0 as number,
    notes: undefined as string | undefined,
  };
  let itemSnapshots: { id: string; title: string; categoryName: string; priceAtOrder: number; quantity: number; subtotal: number; notes?: string }[] = [];
  try {
    const itemsSnap = await getDocs(collection(db, "menu_items"));
    const itemsMap = new Map(itemsSnap.docs.map((d) => [d.id, d.data() as MenuItem]));
    itemSnapshots = order.items.map((line) => {
      const menuItem = itemsMap.get(line.id);
      if (menuItem) {
        return snapshotOrderItem(menuItem, line.quantity, line.notes);
      }
      // Fallback: item not found in Firestore
      return {
        id: line.id,
        title: "Unknown Item",
        categoryName: "General",
        priceAtOrder: 0,
        quantity: line.quantity,
        subtotal: 0,
        notes: line.notes,
      };
    });
  } catch {
    // Offline fallback: trust the caller's totalAmount, items stored without price snapshot
    itemSnapshots = order.items.map((line) => ({
      id: line.id,
      title: "Item",
      categoryName: "General",
      priceAtOrder: 0,
      quantity: line.quantity,
      subtotal: 0,
      notes: line.notes,
    }));
  }

  const newOrder: QrOrder = {
    id,
    orderNumber,
    roomOrTable: order.roomOrTable,
    orderType: order.orderType,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    specialInstructions: order.specialInstructions,
    items: itemSnapshots,
    totalAmount: order.totalAmount,
    totalItems: order.totalItems,
    status: "pending",
    createdAt: timestamp.toISOString(),
  };

  try {
    await setDoc(doc(db, "qr_orders", id), newOrder);
  } catch (err) {
    console.warn("Firestore submit order error:", err);
  }

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
 * Update Order Status with time tracking.
 * - When moving to "in_progress", records kitchenStartedAt
 * - When moving to "fulfilled", records fulfilledAt
 * - When moving to "cancelled", no time tracking
 */
export async function updateOrderStatusInDb(orderId: string, status: OrderStatus): Promise<void> {
  const updates: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };

  if (status === "in_progress") {
    updates.kitchenStartedAt = new Date().toISOString();
  } else if (status === "fulfilled") {
    updates.fulfilledAt = new Date().toISOString();
  }

  try {
    await updateDoc(doc(db, "qr_orders", orderId), updates);
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
          if (status === "in_progress") target.kitchenStartedAt = new Date().toISOString();
          if (status === "fulfilled") target.fulfilledAt = new Date().toISOString();
          target.updatedAt = new Date().toISOString();
          localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
        }
      }
    } catch {}
  }
}

/** Real-time listener for a single Order by ID */
export function subscribeOrderById(
  orderId: string,
  onUpdate: (order: QrOrder | null) => void
): () => void {
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
        if (docSnap.exists()) onUpdate({ ...docSnap.data(), id: docSnap.id } as QrOrder);
      },
      (err) => console.warn("Order by id snapshot error:", err.message)
    );
    return unsub;
  } catch { return () => {}; }
}

/**
 * Get order history with optional filters — for kitchen sales reports.
 * Returns orders sorted newest-first with summary counts.
 */
export async function getOrderHistory(
  options?: {
    status?: OrderStatus;
    roomOrTable?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<{ orders: QrOrder[]; summary: OrderReportSummary }> {
  try {
    let q = query(collection(db, "qr_orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    let orders: QrOrder[] = [];
    snapshot.forEach((d) => {
      orders.push({ ...d.data(), id: d.id } as QrOrder);
    });

    // Apply filters
    if (options?.status) {
      orders = orders.filter((o) => o.status === options.status);
    }
    if (options?.roomOrTable) {
      orders = orders.filter((o) => o.roomOrTable === options.roomOrTable);
    }
    if (options?.startDate) {
      const start = new Date(options.startDate).toISOString();
      orders = orders.filter((o) => o.createdAt >= start);
    }
    if (options?.endDate) {
      const end = new Date(options.endDate).toISOString();
      orders = orders.filter((o) => o.createdAt <= end);
    }
    if (options?.limit) {
      orders = orders.slice(0, options.limit);
    }

    // Build summary
    const summary: OrderReportSummary = {
      totalOrders: orders.length,
      totalRevenue: 0,
      pendingCount: 0,
      inProgressCount: 0,
      fulfilledCount: 0,
      cancelledCount: 0,
      byStatus: {},
      topItems: [],
    };

    const statusBuckets: Record<string, { count: number; revenue: number }> = {};
    const itemSales: Record<string, { title: string; quantity: number; revenue: number }> = {};

    for (const order of orders) {
      const status = order.status;
      summary.totalRevenue += order.totalAmount;
      if (!statusBuckets[status]) statusBuckets[status] = { count: 0, revenue: 0 };
      statusBuckets[status].count++;
      statusBuckets[status].revenue += order.totalAmount;

      if (status === "pending") summary.pendingCount++;
      else if (status === "in_progress") summary.inProgressCount++;
      else if (status === "fulfilled") summary.fulfilledCount++;
      else if (status === "cancelled") summary.cancelledCount++;

      for (const item of order.items) {
        if (!itemSales[item.id]) {
          itemSales[item.id] = { title: item.title, quantity: 0, revenue: 0 };
        }
        itemSales[item.id].quantity += item.quantity;
        itemSales[item.id].revenue += item.subtotal;
      }
    }

    summary.byStatus = statusBuckets;
    summary.topItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return { orders, summary };
  } catch (err) {
    console.warn("getOrderHistory error:", err);
    return { orders: [], summary: { totalOrders: 0, totalRevenue: 0, pendingCount: 0, inProgressCount: 0, fulfilledCount: 0, cancelledCount: 0, byStatus: {}, topItems: [] } };
  }
}

/** Summary report for kitchen sales dashboard */
export interface OrderReportSummary {
  totalOrders: number;
  totalRevenue: number;
  pendingCount: number;
  inProgressCount: number;
  fulfilledCount: number;
  cancelledCount: number;
  byStatus: Record<string, { count: number; revenue: number }>;
  topItems: { title: string; quantity: number; revenue: number }[];
}

/**
 * Get real-time order statistics for the kitchen dashboard header.
 * Returns live counts that update as orders change status.
 */
export function subscribeOrderStats(
  onUpdate: (stats: KitchenStats) => void
): () => void {
  if (typeof window !== "undefined") {
    onUpdate({ totalOrders: 0, pending: 0, inProgress: 0, fulfilled: 0, totalRevenue: 0, ordersToday: 0 });
  }

  try {
    const ordersRef = collection(db, "qr_orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orders: QrOrder[] = [];
        snapshot.forEach((d) => orders.push({ ...d.data(), id: d.id } as QrOrder));

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        let pending = 0, inProgress = 0, fulfilled = 0, totalRevenue = 0, ordersToday = 0;
        for (const o of orders) {
          if (o.status === "pending") pending++;
          else if (o.status === "in_progress") inProgress++;
          else if (o.status === "fulfilled") fulfilled++;
          totalRevenue += o.totalAmount;
          if (o.createdAt >= todayStr) ordersToday++;
        }

        onUpdate({
          totalOrders: orders.length,
          pending,
          inProgress,
          fulfilled,
          totalRevenue,
          ordersToday,
        });
      },
      (err) => console.warn("Order stats snapshot error:", err.message)
    );
    return unsubscribe;
  } catch { return () => {}; }
}

export interface KitchenStats {
  totalOrders: number;
  pending: number;
  inProgress: number;
  fulfilled: number;
  totalRevenue: number;
  ordersToday: number;
}

const LOCAL_STORAGE_SERVICE_KEY = "banky_qr_service_requests_cache";

/** Submit Call Waiter or Request Bill */
export async function submitServiceRequest(
  req: Omit<import("./types").ServiceRequest, "id" | "createdAt" | "status">
): Promise<import("./types").ServiceRequest> {
  const id = `srv_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const fullReq: import("./types").ServiceRequest = { ...req, id, status: "pending", createdAt: new Date().toISOString() };
  try { await setDoc(doc(db, "service_requests", id), fullReq); } catch (err) { console.warn("Firestore service request error:", err); }
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
