import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const CART_COLLECTION = "qr_carts";

/**
 * GET /api/qr/cart — Retrieve a guest's server-side cart (or list all carts).
 * Query params: ?guestPhone=<phone> — returns cart for that guest if found.
 * Without query, returns all carts (admin use).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const guestPhone = searchParams.get("guestPhone");
    const tableOrRoom = searchParams.get("location");

    if (guestPhone) {
      // Find cart by guest phone
      const q = query(
        collection(db, CART_COLLECTION),
        where("guestPhone", "==", guestPhone),
        orderBy("updatedAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return NextResponse.json({ ok: true, cart: null });
      }
      const cart = { ...snap.docs[0].data(), id: snap.docs[0].id };
      return NextResponse.json({ ok: true, cart });
    }

    if (tableOrRoom) {
      // Find cart by table/room location
      const q = query(
        collection(db, CART_COLLECTION),
        where("location", "==", tableOrRoom),
        orderBy("updatedAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return NextResponse.json({ ok: true, cart: null });
      }
      const cart = { ...snap.docs[0].data(), id: snap.docs[0].id };
      return NextResponse.json({ ok: true, cart });
    }

    // Admin: list all carts
    const allQ = query(collection(db, CART_COLLECTION), orderBy("updatedAt", "desc"));
    const allSnap = await getDocs(allQ);
    const carts = allSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
    return NextResponse.json({ ok: true, carts });
  } catch (err) {
    console.error("GET /api/qr/cart error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch cart(s)" }, { status: 500 });
  }
}

/**
 * POST /api/qr/cart — Create or update a guest cart server-side.
 * Body: { location, locationType, guestName?, guestPhone?, items: [{ itemId, quantity, notes?, unitPrice? }], totalAmount, totalItems }
 * This provides server-side cart persistence (softenrj/qr-menu pattern) so carts
 * survive page reloads and can be resumed from any device.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      location,
      locationType = "table",
      guestName,
      guestPhone,
      items,
      totalAmount,
      totalItems,
      cartId,
    } = body;

    if (!location || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: location, items" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const docId = cartId || `cart_${location.replace(/\s+/g, "_")}_${Date.now()}`;

    const cartData = {
      location,
      locationType,
      guestName,
      guestPhone,
      items: items.map((item: { itemId: string; quantity: number; notes?: string; unitPrice?: number }) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        notes: item.notes,
        unitPrice: item.unitPrice,
        addedAt: now,
      })),
      totalAmount: totalAmount || 0,
      totalItems: totalItems || items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0),
      createdAt: cartId ? (await getDoc(doc(db, CART_COLLECTION, cartId)).then((d) => d.data()?.createdAt || now)) : now,
      updatedAt: now,
      lastModifiedBy: "guest",
    };

    await setDoc(doc(db, CART_COLLECTION, docId), cartData, { merge: true });

    const saved = { ...cartData, id: docId };
    return NextResponse.json({ ok: true, cart: saved });
  } catch (err) {
    console.error("POST /api/qr/cart error:", err);
    return NextResponse.json({ ok: false, error: "Failed to save cart" }, { status: 500 });
  }
}

/**
 * DELETE /api/qr/cart — Clear a cart (after order placement or guest request).
 * Body: { cartId } or { guestPhone } or { location }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartId, guestPhone, location } = body;

    let targetId: string | null = null;

    if (cartId) {
      targetId = cartId;
    } else if (guestPhone) {
      const q = query(
        collection(db, CART_COLLECTION),
        where("guestPhone", "==", guestPhone),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) targetId = snap.docs[0].id;
    } else if (location) {
      const q = query(
        collection(db, CART_COLLECTION),
        where("location", "==", location),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) targetId = snap.docs[0].id;
    }

    if (targetId) {
      await deleteDoc(doc(db, CART_COLLECTION, targetId));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/qr/cart error:", err);
    return NextResponse.json({ ok: false, error: "Failed to clear cart" }, { status: 500 });
  }
}
