import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { ROOMS } from "@/lib/hotel";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const videosDir = path.join(process.cwd(), "public", "videos");
    await fs.mkdir(videosDir, { recursive: true });

    const rawSlug = req.nextUrl.searchParams.get("slug");
    const slug = rawSlug ? rawSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-") : null;

    const statusMap: Record<
      string,
      {
        slug: string;
        url: string;
        exists: boolean;
        size: number;
        mtime: number;
      }
    > = {};

    const checkSlugs = slug ? [slug] : [...ROOMS.map((r) => r.slug), "hero"];

    for (const s of checkSlugs) {
      const filename = `${s}-room.mp4`;
      const targetPath = path.join(videosDir, filename);
      const altPath = path.join(videosDir, `${s}.mp4`);

      let stat = null;
      let finalFile = filename;

      try {
        stat = await fs.stat(targetPath);
      } catch {
        try {
          stat = await fs.stat(altPath);
          finalFile = `${s}.mp4`;
        } catch {
          stat = null;
        }
      }

      if (stat && stat.size > 0) {
        statusMap[s] = {
          slug: s,
          url: `/videos/${finalFile}?v=${stat.mtimeMs}`,
          exists: true,
          size: stat.size,
          mtime: Math.floor(stat.mtimeMs),
        };
      } else {
        statusMap[s] = {
          slug: s,
          url: `/videos/${filename}`,
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
      return NextResponse.json(
        {
          ok: true,
          video: statusMap[slug] || null,
        },
        { headers }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        videos: statusMap,
        timestamp: Date.now(),
      },
      { headers }
    );
  } catch (error) {
    console.error("Failed to query videos:", error);
    return NextResponse.json({ error: "Failed to read video statuses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawSlug = (formData.get("slug") as string | null) || "deluxe";
    let slug = rawSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");

    // Canonical slug normalization
    if (slug === "superexecutive") slug = "super-executive";
    if (slug === "signaturesuite" || slug === "signature-suite" || slug === "luxurysuite") slug = "luxury-suite";
    if (slug === "presidentialsuite" || slug === "presidential-suite") slug = "luxury";
    if (slug === "standardplus") slug = "standard-plus";

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);

    if (originalBuffer.length === 0) {
      return NextResponse.json({ error: "Uploaded video file is empty" }, { status: 400 });
    }

    let finalBuffer = originalBuffer;

    // Optimize with FFmpeg: remux with +faststart for instant progressive web streaming
    try {
      const tempId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const inTemp = path.join(os.tmpdir(), `${tempId}_in${path.extname(file.name) || ".mp4"}`);
      const outTemp = path.join(os.tmpdir(), `${tempId}_out.mp4`);

      await fs.writeFile(inTemp, originalBuffer);

      try {
        // Fast attempt: copy video stream + faststart moov atom to front
        await execFileAsync("ffmpeg", [
          "-y",
          "-i", inTemp,
          "-c:v", "copy",
          "-movflags", "+faststart",
          outTemp,
        ]);
        finalBuffer = await fs.readFile(outTemp);
      } catch {
        // If stream copy fails (e.g., .mov, ProRes, webm, or incompatible pixel format), transcode to standard h264 yuv420p
        try {
          await execFileAsync("ffmpeg", [
            "-y",
            "-i", inTemp,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-an",
            outTemp,
          ]);
          finalBuffer = await fs.readFile(outTemp);
        } catch (transcodeErr) {
          console.warn("FFmpeg transcode skipped, using original buffer:", transcodeErr);
          finalBuffer = originalBuffer;
        }
      } finally {
        await fs.unlink(inTemp).catch(() => {});
        await fs.unlink(outTemp).catch(() => {});
      }
    } catch (optErr) {
      console.warn("Video optimization error, fallback to raw buffer:", optErr);
      finalBuffer = originalBuffer;
    }

    const videosDir = path.join(process.cwd(), "public", "videos");
    await fs.mkdir(videosDir, { recursive: true });

    // 1. Primary standard filename: [slug]-room.mp4
    const filename = `${slug}-room.mp4`;
    const targetPath = path.join(videosDir, filename);
    await fs.writeFile(targetPath, finalBuffer);

    // Helper to safely write symlink for alias
    const linkAlias = async (aliasFilename: string) => {
      if (aliasFilename === filename) return;
      const aliasPath = path.join(videosDir, aliasFilename);
      await fs.unlink(aliasPath).catch(() => {});
      await fs.symlink(filename, aliasPath).catch(() => {});
    };

    // 2. Backwards-compatible alias: [slug].mp4
    await linkAlias(`${slug}.mp4`);

    // 3. Handle hyphenated variations (e.g. super-executive vs superexecutive)
    const normalizedNoHyphen = slug.replace(/-/g, "");
    if (normalizedNoHyphen !== slug) {
      await linkAlias(`${normalizedNoHyphen}-room.mp4`);
      await linkAlias(`${normalizedNoHyphen}.mp4`);
    }

    if (slug === "hero" || slug === "header") {
      await linkAlias("hero.mp4");
      await linkAlias("hero-room.mp4");
    }

    // 4. Update manifest for atomic lookup
    const manifestPath = path.join(videosDir, "manifest.json");
    let manifest: Record<string, { url: string; updatedAt: number; size: number }> = {};
    try {
      const existing = await fs.readFile(manifestPath, "utf-8");
      manifest = JSON.parse(existing);
    } catch {
      manifest = {};
    }

    const now = Date.now();
    manifest[slug] = {
      url: `/videos/${filename}`,
      updatedAt: now,
      size: finalBuffer.length,
    };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const responseUrl = `/videos/${filename}?v=${now}`;

    return NextResponse.json({
      success: true,
      url: responseUrl,
      rawUrl: `/videos/${filename}`,
      mtime: now,
      size: finalBuffer.length,
      slug,
      filename,
      message: `Video header for ${slug} successfully saved and activated in /public/videos/${filename}!`,
    });
  } catch (error) {
    console.error("Failed to upload video:", error);
    return NextResponse.json({ error: "Failed to upload video file" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rawSlug = req.nextUrl.searchParams.get("slug");
    let slug = rawSlug ? rawSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-") : "";

    if (!slug) {
      try {
        const body = await req.json();
        if (body.slug) {
          slug = String(body.slug).trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
        }
      } catch {
        // body might be empty
      }
    }

    if (!slug) {
      return NextResponse.json({ error: "Room slug is required for deletion" }, { status: 400 });
    }

    const videosDir = path.join(process.cwd(), "public", "videos");
    const filenames = [
      `${slug}-room.mp4`,
      `${slug}.mp4`,
      `${slug.replace(/-/g, "")}-room.mp4`,
      `${slug.replace(/-/g, "")}.mp4`,
    ];

    let deletedAny = false;
    for (const f of Array.from(new Set(filenames))) {
      const p = path.join(videosDir, f);
      try {
        await fs.unlink(p);
        deletedAny = true;
      } catch {
        // ignore missing files
      }
    }

    // Clean up manifest
    try {
      const manifestPath = path.join(videosDir, "manifest.json");
      const manifestData = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestData);
      if (manifest[slug]) {
        delete manifest[slug];
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      }
    } catch {
      // manifest might not exist
    }

    return NextResponse.json({
      success: true,
      slug,
      message: `Video header for room '${slug}' deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete video:", error);
    return NextResponse.json({ error: "Failed to delete video file" }, { status: 500 });
  }
}

