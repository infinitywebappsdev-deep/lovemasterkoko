import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const imagesDir = path.join(process.cwd(), "public", "images");
    await fs.mkdir(imagesDir, { recursive: true });

    let fileName = "";
    let roomSlug = "";
    let buffer: Buffer | null = null;

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

      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      const json = await req.json();
      fileName = json.fileName;
      roomSlug = json.roomSlug || "";
      const base64Data = json.imageData;

      if (!base64Data) {
        return NextResponse.json({ ok: false, message: "No image data provided" }, { status: 400 });
      }

      // Strip data:image/...;base64, prefix if present
      const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(base64Clean, "base64");
    }

    // Sanitize fileName
    fileName = path.basename(fileName).trim();
    if (!path.extname(fileName)) {
      fileName += ".jpg";
    }

    const targetPath = path.join(imagesDir, fileName);
    await fs.writeFile(targetPath, buffer);

    // If a roomSlug is specified, also write standard mappings so it shows up immediately in the room
    if (roomSlug) {
      if (roomSlug === "deluxe") {
        await fs.writeFile(path.join(imagesDir, "deluxe.jpg"), buffer);
        await fs.writeFile(path.join(imagesDir, "DELUXE MAIN1.jpeg"), buffer);
      } else if (roomSlug === "executive") {
        await fs.writeFile(path.join(imagesDir, "executive.jpg"), buffer);
        await fs.writeFile(path.join(imagesDir, "EXECUTIVE Main.jpeg"), buffer);
      } else if (roomSlug === "standard-plus") {
        await fs.writeFile(path.join(imagesDir, "Standard PLUS.jpeg"), buffer);
        await fs.writeFile(path.join(imagesDir, "Standard Plus.jpg"), buffer);
      } else if (roomSlug === "standard") {
        await fs.writeFile(path.join(imagesDir, "Standard room.jpg"), buffer);
        await fs.writeFile(path.join(imagesDir, "standard.jpg"), buffer);
      } else if (roomSlug === "luxury" || roomSlug === "presidential-suite") {
        await fs.writeFile(path.join(imagesDir, "Presidential.jpg"), buffer);
      } else if (roomSlug === "luxury-suite" || roomSlug === "signature-suite") {
        await fs.writeFile(path.join(imagesDir, "signature suite room.jpg"), buffer);
      }
    }

    return NextResponse.json({
      ok: true,
      fileName,
      url: `/images/${encodeURIComponent(fileName)}`,
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
