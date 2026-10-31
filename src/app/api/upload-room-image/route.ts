import { NextRequest, NextResponse } from "next/server";

import path from "path";

import { requireStaff, jsonError } from "@/lib/booking/auth";
import { writeMedia } from "@/lib/media/store";

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

    const savedUrls: string[] = [];

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const buffer = new Uint8Array(await file.arrayBuffer());
      const contentType = file.type && file.type.startsWith("image/") ? file.type : undefined;

      // Clean up filename or use standard slot — basename() strips any path
      // segments so an uploaded name can never escape the media folder.
      const originalName =
        path.basename(file.name || `photo-${i + 1}.jpeg`).trim() || `photo-${i + 1}.jpeg`;

      // 1. Save with exact original filename
      await writeMedia("images", originalName, buffer, contentType);
      savedUrls.push(`/media/images/${encodeURIComponent(originalName)}`);

      // 2. Legacy alias files — written ONLY for the resolved target category,
      // so an upload can never bleed into another room's pictures.
      const targetSlug = resolveTargetSlug(originalName);
      const writeAliases = async (names: string[]) => {
        for (const name of names) {
          if (name === originalName) continue;
          await writeMedia("images", name, buffer, contentType);
        }
      };

      if (targetSlug === "deluxe") {
        if (i === 0) {
          await writeAliases([`DELUXE MAIN${i + 1}.jpeg`, "deluxe.jpg", "deluxe-main-1.jpg"]);
        } else if (i === 1) {
          await writeAliases(["DELUXE MAIN2.jpeg", "deluxe-main-2.jpg"]);
        } else {
          await writeAliases([`DELUXE MAIN${i + 1}.jpeg`]);
        }
      }

      if (targetSlug === "executive" && i < 2) {
        await writeAliases(i === 0 ? ["EXECUTIVE Main.jpeg", "executive.jpg"] : ["EXECUTIVE MAIN2.jpeg"]);
      }

      if (targetSlug === "standard-plus" && i < 2) {
        await writeAliases(
          i === 0
            ? ["Standard PLUS.jpeg", "Standard Plus.jpg"]
            : ["STANDARD PLUS MAIN .jpeg", "STANDARD PLUS MAIN.jpeg"]
        );
      }

      if (targetSlug === "standard" && i < 2) {
        await writeAliases(i === 0 ? ["Standard room.jpg", "Standard roomx.jpg"] : ["standard.jpg"]);
      }

      // Primary images referenced by the static catalog for the suite categories
      if (i === 0 && targetSlug === "luxury") {
        await writeAliases(["Presidential.jpg"]);
      }
      if (i === 0 && targetSlug === "luxury-suite") {
        await writeAliases(["signature suite room.jpg"]);
      }

      // 6. Map brand logo files if applicable
      const upperName = originalName.toUpperCase();
      if (upperName.includes("LOGO") || upperName.includes("BANKY")) {
        if (originalName.endsWith("..png")) {
          await writeAliases([`${originalName.slice(0, -5)}.png`]);
        }

        if (upperName.includes("2 PLUS") || upperName.includes("WHITE")) {
          await writeAliases([
            "Banky Hotel & Suites Main Logo 2 plus.png",
            "Banky Hotel & Suites Main Logo 2 plus..png",
            "banky-white-logo.png",
          ]);
        } else if (upperName.includes("PLUS..") || (upperName.includes("PLUS") && !upperName.includes("2 PLUS"))) {
          await writeAliases([
            "Banky Hotel & Suites Main Logo plus.png",
            "Banky Hotel & Suites Main Logo plus..png",
            "banky-desktop-logo.png",
            "Banky Hotel & Suites Main Logo 1.png",
          ]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      urls: savedUrls,
      message: `Successfully saved ${allFiles.length} room image(s).`,
    });
  } catch (error) {
    console.error("Failed to save room images:", error);
    return NextResponse.json({ error: "Failed to upload image files" }, { status: 500 });
  }
}
