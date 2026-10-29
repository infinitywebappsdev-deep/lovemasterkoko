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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QrCodeEntity, CreateQrCodeInput } from "./qr-entity";
import { buildTableQrUrl, generateTableQrDataUrl } from "./qr-generator";

const QR_COLLECTION = "qr_codes";

/**
 * Generate a new QR code entity and persist it to Firestore.
 * Generates the target URL and QR image at creation time.
 */
export async function createQrCode(
  input: CreateQrCodeInput
): Promise<QrCodeEntity> {
  const id = `qr_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  // Build the target URL that guests will land on when scanning
  const targetUrl = buildTableQrUrl(input.location, input.locationType);

  // Generate the QR image as base64
  let qrImageBase64: string | undefined;
  try {
    qrImageBase64 = await generateTableQrDataUrl(
      input.location,
      input.locationType,
      300
    );
  } catch (err) {
    console.warn("Failed to generate QR image:", err);
  }

  const entity: QrCodeEntity = {
    id,
    label: input.label,
    locationType: input.locationType,
    location: input.location,
    targetUrl,
    qrImageBase64,
    areaDescription: input.areaDescription,
    isActive: true,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, QR_COLLECTION, id), entity);
  return entity;
}

/**
 * Get all QR codes, optionally filtered by active status.
 */
export async function getQrCodes(
  options?: { isActive?: boolean; locationType?: string }
): Promise<QrCodeEntity[]> {
  try {
    let q = query(
      collection(db, QR_COLLECTION),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    let results: QrCodeEntity[] = [];
    snapshot.forEach((d) => {
      results.push({ ...d.data(), id: d.id } as QrCodeEntity);
    });

    if (options?.isActive !== undefined) {
      results = results.filter((r) => r.isActive === options.isActive);
    }
    if (options?.locationType) {
      results = results.filter((r) => r.locationType === options.locationType);
    }

    return results;
  } catch (err) {
    console.warn("getQrCodes error:", err);
    return [];
  }
}

/**
 * Get a single QR code by ID.
 */
export async function getQrCodeById(id: string): Promise<QrCodeEntity | null> {
  try {
    const ref = doc(db, QR_COLLECTION, id);
    const singleSnap = await getDoc(ref);
    if (singleSnap.exists()) {
      return { ...singleSnap.data(), id: singleSnap.id } as QrCodeEntity;
    }
    return null;
  } catch (err) {
    console.warn("getQrCodeById error:", err);
    return null;
  }
}

/**
 * Update a QR code entity.
 */
export async function updateQrCode(
  id: string,
  updates: Partial<Omit<QrCodeEntity, "id" | "createdAt">>
): Promise<QrCodeEntity | null> {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: now,
  };

  // If location or locationType changed, regenerate the target URL
  if (updates.location || updates.locationType) {
    const existing = await getQrCodeById(id);
    if (existing) {
      updateData.targetUrl = buildTableQrUrl(
        updates.location || existing.location,
        updates.locationType || existing.locationType
      );
      // Regenerate QR image
      try {
        updateData.qrImageBase64 = await generateTableQrDataUrl(
          updates.location || existing.location,
          updates.locationType || existing.locationType,
          300
        );
      } catch (err) {
        console.warn("Failed to regenerate QR image on update:", err);
      }
    }
  }

  await updateDoc(doc(db, QR_COLLECTION, id), updateData);

  // Return the updated entity
  const updated = await getQrCodeById(id);
  return updated;
}

/**
 * Delete a QR code (soft delete: set isActive to false).
 */
export async function deleteQrCode(id: string): Promise<void> {
  await updateDoc(doc(db, QR_COLLECTION, id), {
    isActive: false,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Regenerate the QR image for an existing QR code (e.g., after URL change).
 */
export async function regenerateQrImage(id: string): Promise<boolean> {
  const entity = await getQrCodeById(id);
  if (!entity) return false;

  try {
    const qrImageBase64 = await generateTableQrDataUrl(
      entity.location,
      entity.locationType,
      300
    );
    await updateDoc(doc(db, QR_COLLECTION, id), {
      qrImageBase64,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn("Failed to regenerate QR image:", err);
    return false;
  }
}

/**
 * Get QR code statistics/summary.
 */
export async function getQrCodeStats(): Promise<{
  total: number;
  active: number;
  byType: Record<string, number>;
  totalOrdersFromQr: number;
}> {
  try {
    const qrCodes = await getQrCodes();
    const ordersCol = collection(db, "qr_orders");
    const ordersSnap = await getDocs(ordersCol);

    const byType: Record<string, number> = {};
    let activeCount = 0;

    for (const qr of qrCodes) {
      byType[qr.locationType] = (byType[qr.locationType] || 0) + 1;
      if (qr.isActive) activeCount++;
    }

    return {
      total: qrCodes.length,
      active: activeCount,
      byType,
      totalOrdersFromQr: ordersSnap.size,
    };
  } catch (err) {
    console.warn("getQrCodeStats error:", err);
    return { total: 0, active: 0, byType: {}, totalOrdersFromQr: 0 };
  }
}
