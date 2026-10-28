import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireStaff, jsonError } from "@/lib/booking/auth";

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;
    const explicitSlug = ((formData.get("slug") as string | null) || "").trim().toLowerCase();

    /**
     * Which room category an uploaded file belongs to.
     * An explicit slug always wins. Filename sniffing only runs when the caller
     * sent no slug at all — previously both were applied together, so a photo
     * named "STANDARD PLUS..." uploaded into the Standard room (or the reverse)
     * overwrote the other category's files and room grids showed wrong pictures.
     */
    const resolveTargetSlug = (name: string): string => {
      if (explicitSlug) return explicitSlug;
      const u = name.toUpperCase();
      if (u.includes("STANDARD PLUS") || u.includes("STANDAR PLUS")) return "standard-plus";
      if (u.includes("STANDARD")) return "standard";
      if (u.includes("SUPER")) return "super-executive";
      if (u.includes("EXECUTIVE")) return "executive";
      if (u.includes("DELUXE")) return "deluxe";
      if (u.includes("SIGNATURE") || u.includes("LUXURY SUITE")) return "luxury-suite";
      if (u.includes("PRESIDENTIAL") || u.includes("LUXURY")) return "luxury";
      if (u.includes("STUDIO")) return "studio";
      return "";
    };

    const allFiles: File[] = [];
    if (files && files.length > 0) {
      allFiles.push(...files.filter(Boolean));
    } else if (singleFile) {
      allFiles.push(singleFile);
    }

    if (allFiles.length === 0) {
      return NextResponse.json({ error: "No image files provided" }, { status: 400 });
    }

    const imagesDir = path.join(process.cwd(), "public", "images");
    await fs.mkdir(imagesDir, { recursive: true });

    const savedUrls: string[] = [];

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Clean up filename or use standard slot — basename() strips any path
      // segments so an uploaded name can never escape public/images.
      const originalName = path.basename(file.name || `photo-${i + 1}.jpeg`).trim() || `photo-${i + 1}.jpeg`;
      const ext = path.extname(originalName) || ".jpeg";

      // 1. Save with exact original filename in public/images
      const targetPath = path.join(imagesDir, originalName);
      await fs.writeFile(targetPath, buffer);
      savedUrls.push(`/images/${originalName}`);

      // 2. Legacy alias files — written ONLY for the resolved target category,
      // so an upload can never bleed into another room's pictures.
      const targetSlug = resolveTargetSlug(originalName);

      if (targetSlug === "deluxe") {
        if (i === 0) {
          await fs.writeFile(path.join(imagesDir, `DELUXE MAIN${i + 1}.jpeg`), buffer);
          await fs.writeFile(path.join(imagesDir, "deluxe.jpg"), buffer);
          await fs.writeFile(path.join(imagesDir, "deluxe-main-1.jpg"), buffer);
        } else if (i === 1) {
          await fs.writeFile(path.join(imagesDir, "DELUXE MAIN2.jpeg"), buffer);
          await fs.writeFile(path.join(imagesDir, "deluxe-main-2.jpg"), buffer);
        } else {
          await fs.writeFile(path.join(imagesDir, `DELUXE MAIN${i + 1}.jpeg`), buffer);
        }
      }

      if (targetSlug === "executive" && i < 2) {
        if (i === 0) {
          await fs.writeFile(path.join(imagesDir, "EXECUTIVE Main.jpeg"), buffer);
          await fs.writeFile(path.join(imagesDir, "executive.jpg"), buffer);
        } else {
          await fs.writeFile(path.join(imagesDir, "EXECUTIVE MAIN2.jpeg"), buffer);
        }
      }

      if (targetSlug === "standard-plus" && i < 2) {
        if (i === 0) {
          await fs.writeFile(path.join(imagesDir, "Standard PLUS.jpeg"), buffer);
          await fs.writeFile(path.join(imagesDir, "Standard Plus.jpg"), buffer);
        } else {
          await fs.writeFile(path.join(imagesDir, "STANDARD PLUS MAIN .jpeg"), buffer);
          await fs.writeFile(path.join(imagesDir, "STANDARD PLUS MAIN.jpeg"), buffer);
        }
      }

      if (targetSlug === "standard" && i < 2) {
        if (i === 0) {
          await fs.writeFile(path.join(imagesDir, "Standard room.jpg"), buffer);
          await fs.writeFile(path.join(imagesDir, "Standard roomx.jpg"), buffer);
        } else {
          await fs.writeFile(path.join(imagesDir, "standard.jpg"), buffer);
        }
      }

      // Primary images referenced by the static catalog for the suite categories
      if (i === 0 && targetSlug === "luxury") {
        await fs.writeFile(path.join(imagesDir, "Presidential.jpg"), buffer);
      }
      if (i === 0 && targetSlug === "luxury-suite") {
        await fs.writeFile(path.join(imagesDir, "signature suite room.jpg"), buffer);
      }

      // 6. Map brand logo files if applicable
      const upperName = originalName.toUpperCase();
      if (upperName.includes("LOGO") || upperName.includes("BANKY")) {
        // Normalize names (handle double dots like plus..png)
        if (originalName.endsWith("..png")) {
          const singleDotName = originalName.slice(0, -5) + ".png";
          await fs.writeFile(path.join(imagesDir, singleDotName), buffer);
        }

        if (upperName.includes("2 PLUS") || upperName.includes("WHITE")) {
          // White silhouette logo mark
          await fs.writeFile(path.join(imagesDir, "Banky Hotel & Suites Main Logo 2 plus.png"), buffer);
          await fs.writeFile(path.join(imagesDir, "Banky Hotel & Suites Main Logo 2 plus..png"), buffer);
          await fs.writeFile(path.join(imagesDir, "banky-white-logo.png"), buffer);
        } else if (upperName.includes("PLUS..") || (upperName.includes("PLUS") && !upperName.includes("2 PLUS"))) {
          // Full brand logo / Mark logo
          await fs.writeFile(path.join(imagesDir, "Banky Hotel & Suites Main Logo plus.png"), buffer);
          await fs.writeFile(path.join(imagesDir, "Banky Hotel & Suites Main Logo plus..png"), buffer);
          await fs.writeFile(path.join(imagesDir, "banky-desktop-logo.png"), buffer);
          await fs.writeFile(path.join(imagesDir, "Banky Hotel & Suites Main Logo 1.png"), buffer);
        }
      }
    }

    return NextResponse.json({
      success: true,
      urls: savedUrls,
      message: `Successfully saved ${allFiles.length} actual room image(s) to public/images/`,
    });
  } catch (error) {
    console.error("Failed to save room images:", error);
    return NextResponse.json({ error: "Failed to upload image files" }, { status: 500 });
  }
}
