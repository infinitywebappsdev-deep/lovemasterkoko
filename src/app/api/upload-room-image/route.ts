import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;
    const slug = (formData.get("slug") as string | null) || "deluxe";

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

      // Clean up filename or use standard slot
      const originalName = file.name || `photo-${i + 1}.jpeg`;
      const ext = path.extname(originalName) || ".jpeg";

      // 1. Save with exact original filename in public/images
      const targetPath = path.join(imagesDir, originalName);
      await fs.writeFile(targetPath, buffer);
      savedUrls.push(`/images/${originalName}`);

      // 2. Also map to standard names for Deluxe if applicable
      if (slug === "deluxe" || originalName.toUpperCase().includes("DELUXE")) {
        const standardName = `DELUXE MAIN${i + 1}.jpeg`;
        await fs.writeFile(path.join(imagesDir, standardName), buffer);

        // First uploaded image also updates primary deluxe.jpg
        if (i === 0) {
          await fs.writeFile(path.join(imagesDir, "deluxe.jpg"), buffer);
          await fs.writeFile(path.join(imagesDir, "deluxe-main-1.jpg"), buffer);
        } else if (i === 1) {
          await fs.writeFile(path.join(imagesDir, "deluxe-main-2.jpg"), buffer);
        }
      }

      // 3. Map to standard names for Executive if applicable
      if (slug === "executive" || originalName.toUpperCase().includes("EXECUTIVE")) {
        if (i === 0) {
          await fs.writeFile(path.join(imagesDir, "EXECUTIVE Main.jpeg"), buffer);
          await fs.writeFile(path.join(imagesDir, "executive.jpg"), buffer);
        } else if (i === 1) {
          await fs.writeFile(path.join(imagesDir, "EXECUTIVE MAIN2.jpeg"), buffer);
        }
      }

      // 4. Map to standard names for Standard Plus if applicable
      if (slug === "standard-plus" || originalName.toUpperCase().includes("STANDARD PLUS") || originalName.toUpperCase().includes("STANDAR PLUS")) {
        if (i === 0) {
          await fs.writeFile(path.join(imagesDir, "Standard PLUS.jpeg"), buffer);
          await fs.writeFile(path.join(imagesDir, "Standard Plus.jpg"), buffer);
        } else if (i === 1) {
          await fs.writeFile(path.join(imagesDir, "STANDARD PLUS MAIN .jpeg"), buffer);
          await fs.writeFile(path.join(imagesDir, "STANDARD PLUS MAIN.jpeg"), buffer);
          await fs.writeFile(path.join(imagesDir, "standar plus.jpg"), buffer);
        }
      }

      // 5. Map to standard names for Standard Room if applicable
      if (
        slug === "standard" ||
        (originalName.toUpperCase().includes("STANDARD") &&
          !originalName.toUpperCase().includes("PLUS"))
      ) {
        if (i === 0) {
          await fs.writeFile(path.join(imagesDir, "Standard room.jpg"), buffer);
          await fs.writeFile(path.join(imagesDir, "Standard roomx.jpg"), buffer);
        } else if (i === 1) {
          await fs.writeFile(path.join(imagesDir, "standard.jpg"), buffer);
        }
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
