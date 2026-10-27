import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { DEFAULT_HOMEPAGE_MEDIA, HomepageMediaConfig, normalizeHomepageMedia } from "@/lib/homepage-media";

export const dynamic = "force-dynamic";

const BACKUP_FILE = path.join(process.cwd(), "public", "homepage-media.json");

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images");
    const videosDir = path.join(process.cwd(), "public", "videos");

    await fs.mkdir(imagesDir, { recursive: true });
    await fs.mkdir(videosDir, { recursive: true });

    // Read stored config if present
    let config: HomepageMediaConfig = { ...DEFAULT_HOMEPAGE_MEDIA };
    try {
      const raw = await fs.readFile(BACKUP_FILE, "utf-8");
      config = normalizeHomepageMedia(JSON.parse(raw));
    } catch {
      // Use defaults
    }

    // List available images
    const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
    const rawImages = await fs.readdir(imagesDir, { withFileTypes: true });
    const availableImages: Array<{ name: string; url: string; size: number; mtime: number }> = [];

    for (const ent of rawImages) {
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!imageExtensions.has(ext)) continue;

      try {
        const stat = await fs.stat(path.join(imagesDir, ent.name));
        availableImages.push({
          name: ent.name,
          url: `/images/${encodeURIComponent(ent.name)}`,
          size: stat.size,
          mtime: Math.floor(stat.mtimeMs),
        });
      } catch {}
    }
    availableImages.sort((a, b) => b.mtime - a.mtime);

    // List available videos
    const videoExtensions = new Set([".mp4", ".webm", ".mov"]);
    const rawVideos = await fs.readdir(videosDir, { withFileTypes: true });
    const availableVideos: Array<{ name: string; url: string; size: number; mtime: number }> = [];

    for (const ent of rawVideos) {
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!videoExtensions.has(ext)) continue;

      try {
        const stat = await fs.stat(path.join(videosDir, ent.name));
        availableVideos.push({
          name: ent.name,
          url: `/videos/${encodeURIComponent(ent.name)}`,
          size: stat.size,
          mtime: Math.floor(stat.mtimeMs),
        });
      } catch {}
    }
    availableVideos.sort((a, b) => b.mtime - a.mtime);

    return NextResponse.json({
      ok: true,
      config,
      availableImages,
      availableVideos,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Failed to load homepage media data:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load homepage media data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = normalizeHomepageMedia(body);
    config.updatedAt = new Date().toISOString();

    await fs.writeFile(BACKUP_FILE, JSON.stringify(config, null, 2), "utf-8");

    return NextResponse.json({
      ok: true,
      config,
      message: "Homepage media configuration successfully updated",
    });
  } catch (error: any) {
    console.error("Failed to save homepage media config:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to save homepage media config" },
      { status: 500 }
    );
  }
}
