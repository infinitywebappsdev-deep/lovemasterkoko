import { NextRequest, NextResponse } from "next/server";

import { ROOMS } from "@/lib/hotel";
import { requireStaff, jsonError } from "@/lib/booking/auth";
import {
  deleteMedia,
  statMedia,
  writeMedia,
  writeMediaJson,
  readMediaJson,
} from "@/lib/media/store";

export const dynamic = "force-dynamic";

const MANIFEST_KEY = "config/video-manifest.json";

type VideoManifest = Record<string, { url: string; updatedAt: number; size: number }>;

function normalizeSlug(raw: string): string {
  let slug = (raw || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
  if (slug === "superexecutive") slug = "super-executive";
  if (slug === "signaturesuite" || slug === "signature-suite" || slug === "luxurysuite") {
    slug = "luxury-suite";
  }
  if (slug === "presidentialsuite" || slug === "presidential-suite") slug = "luxury";
  if (slug === "standardplus") slug = "standard-plus";
  return slug;
}

/** Candidate filenames for a room header video, in priority order. */
function candidateFilenames(slug: string): string[] {
  const names = [`${slug}-room.mp4`, `${slug}.mp4`];
  const noHyphen = slug.replace(/-/g, "");
  if (noHyphen !== slug) {
    names.push(`${noHyphen}-room.mp4`, `${noHyphen}.mp4`);
  }
  if (slug === "hero" || slug === "header") {
    names.push("hero.mp4", "hero-room.mp4");
  }
  return [...new Set(names)];
}

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const rawSlug = req.nextUrl.searchParams.get("slug");
    const slug = rawSlug ? normalizeSlug(rawSlug) : null;
    const checkSlugs = slug ? [slug] : [...ROOMS.map((room) => room.slug), "hero"];

    const statusMap: Record<
      string,
      { slug: string; url: string; exists: boolean; size: number; mtime: number }
    > = {};

    for (const target of checkSlugs) {
      let resolved: { filename: string; size: number; mtime: number; source: string } | null = null;

      for (const filename of candidateFilenames(target)) {
        const stat = await statMedia("videos", filename);
        if (stat && stat.size > 0) {
          resolved = { filename, ...stat };
          break;
        }
      }

      if (resolved) {
        const prefix = resolved.source === "static" ? "/videos" : "/media/videos";
        statusMap[target] = {
          slug: target,
          url: `${prefix}/${resolved.filename}?v=${resolved.mtime}`,
          exists: true,
          size: resolved.size,
          mtime: Math.floor(resolved.mtime / 1000) * 1000,
        };
      } else {
        statusMap[target] = {
          slug: target,
          url: `/videos/${target}-room.mp4`,
          exists: false,
          size: 0,
          mtime: 0,
        };
      }
    }

    const headers = {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    if (slug) {
      return NextResponse.json({ ok: true, video: statusMap[slug] || null }, { headers });
    }

    return NextResponse.json(
      { ok: true, videos: statusMap, timestamp: Date.now() },
      { headers }
    );
  } catch (error) {
    console.error("Failed to query videos:", error);
    return NextResponse.json({ error: "Failed to read video statuses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const slug = normalizeSlug((formData.get("slug") as string | null) || "deluxe");

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length === 0) {
      return NextResponse.json({ error: "Uploaded video file is empty" }, { status: 400 });
    }

    const contentType = file.type && file.type.startsWith("video/") ? file.type : "video/mp4";
    const filename = `${slug}-room.mp4`;

    // The Worker runtime has no ffmpeg, so the upload is stored byte-for-byte.
    // Only exact copies are made for the alias filenames older links still use.
    const aliases = candidateFilenames(slug).filter((name) => name !== filename);

    await writeMedia("videos", filename, bytes, contentType);
    for (const alias of aliases) {
      await writeMedia("videos", alias, bytes, contentType);
    }

    const now = Date.now();

    const manifest = (await readMediaJson<VideoManifest>(MANIFEST_KEY)) || {};
    manifest[slug] = { url: `/media/videos/${filename}`, updatedAt: now, size: bytes.length };
    await writeMediaJson(MANIFEST_KEY, manifest);

    return NextResponse.json({
      success: true,
      url: `/media/videos/${filename}?v=${now}`,
      rawUrl: `/media/videos/${filename}`,
      mtime: now,
      size: bytes.length,
      slug,
      filename,
      optimized: false,
      message: `Video for ${slug} uploaded and activated (${filename}).`,
    });
  } catch (error) {
    console.error("Failed to upload video:", error);
    return NextResponse.json({ error: "Failed to upload video file" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const rawSlug = req.nextUrl.searchParams.get("slug");
    let slug = rawSlug ? normalizeSlug(rawSlug) : "";

    if (!slug) {
      try {
        const body = await req.json();
        if (body?.slug) slug = normalizeSlug(String(body.slug));
      } catch {
        // Body was empty — the query string is the only source.
      }
    }

    if (!slug) {
      return NextResponse.json({ error: "Room slug is required for deletion" }, { status: 400 });
    }

    const deleted: string[] = [];
    for (const filename of candidateFilenames(slug)) {
      if (await deleteMedia("videos", filename)) deleted.push(filename);
    }

    const manifest = (await readMediaJson<VideoManifest>(MANIFEST_KEY)) || {};
    if (manifest[slug]) {
      delete manifest[slug];
      await writeMediaJson(MANIFEST_KEY, manifest);
    }

    return NextResponse.json({
      success: true,
      slug,
      deleted,
      message: `Video header for room '${slug}' deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete video:", error);
    return NextResponse.json({ error: "Failed to delete video file" }, { status: 500 });
  }
}
