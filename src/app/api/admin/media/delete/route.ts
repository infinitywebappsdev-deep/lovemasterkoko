import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/media/delete
 * Accepts JSON or query params:
 * - type: "image" | "video"
 * - filename?: string (e.g. "deluxe-main-1.jpg" or "deluxe-room.mp4")
 * - slug?: string (e.g. "deluxe", "executive")
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = (body.type || req.nextUrl.searchParams.get("type") || "image") as "image" | "video";
    const filename = body.filename || req.nextUrl.searchParams.get("filename") || "";
    const slug = body.slug || req.nextUrl.searchParams.get("slug") || "";

    if (!filename && !slug) {
      return NextResponse.json(
        { error: "Must specify filename or room slug to delete" },
        { status: 400 }
      );
    }

    // Protect against directory traversal attacks
    const sanitize = (name: string) => path.basename(name).replace(/\0/g, "").trim();

    if (type === "video") {
      const videosDir = path.join(process.cwd(), "public", "videos");
      await fs.mkdir(videosDir, { recursive: true });

      const filesToDelete: string[] = [];

      if (slug) {
        const cleanSlug = sanitize(slug).toLowerCase().replace(/\s+/g, "-");
        filesToDelete.push(`${cleanSlug}-room.mp4`);
        filesToDelete.push(`${cleanSlug}.mp4`);
        filesToDelete.push(`${cleanSlug.replace(/-/g, "")}-room.mp4`);
        filesToDelete.push(`${cleanSlug.replace(/-/g, "")}.mp4`);
      }

      if (filename) {
        const cleanFilename = sanitize(filename);
        if (cleanFilename.endsWith(".mp4") || cleanFilename.endsWith(".webm") || cleanFilename.endsWith(".mov")) {
          filesToDelete.push(cleanFilename);
        }
      }

      let deletedCount = 0;
      for (const f of Array.from(new Set(filesToDelete))) {
        const targetPath = path.join(videosDir, f);
        try {
          await fs.unlink(targetPath);
          deletedCount++;
        } catch {
          // File may not exist or already unlinked
        }
      }

      // Update manifest.json if slug was specified
      if (slug) {
        try {
          const manifestPath = path.join(videosDir, "manifest.json");
          const manifestData = await fs.readFile(manifestPath, "utf-8");
          const manifest = JSON.parse(manifestData);
          const cleanSlug = sanitize(slug).toLowerCase().replace(/\s+/g, "-");
          if (manifest[cleanSlug]) {
            delete manifest[cleanSlug];
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
          }
        } catch {
          // manifest might not exist
        }
      }

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Video asset(s) deleted successfully.`,
      });
    }

    // Default: Image deletion
    const imagesDir = path.join(process.cwd(), "public", "images");
    await fs.mkdir(imagesDir, { recursive: true });

    const cleanFilename = sanitize(filename);
    if (!cleanFilename) {
      return NextResponse.json({ error: "Invalid image filename" }, { status: 400 });
    }

    // Prevent deleting core system assets by mistake
    const protectedAssets = new Set([
      "favicon.ico",
      "favicon.png",
      "favicon.svg",
      "banky-desktop-logo.png",
    ]);

    if (protectedAssets.has(cleanFilename.toLowerCase())) {
      return NextResponse.json(
        { error: `Cannot delete core system asset: ${cleanFilename}` },
        { status: 403 }
      );
    }

    const targetPath = path.join(imagesDir, cleanFilename);

    try {
      await fs.unlink(targetPath);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return NextResponse.json(
          { error: `File not found: ${cleanFilename}` },
          { status: 404 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      filename: cleanFilename,
      message: `Image ${cleanFilename} was permanently deleted from public/images/.`,
    });
  } catch (error: any) {
    console.error("Delete media API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete media asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
