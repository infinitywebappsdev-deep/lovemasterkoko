import { NextRequest, NextResponse } from "next/server";

import path from "path";

import { requireStaff, jsonError } from "@/lib/booking/auth";
import { writeMedia } from "@/lib/media/store";

/**
 * POST /api/admin/media/brand-upload
 * Accepts multipart form data with:
 * - file: the logo image file
 * - type: "full" | "mark" | "monochrome" (optional, defaults to "full")
 * - label: optional label for the logo
 *
 * The uploaded logo is stored as a media object and its public URL returned.
 * The deployed bundle is immutable, so the brand catalog itself (which is
 * compiled into the app) is not rewritten here.
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "full";
    const label = (formData.get("label") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        },
        { status: 400 }
      );
    }

    // Unique filename with a timestamp so uploads never clobber each other
    const extension = path.extname(file.name || "") || ".png";
    const baseName = path.basename(file.name || "logo", extension);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9]/g, "_") || "logo";
    const filename = `${safeBaseName}-${Date.now()}${extension}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeMedia("images", filename, bytes, file.type || undefined);

    const logoUrl = `/media/images/${encodeURIComponent(filename)}`;
    const logoLabel = label || getDefaultLabel(type);

    return NextResponse.json({
      ok: true,
      filename,
      url: logoUrl,
      type,
      label: logoLabel,
      isActive: false,
      message: `Logo "${logoLabel}" uploaded. Use this URL in the brand catalog to activate it.`,
    });
  } catch (error: any) {
    console.error("Brand logo upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload brand logo" },
      { status: 500 }
    );
  }
}

/** Helper to get default label for logo type */
function getDefaultLabel(type: string): string {
  const labels: Record<string, string> = {
    full: "Full Brand Logo",
    mark: "Architectural Mark",
    monochrome: "White Silhouette Mark",
  };
  return labels[type] || "Brand Logo";
}
