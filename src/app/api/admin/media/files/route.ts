import { NextResponse } from "next/server";
import path from "path";
import { ROOMS } from "@/lib/hotel";
import { listMedia } from "@/lib/media/store";
import { getRoomTypes } from "@/lib/booking/engine";
import type { RoomType } from "@/lib/booking/types";
import { requireStaff, jsonError } from "@/lib/booking/auth";

export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);
  try {
    const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
    const mediaEntries = (await listMedia("images")).filter((entry) =>
      imageExtensions.has(path.extname(entry.name).toLowerCase())
    );

    // 1. Fetch room configurations from Firestore database (falling back to default room types and hotel catalog)
    let dbRoomTypes: RoomType[] = [];
    try {
      dbRoomTypes = await getRoomTypes();
    } catch (e) {
      console.warn("Could not query room_types from Firestore, falling back to static catalog:", e);
    }

    // Combine database room configs and static catalog to ensure comprehensive detection
    const roomConfigs = [...(dbRoomTypes || []), ...ROOMS];

    // Build a map of referenced image paths
    // Normalize: strip leading "/images/" or "images/" and compare filenames case-insensitively
    const referencedMap = new Map<string, string[]>(); // normalizedFilename -> roomNames[]

    const recordRef = (imgUrl: string | undefined, roomName: string) => {
      if (!imgUrl || typeof imgUrl !== "string") return;
      const clean = path.basename(imgUrl).trim().toLowerCase();
      if (!clean) return;
      const existing = referencedMap.get(clean) || [];
      if (!existing.includes(roomName)) {
        existing.push(roomName);
      }
      referencedMap.set(clean, existing);
    };

    for (const room of roomConfigs) {
      const roomTitle = room.name || room.slug;
      if (room.image) recordRef(room.image, roomTitle);
      if (Array.isArray(room.images)) {
        for (const img of room.images) {
          recordRef(img, roomTitle);
        }
      }
    }

    // Brand and site core assets that are not rooms
    const isBrandOrSiteAsset = (filename: string) => {
      const upper = filename.toUpperCase();
      return (
        upper.includes("LOGO") ||
        upper.includes("BANKY") ||
        upper.includes("HERO") ||
        upper.includes("RECEPTION") ||
        upper.includes("DINING") ||
        upper.includes("RESTAURANT") ||
        upper.includes("BAR") ||
        upper.includes("LOUNGE") ||
        upper.includes("GARDEN") ||
        upper.includes("HALL") ||
        upper.includes("LOBBY") ||
        upper.includes("CORRIDOR")
      );
    };

    const filesList = [];
    let totalBytes = 0;
    let referencedCount = 0;
    let orphanedCount = 0;
    let orphanedBytes = 0;

    for (const entry of mediaEntries) {
      totalBytes += entry.size;

      const normName = entry.name.trim().toLowerCase();
      const referencedRooms = referencedMap.get(normName) || [];
      const isReferencedInRooms = referencedRooms.length > 0;
      const isBrand = isBrandOrSiteAsset(entry.name);

      if (isReferencedInRooms) {
        referencedCount++;
      } else {
        orphanedCount++;
        orphanedBytes += entry.size;
      }

      filesList.push({
        name: entry.name,
        size: entry.size,
        mtime: new Date(entry.mtime).toISOString(),
        url:
          entry.source === "static"
            ? `/images/${encodeURIComponent(entry.name)}`
            : `/media/images/${encodeURIComponent(entry.name)}`,
        isReferencedInRooms,
        referencedRooms,
        isBrand,
        category: isReferencedInRooms ? "room" : isBrand ? "brand" : "orphaned",
      });
    }

    // Sort by default newest first
    filesList.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

    return NextResponse.json({
      ok: true,
      files: filesList,
      auditSummary: {
        totalFiles: filesList.length,
        totalBytes,
        referencedFilesCount: referencedCount,
        orphanedFilesCount: orphanedCount,
        orphanedBytes,
        roomConfigsCount: roomConfigs.length,
        scannedAt: new Date().toISOString(),
      },
      availableRoomSlugs: ROOMS.map((r) => ({ slug: r.slug, name: r.name })),
    });
  } catch (error: any) {
    console.error("Error reading media files:", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Failed to scan media files" },
      { status: 500 }
    );
  }
}
