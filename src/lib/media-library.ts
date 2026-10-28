"use client";

/**
 * Media ↔ content registration layer.
 *
 * Uploading a file only writes it into `public/` — that alone never makes it
 * appear on the site, and deleting a file alone never removes it from the
 * pages that reference it. These helpers record *where* each asset is used in
 * Firestore (`rooms` + `room_types`), which is what the public site reads
 * live via `subscribeRooms()`.
 *
 * They run in the authenticated admin browser session, so Firestore's
 * `allow write: if isStaff()` rule is satisfied.
 */
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

const CONTENT_COLLECTIONS = ["rooms", "room_types"] as const;

/** `/images/x.jpg`, `images/x.jpg` or `x.jpg` → `x.jpg` (lowercase) */
export function mediaFileKey(value: string): string {
  if (!value) return "";
  let v = value.trim();
  try {
    v = decodeURIComponent(v);
  } catch {
    /* keep raw if it is not encoded */
  }
  const [file] = v.split("?");
  return (file.split("/").pop() || file).toLowerCase();
}

function toImageUrl(value: string): string {
  const v = value.trim();
  if (v.startsWith("/") || v.startsWith("http")) return v;
  return `/images/${encodeURIComponent(v)}`;
}

/**
 * Attach freshly uploaded image URLs to a room so the public site shows them.
 * Updates `image` (primary slot) only when the room has none yet.
 */
export async function registerImagesForRoom(
  slug: string,
  urls: string[]
): Promise<number> {
  if (!slug || !urls?.length) return 0;
  const cleanUrls = urls.filter(Boolean).map(toImageUrl);
  let updated = 0;

  for (const col of CONTENT_COLLECTIONS) {
    try {
      const ref = doc(db, col, slug);
      const snap = await getDoc(ref);
      if (!snap.exists()) continue; // never invent a document (rate/qty live here)

      const data = snap.data() || {};
      const existing: string[] = Array.isArray(data.images) ? data.images : [];
      const merged = [...existing];

      for (const url of cleanUrls) {
        const key = mediaFileKey(url);
        if (!merged.some((img) => mediaFileKey(img) === key)) merged.push(url);
      }

      const patch: Record<string, unknown> = { images: merged };
      if (!data.image && merged.length > 0) patch.image = merged[0];

      if (JSON.stringify(existing) === JSON.stringify(merged) && data.image) {
        continue;
      }
      await setDoc(ref, patch, { merge: true });
      updated++;
    } catch (err) {
      console.warn(`Could not register media to ${col}/${slug}:`, err);
    }
  }

  return updated;
}

/** Record a room video header URL on the room documents. */
export async function registerVideoForRoom(
  slug: string,
  url: string
): Promise<void> {
  if (!slug || !url) return;
  for (const col of CONTENT_COLLECTIONS) {
    try {
      const ref = doc(db, col, slug);
      if (!(await getDoc(ref)).exists()) continue;
      await setDoc(ref, { video: url }, { merge: true });
    } catch (err) {
      console.warn(`Could not register video to ${col}/${slug}:`, err);
    }
  }
}

/**
 * Keep room references valid across a file rename: any room document pointing
 * at the old filename is rewritten to the new one (same directory, same
 * spelling style), so renaming a photo never breaks or re-routes a room's
 * gallery.
 */
export async function renameMediaReference(
  oldName: string,
  newName: string
): Promise<number> {
  const oldKey = mediaFileKey(oldName);
  const cleanNew = (newName.split("/").pop() || "").trim();
  if (!oldKey || !cleanNew || oldKey === cleanNew.toLowerCase()) return 0;

  // Preserve the stored path style (prefix + raw filename, as room docs use it).
  const rewrite = (value: string): string | null => {
    if (mediaFileKey(value) !== oldKey) return null;
    const slash = value.lastIndexOf("/");
    return slash >= 0 ? `${value.slice(0, slash + 1)}${cleanNew}` : cleanNew;
  };

  let updated = 0;
  for (const col of CONTENT_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, col));
      for (const docSnap of snap.docs) {
        const data = docSnap.data() || {};
        const patch: Record<string, unknown> = {};

        const images: string[] = Array.isArray(data.images) ? data.images : [];
        const nextImages = images.map((v) => rewrite(v) ?? v);
        if (JSON.stringify(nextImages) !== JSON.stringify(images)) {
          patch.images = nextImages;
        }
        if (typeof data.image === "string") {
          const img = rewrite(data.image);
          if (img) patch.image = img;
        }
        if (typeof data.video === "string") {
          const vid = rewrite(data.video);
          if (vid) patch.video = vid;
        }

        if (Object.keys(patch).length === 0) continue;
        await setDoc(doc(db, col, docSnap.id), patch, { merge: true });
        updated++;
      }
    } catch (err) {
      console.warn(`Could not rewrite references for ${oldKey} in ${col}:`, err);
    }
  }
  return updated;
}

/**
 * Remove every reference to a deleted file from all room documents so the
 * public site stops serving a 404 for it. Returns how many docs were touched.
 */
export async function deregisterMediaFile(filenameOrUrl: string): Promise<number> {
  const key = mediaFileKey(filenameOrUrl);
  if (!key) return 0;
  let updated = 0;

  for (const col of CONTENT_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, col));
      for (const docSnap of snap.docs) {
        const data = docSnap.data() || {};
        const images: string[] = Array.isArray(data.images) ? data.images : [];
        const remaining = images.filter((img) => mediaFileKey(img) !== key);

        const primaryIsTarget = data.image ? mediaFileKey(data.image) === key : false;
        const imagesChanged = remaining.length !== images.length;
        const videoIsTarget = data.video ? mediaFileKey(data.video) === key : false;

        if (!imagesChanged && !primaryIsTarget && !videoIsTarget) continue;

        const patch: Record<string, unknown> = {};
        if (imagesChanged) patch.images = remaining;
        if (primaryIsTarget) patch.image = remaining[0] || "";
        if (videoIsTarget) patch.video = "";

        await setDoc(doc(db, col, docSnap.id), patch, { merge: true });
        updated++;
      }
    } catch (err) {
      console.warn(`Could not deregister ${key} from ${col}:`, err);
    }
  }

  return updated;
}