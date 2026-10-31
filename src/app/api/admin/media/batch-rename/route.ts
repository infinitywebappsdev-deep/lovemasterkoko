import { NextRequest, NextResponse } from "next/server";

import path from "path";

import { requireStaff, jsonError } from "@/lib/booking/auth";
import { copyMedia, renameMedia, statMedia } from "@/lib/media/store";

type RenameItem = {
  oldName: string;
  newName: string;
};

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const body = await req.json();
    const renames: RenameItem[] = body?.renames;

    if (!Array.isArray(renames) || renames.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No renames provided in payload." },
        { status: 400 }
      );
    }

    const results: { oldName: string; newName: string; success: boolean; error?: string }[] = [];

    for (const item of renames) {
      const oldClean = path.basename(String(item.oldName || "").split("?")[0]).trim();
      let newClean = path.basename(String(item.newName || "").split("?")[0]).trim();

      // Security check: ensure no directory traversal
      if (!oldClean || !newClean || oldClean.includes("..") || newClean.includes("..")) {
        results.push({
          oldName: item.oldName,
          newName: item.newName,
          success: false,
          error: "Invalid file name.",
        });
        continue;
      }

      // Preserve original extension if new name doesn't specify one
      const oldExt = path.extname(oldClean);
      if (!path.extname(newClean) && oldExt) {
        newClean += oldExt;
      }

      if (oldClean === newClean) {
        results.push({ oldName: oldClean, newName: newClean, success: true });
        continue;
      }

      const source = await statMedia("images", oldClean);
      if (!source) {
        results.push({
          oldName: oldClean,
          newName: newClean,
          success: false,
          error: "File not found.",
        });
        continue;
      }

      if (source.source === "static") {
        // Bundled assets are read-only at runtime; copy them into storage instead
        // so the renamed file is immediately addressable.
        const sourceUrl = `${req.nextUrl.origin}/images/${encodeURIComponent(oldClean)}`;
        const copied = await copyMedia("images", oldClean, newClean, sourceUrl);
        results.push({
          oldName: oldClean,
          newName: copied.name,
          success: copied.ok,
          error: copied.ok
            ? undefined
            : copied.error || "Bundled asset could not be copied into storage.",
        });
        continue;
      }

      const renamed = await renameMedia("images", oldClean, newClean);
      results.push({
        oldName: oldClean,
        newName: renamed.name,
        success: renamed.ok,
        error: renamed.ok ? undefined : renamed.error || "File operation failed",
      });
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({
      ok: true,
      count: successCount,
      total: results.length,
      results,
    });
  } catch (err: any) {
    console.error("Batch rename error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Internal server error during batch rename" },
      { status: 500 }
    );
  }
}
