import { NextRequest, NextResponse } from "next/server";

import path from "path";

import { requireStaff, jsonError } from "@/lib/booking/auth";
import { deleteMedia, statMedia } from "@/lib/media/store";

export const dynamic = "force-dynamic";

const PROTECTED_FILES = new Set(["favicon.ico", "favicon.png", "banky-desktop-logo.png"]);

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const body = await req.json();
    const url = body.url as string | undefined;
    const filename = body.filename as string | undefined;
    const fileType = (body.type || (url?.includes("/videos/") ? "video" : "image")) as
      | "image"
      | "video";

    if (!url && !filename) {
      return NextResponse.json(
        { ok: false, error: "Must specify URL or filename to delete" },
        { status: 400 }
      );
    }

    const rawTarget = (filename || url || "").split("?")[0];
    const targetName = path.basename(
      (() => {
        try {
          return decodeURIComponent(rawTarget);
        } catch {
          return rawTarget;
        }
      })()
    );

    if (!targetName) {
      return NextResponse.json({ ok: false, error: "Invalid file name" }, { status: 400 });
    }

    if (PROTECTED_FILES.has(targetName.toLowerCase())) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete protected system brand assets." },
        { status: 403 }
      );
    }

    const folder = fileType === "video" ? "videos" : "images";
    const stat = await statMedia(folder, targetName);
    if (stat?.source === "static") {
      return NextResponse.json({
        ok: true,
        filename: targetName,
        message: `${targetName} ships inside the deployment bundle and cannot be removed at runtime. Its page references were cleared.`,
      });
    }

    await deleteMedia(folder, targetName);

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
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);
  return POST(req);
}
