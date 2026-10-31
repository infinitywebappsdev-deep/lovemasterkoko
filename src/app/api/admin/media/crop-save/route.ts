import { NextRequest, NextResponse } from "next/server";

import path from "path";

import { requireStaff, jsonError } from "@/lib/booking/auth";
import { writeMedia } from "@/lib/media/store";

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const contentType = req.headers.get("content-type") || "";

    let fileName = "";
    let roomSlug = "";
    let buffer: Uint8Array | null = null;
    let mimeType: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      fileName = (formData.get("fileName") as string) || "";
      roomSlug = (formData.get("roomSlug") as string) || "";

      if (!file) {
        return NextResponse.json({ ok: false, message: "No file provided" }, { status: 400 });
      }

      if (!fileName) {
        fileName = file.name || `cropped-${Date.now()}.jpg`;
      }

      buffer = new Uint8Array(await file.arrayBuffer());
      mimeType = file.type && file.type.startsWith("image/") ? file.type : undefined;
    } else {
      const json = await req.json();
      fileName = json.fileName;
      roomSlug = json.roomSlug || "";
      const base64Data: string = json.imageData;

      if (!base64Data) {
        return NextResponse.json({ ok: false, message: "No image data provided" }, { status: 400 });
      }

      // Strip data:image/...;base64, prefix if present
      const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const binary = Buffer.from(base64Clean, "base64");
      buffer = new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength);
    }

    // Sanitize fileName
    fileName = path.basename(fileName || "").trim();
    if (!fileName) {
      return NextResponse.json({ ok: false, message: "No file provided" }, { status: 400 });
    }
    if (!path.extname(fileName)) {
      fileName += ".jpg";
    }

    await writeMedia("images", fileName, buffer, mimeType);

    // If a roomSlug is specified, also write standard mappings so it shows up immediately in the room
    const aliases: Record<string, string[]> = {
      deluxe: ["deluxe.jpg", "DELUXE MAIN1.jpeg"],
      executive: ["executive.jpg", "EXECUTIVE Main.jpeg"],
      "standard-plus": ["Standard PLUS.jpeg", "Standard Plus.jpg"],
      standard: ["Standard room.jpg", "standard.jpg"],
      luxury: ["Presidential.jpg"],
      "presidential-suite": ["Presidential.jpg"],
      "luxury-suite": ["signature suite room.jpg"],
      "signature-suite": ["signature suite room.jpg"],
    };

    for (const alias of aliases[roomSlug] || []) {
      if (alias === fileName) continue;
      await writeMedia("images", alias, buffer, mimeType);
    }

    return NextResponse.json({
      ok: true,
      fileName,
      url: `/media/images/${encodeURIComponent(fileName)}`,
      message: `Successfully cropped and saved ${fileName} (16:10 standard aspect ratio).`,
    });
  } catch (err: any) {
    console.error("Crop save error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to save cropped image" },
      { status: 500 }
    );
  }
}
