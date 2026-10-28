import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireStaff, jsonError } from "@/lib/booking/auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/media/delete
 * Accepts JSON or query params:
 * - type: "image" | "video"
 * - filename?: string (e.g. "deluxe-main-1.jpg" or "deluxe-room.mp4")
 * - slug?: string (e.g. "deluxe", "executive")
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);
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

      const cleanSlug = slug ? sanitize(slug).toLowerCase().replace(/\s+/g, "-") : "";
      const exact = filename ? sanitize(filename) : "";
      const noHyphen = cleanSlug.replace(/-/g, "");

      // Scan the directory instead of guessing a single filename: uploads can
      // produce <slug>-room.mp4, <slug>.mp4, alias symlinks or timestamped
      // hero/stitched files, and all of them belong to the same asset.
      const isMatch = (name: string): boolean => {
        const lower = name.toLowerCase();
        if (exact && lower === exact.toLowerCase()) return true;
        if (!cleanSlug) return false;
        return (
          lower === `${cleanSlug}-room.mp4` ||
          lower === `${cleanSlug}.mp4` ||
          lower === `${noHyphen}-room.mp4` ||
          lower === `${noHyphen}.mp4` ||
          (lower.startsWith(`${cleanSlug}-`) && lower.endsWith(".mp4")) ||
          (lower.startsWith(`${cleanSlug}_`) && lower.endsWith(".mp4"))
        );
      };

      const entries = await fs.readdir(videosDir, { withFileTypes: true });
      const deleted: string[] = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!/\.(mp4|webm|mov|m4v)$/.test(entry.name)) continue;
        if (!isMatch(entry.name)) continue;
        try {
          await fs.unlink(path.join(videosDir, entry.name));
          deleted.push(entry.name);
        } catch {
          // file may have been removed concurrently
        }
      }

      // Update manifest.json if slug was specified
      if (cleanSlug) {
        try {
          const manifestPath = path.join(videosDir, "manifest.json");
          const manifestData = await fs.readFile(manifestPath, "utf-8");
          const manifest = JSON.parse(manifestData);
          if (manifest[cleanSlug]) {
            delete manifest[cleanSlug];
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
          }
        } catch {
          // manifest might not exist
        }
      }

      // Idempotent: a repeat delete (or a file that was already gone) is a
      // success — the asset is no longer served either way.
      return NextResponse.json({
        ok: true,
        success: true,
        deletedCount: deleted.length,
        deleted,
        message:
          deleted.length > 0
            ? `Deleted ${deleted.length} video file(s).`
            : "No matching video file was present — it was already removed.",
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
        // Already gone — treat as success so references still get cleaned up.
        return NextResponse.json({
          ok: true,
          success: true,
          filename: cleanFilename,
          alreadyGone: true,
          message: `${cleanFilename} was already removed.`,
        });
      }
      throw err;
    }

    return NextResponse.json({
      ok: true,
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
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);
  return POST(req);
}
