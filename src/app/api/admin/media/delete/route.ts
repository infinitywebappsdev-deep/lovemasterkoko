import { NextRequest, NextResponse } from "next/server";

import path from "path";

import { requireStaff, jsonError } from "@/lib/booking/auth";
import { deleteMedia, listMedia } from "@/lib/media/store";

export const dynamic = "force-dynamic";

/** Core assets that must never be removed from the media library. */
const PROTECTED_ASSETS = new Set([
  "favicon.ico",
  "favicon.png",
  "favicon.svg",
  "banky-desktop-logo.png",
]);

/** Strips any path, NUL or query noise from a caller-supplied filename. */
function sanitize(name: string): string {
  return path.basename(String(name || "").split("?")[0]).replace(/\0/g, "").trim();
}

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
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const type = (body.type || req.nextUrl.searchParams.get("type") || "image") as "image" | "video";
    const filename = String(body.filename || req.nextUrl.searchParams.get("filename") || "");
    const slug = String(body.slug || req.nextUrl.searchParams.get("slug") || "");

    if (!filename && !slug) {
      return NextResponse.json(
        { error: "Must specify filename or room slug to delete" },
        { status: 400 }
      );
    }

    if (type === "video") {
      const cleanSlug = slug ? sanitize(slug).toLowerCase().replace(/\s+/g, "-") : "";
      const exact = filename ? sanitize(filename) : "";
      const noHyphen = cleanSlug.replace(/-/g, "");

      // Match the same family of filenames an upload can produce:
      // <slug>-room.mp4, <slug>.mp4, unhyphenated aliases and timestamped ones.
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

      const candidates = (await listMedia("videos")).filter((entry) => isMatch(entry.name));

      const deleted: string[] = [];
      const bundled: string[] = [];

      for (const entry of candidates) {
        if (entry.source === "static") {
          // Shipped inside the deployment bundle: no runtime write access.
          bundled.push(entry.name);
          continue;
        }
        if (await deleteMedia("videos", entry.name)) deleted.push(entry.name);
      }

      // Idempotent: a repeat delete (or a file that was already gone) is a
      // success — the asset is no longer served either way.
      return NextResponse.json({
        ok: true,
        success: true,
        deletedCount: deleted.length,
        deleted,
        bundledCount: bundled.length,
        bundled: bundled.length ? bundled : undefined,
        message:
          deleted.length > 0
            ? `Deleted ${deleted.length} video file(s).`
            : bundled.length > 0
              ? "These videos ship inside the deployment bundle and cannot be removed at runtime. Replace them with an upload instead."
              : "No matching video file was present — it was already removed.",
      });
    }

    // Default: image deletion
    const cleanFilename = sanitize(filename);
    if (!cleanFilename) {
      return NextResponse.json({ error: "Invalid image filename" }, { status: 400 });
    }

    if (PROTECTED_ASSETS.has(cleanFilename.toLowerCase())) {
      return NextResponse.json(
        { error: `Cannot delete core system asset: ${cleanFilename}` },
        { status: 403 }
      );
    }

    const removed = await deleteMedia("images", cleanFilename);

    if (!removed) {
      const entries = await listMedia("images");
      const bundled = entries.some(
        (entry) => entry.name.toLowerCase() === cleanFilename.toLowerCase() && entry.source === "static"
      );

      if (bundled) {
        return NextResponse.json({
          ok: true,
          success: true,
          filename: cleanFilename,
          alreadyGone: false,
          bundled: true,
          message: `${cleanFilename} ships inside the deployment bundle, so its page references were cleared but the binary stays until the next build.`,
        });
      }

      return NextResponse.json({
        ok: true,
        success: true,
        filename: cleanFilename,
        alreadyGone: true,
        message: `${cleanFilename} was already removed.`,
      });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      filename: cleanFilename,
      message: `Image ${cleanFilename} was permanently deleted.`,
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
