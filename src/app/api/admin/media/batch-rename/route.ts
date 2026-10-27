import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type RenameItem = {
  oldName: string;
  newName: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const renames: RenameItem[] = body?.renames;

    if (!Array.isArray(renames) || renames.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No renames provided in payload." },
        { status: 400 }
      );
    }

    const imagesDir = path.join(process.cwd(), "public", "images");
    const results: { oldName: string; newName: string; success: boolean; error?: string }[] = [];

    for (const item of renames) {
      const oldClean = path.basename(item.oldName || "").trim();
      let newClean = path.basename(item.newName || "").trim();

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

      const oldPath = path.join(imagesDir, oldClean);
      const newPath = path.join(imagesDir, newClean);

      try {
        // Verify source file exists
        await fs.access(oldPath);

        // If old and new are identical, consider it done
        if (oldClean === newClean) {
          results.push({ oldName: oldClean, newName: newClean, success: true });
          continue;
        }

        // Rename file
        await fs.rename(oldPath, newPath);
        results.push({ oldName: oldClean, newName: newClean, success: true });
      } catch (err: any) {
        console.error(`Failed renaming ${oldClean} to ${newClean}:`, err);
        results.push({
          oldName: oldClean,
          newName: newClean,
          success: false,
          error: err?.message || "File operation failed",
        });
      }
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
