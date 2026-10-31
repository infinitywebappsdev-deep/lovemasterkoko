import { NextRequest, NextResponse } from "next/server";

import path from "path";

import { requireStaff, jsonError } from "@/lib/booking/auth";
import { normalizeHomepageMedia } from "@/lib/homepage-media";
import { readMediaJson, writeMedia, writeMediaJson } from "@/lib/media/store";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "config/homepage-media.json";

/**
 * Uploads homepage media.
 *
 * Files are stored exactly as supplied: the Worker runtime ships neither
 * ffmpeg nor sharp, so server-side downscaling, faststart remuxing and poster
 * frame extraction are not available here. Images and videos are served from
 * object storage through `/media/...`.
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;
    const targetSection = (formData.get("section") as string | null) || "gallery";
    const customTitle = (formData.get("title") as string | null) || "";

    const allFiles: File[] = [];
    if (files && files.length > 0) {
      allFiles.push(...files.filter(Boolean));
    } else if (singleFile) {
      allFiles.push(singleFile);
    }

    if (allFiles.length === 0) {
      return NextResponse.json({ ok: false, error: "No files uploaded" }, { status: 400 });
    }

    const uploadedAssets: Array<{
      url: string;
      name: string;
      type: "image" | "video";
      size: number;
      originalSize?: number;
      savingsPercent?: number;
      dimensions?: string;
      title: string;
      posterUrl?: string;
    }> = [];

    let heroVideoUrl: string | null = null;

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const rawName = file.name || `asset-${Date.now()}-${i}`;
      const extension = path.extname(rawName).toLowerCase();
      const isVideo =
        [".mp4", ".mov", ".webm", ".m4v"].includes(extension) || file.type.startsWith("video/");

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length === 0) continue;

      if (isVideo) {
        const cleanBase = path.basename(rawName, extension)
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, "-");
        const isHeroVideo = targetSection === "hero" || targetSection === "hero-video";
        const uniqueTimestamp = Date.now().toString().slice(-6);
        const videoFilename = isHeroVideo
          ? `hero-${Date.now()}.mp4`
          : `${cleanBase || "video"}-${uniqueTimestamp}${extension === ".mov" ? ".mp4" : extension || ".mp4"}`;

        const contentType = file.type && file.type.startsWith("video/") ? file.type : "video/mp4";
        await writeMedia("videos", videoFilename, bytes, contentType);

        if (isHeroVideo) {
          heroVideoUrl = `/media/videos/${encodeURIComponent(videoFilename)}`;
        }

        uploadedAssets.push({
          url: `/media/videos/${encodeURIComponent(videoFilename)}`,
          name: videoFilename,
          type: "video",
          size: bytes.length,
          title: customTitle || (isHeroVideo ? "Hero Background Video" : cleanBase.replace(/-/g, " ")),
        });
        continue;
      }

      const cleanBase = path
        .basename(rawName, extension)
        .replace(/[^\w\s.-]/gi, "_")
        .trim();
      const safeFilename = `${cleanBase || "asset"}${extension || ".jpg"}`;

      await writeMedia(
        "images",
        safeFilename,
        bytes,
        file.type && file.type.startsWith("image/") ? file.type : undefined
      );

      uploadedAssets.push({
        url: `/media/images/${encodeURIComponent(safeFilename)}`,
        name: safeFilename,
        type: "image",
        size: bytes.length,
        originalSize: bytes.length,
        savingsPercent: 0,
        title: customTitle || cleanBase.replace(/[_-]/g, " "),
      });
    }

    // Keep the stored homepage config pointing at a freshly uploaded hero video.
    if (heroVideoUrl) {
      try {
        const stored = await readMediaJson<Record<string, unknown>>(CONFIG_KEY);
        const current = normalizeHomepageMedia(stored || {});
        current.hero.videoUrl = heroVideoUrl;
        current.hero.isVideoEnabled = true;
        current.updatedAt = new Date().toISOString();
        await writeMediaJson(CONFIG_KEY, current);
      } catch (err) {
        console.warn("Could not update stored homepage media config:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      assets: uploadedAssets,
      count: uploadedAssets.length,
      message: `Successfully uploaded ${uploadedAssets.length} file(s) for the home landing page.`,
    });
  } catch (error: any) {
    console.error("Home media upload error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to upload file(s)" },
      { status: 500 }
    );
  }
}
