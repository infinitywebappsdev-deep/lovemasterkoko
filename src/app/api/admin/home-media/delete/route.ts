import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url as string | undefined;
    const filename = body.filename as string | undefined;
    const fileType = (body.type || (url?.includes("/videos/") ? "video" : "image")) as "image" | "video";

    if (!url && !filename) {
      return NextResponse.json({ ok: false, error: "Must specify URL or filename to delete" }, { status: 400 });
    }

    const targetName = path.basename(decodeURIComponent(filename || url || ""));
    const folder = fileType === "video" ? "videos" : "images";
    const dir = path.join(process.cwd(), "public", folder);
    const filePath = path.join(dir, targetName);

    // Safeguard essential logo files
    const protectedFiles = new Set(["favicon.ico", "favicon.png", "banky-desktop-logo.png"]);
    if (protectedFiles.has(targetName.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Cannot delete protected system brand assets." }, { status: 403 });
    }

    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }

    return NextResponse.json({
      ok: true,
      filename: targetName,
      message: `File ${targetName} was deleted from server storage.`,
    });
  } catch (error: any) {
    console.error("Home media delete error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to delete file" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
