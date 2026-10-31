import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_HOMEPAGE_MEDIA,
  HomepageMediaConfig,
  normalizeHomepageMedia,
} from "@/lib/homepage-media";
import { requireStaff, jsonError } from "@/lib/booking/auth";
import { listMedia, readMediaJson, writeMediaJson } from "@/lib/media/store";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "config/homepage-media.json";

export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const stored = await readMediaJson<HomepageMediaConfig>(CONFIG_KEY);
    const config = stored ? normalizeHomepageMedia(stored) : { ...DEFAULT_HOMEPAGE_MEDIA };

    const availableImages = (await listMedia("images"))
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        url:
          entry.source === "static"
            ? `/images/${encodeURIComponent(entry.name)}`
            : `/media/images/${encodeURIComponent(entry.name)}`,
        size: entry.size,
        mtime: Math.floor(entry.mtime / 1000) * 1000,
      }));

    const availableVideos = (await listMedia("videos"))
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        url:
          entry.source === "static"
            ? `/videos/${encodeURIComponent(entry.name)}`
            : `/media/videos/${encodeURIComponent(entry.name)}`,
        size: entry.size,
        mtime: Math.floor(entry.mtime / 1000) * 1000,
      }));

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
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const body = await req.json();
    const config = normalizeHomepageMedia(body);
    config.updatedAt = new Date().toISOString();

    await writeMediaJson(CONFIG_KEY, config);

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
