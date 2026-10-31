import { NextRequest, NextResponse } from "next/server";

import path from "path";

import { requireStaff, jsonError } from "@/lib/booking/auth";
import { statMedia } from "@/lib/media/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/home-media/resize
 *
 * Reports the size of the requested media files.
 *
 * Re-encoding images needs ffmpeg/sharp, neither of which exists in the Worker
 * runtime, so files are left byte-identical: shrinking them here would require
 * a native image pipeline the deployment cannot run. The response keeps the
 * shape the admin UI expects (with 0% savings and `skipped: true`) instead of
 * failing the whole batch.
 */
async function describe(filename: string, maxWidth: number) {
  const clean = path.basename(String(filename || "").split("?")[0]).trim();
  if (!clean) throw new Error("Missing filename");

  const stat = await statMedia("images", clean);
  if (!stat) throw new Error("File not found");

  return {
    filename: clean,
    originalSize: stat.size,
    optimizedSize: stat.size,
    dimensions: "",
    savingsPercent: 0,
    skipped: true,
    maxWidth,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const body = await req.json();
    const filename = body.filename as string | undefined;
    const url = body.url as string | undefined;
    const maxWidth = Number(body.maxWidth) || 1280;
    const batchList = body.filenames as string[] | undefined;

    const note =
      "Image re-encoding is not available in this deployment (no ffmpeg/sharp at runtime); files are served unchanged.";

    if (batchList && Array.isArray(batchList) && batchList.length > 0) {
      const results = [];
      for (const file of batchList) {
        try {
          results.push(await describe(file, maxWidth));
        } catch (e: any) {
          results.push({ filename: file, error: e?.message || "Processing failed" });
        }
      }
      return NextResponse.json({
        ok: true,
        batch: true,
        results,
        message: note,
      });
    }

    const targetFile = filename || (url ? path.basename(url.split("?")[0]) : "");
    if (!targetFile) {
      return NextResponse.json({ ok: false, error: "Must specify filename or url" }, { status: 400 });
    }

    const result = await describe(targetFile, maxWidth);

    return NextResponse.json({
      ok: true,
      result,
      message: note,
    });
  } catch (error: any) {
    console.error("Image resize error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to inspect image" },
      { status: 500 }
    );
  }
}
