import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

/**
 * Probes image dimensions using ffprobe
 */
async function probeDimensions(filePath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x",
      filePath,
    ]);
    return stdout.trim() || "";
  } catch {
    return "";
  }
}

/**
 * Automatically resizes and optimizes image files for optimal landing page performance
 */
async function resizeAndOptimizeImage(
  inputBuffer: Buffer,
  originalExt: string,
  targetSection: string
): Promise<{ buffer: Buffer; dimensions: string; originalSize: number; optimizedSize: number; savingsPercent: number }> {
  const originalSize = inputBuffer.length;

  // Determine target max width based on section placement on the landing page
  let maxWidth = 1280;
  let qualityFactor = 3; // ffmpeg mjpeg q:v scale (2-4 is visually lossless, ~80-85% quality)

  if (targetSection === "hero" || targetSection === "hero-poster") {
    maxWidth = 1920; // Full HD desktop hero
    qualityFactor = 3;
  } else if (targetSection === "gallery") {
    maxWidth = 1280; // Grid photos: optimal balance between crispness on 4K/retina and fast 200KB payload
    qualityFactor = 3;
  } else if (targetSection.startsWith("about") || targetSection.startsWith("exp")) {
    maxWidth = 1200; // Showcase & dining cards
    qualityFactor = 3;
  }

  const tempId = `img_opt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ext = originalExt.toLowerCase();
  const isPng = ext === ".png";
  const isWebp = ext === ".webp";

  const inTemp = path.join(os.tmpdir(), `${tempId}_in${ext}`);
  const outTemp = path.join(os.tmpdir(), `${tempId}_out${ext}`);

  try {
    await fs.writeFile(inTemp, inputBuffer);

    // Filter to scale down only if wider than maxWidth, keeping aspect ratio and ensuring even dimensions
    const scaleFilter = `scale='min(${maxWidth},iw)':-2`;

    if (isPng) {
      // PNG: preserve transparency while scaling
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", inTemp,
        "-vf", scaleFilter,
        "-map_metadata", "-1",
        outTemp,
      ]);
    } else if (isWebp) {
      // WebP
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", inTemp,
        "-vf", scaleFilter,
        "-quality", "82",
        "-map_metadata", "-1",
        outTemp,
      ]);
    } else {
      // Standard JPEG: strip EXIF/GPS, scale down, and encode with optimal progressive compression
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", inTemp,
        "-vf", scaleFilter,
        "-q:v", String(qualityFactor),
        "-pix_fmt", "yuvj420p",
        "-map_metadata", "-1",
        outTemp,
      ]);
    }

    const optimizedBuffer = await fs.readFile(outTemp);
    const dimensions = await probeDimensions(outTemp);
    const optimizedSize = optimizedBuffer.length;
    const savingsPercent = originalSize > optimizedSize
      ? Math.round(((originalSize - optimizedSize) / originalSize) * 100)
      : 0;

    return {
      buffer: optimizedBuffer,
      dimensions,
      originalSize,
      optimizedSize,
      savingsPercent,
    };
  } catch (err) {
    console.warn("FFmpeg image resize fallback to original buffer:", err);
    return {
      buffer: inputBuffer,
      dimensions: "",
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
    };
  } finally {
    await fs.unlink(inTemp).catch(() => {});
    await fs.unlink(outTemp).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
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

    const imagesDir = path.join(process.cwd(), "public", "images");
    const videosDir = path.join(process.cwd(), "public", "videos");
    await fs.mkdir(imagesDir, { recursive: true });
    await fs.mkdir(videosDir, { recursive: true });

    const uploadedAssets: Array<{
      url: string;
      name: string;
      type: "image" | "video";
      size: number;
      originalSize?: number;
      savingsPercent?: number;
      dimensions?: string;
      title: string;
    }> = [];

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const rawName = file.name || `asset-${Date.now()}-${i}`;
      const ext = path.extname(rawName).toLowerCase();
      const isVideo = [".mp4", ".mov", ".webm", ".m4v"].includes(ext) || file.type.startsWith("video/");

      const bytes = await file.arrayBuffer();
      const originalBuffer = Buffer.from(bytes);

      if (isVideo) {
        // Optimize video with FFmpeg (+faststart moov atom)
        let finalVideoBuffer = originalBuffer;
        const tempId = `hm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const inTemp = path.join(os.tmpdir(), `${tempId}_in${ext || ".mp4"}`);
        const outTemp = path.join(os.tmpdir(), `${tempId}_out.mp4`);

        try {
          await fs.writeFile(inTemp, originalBuffer);
          try {
            await execFileAsync("ffmpeg", [
              "-y",
              "-i", inTemp,
              "-c:v", "copy",
              "-movflags", "+faststart",
              outTemp,
            ]);
            finalVideoBuffer = await fs.readFile(outTemp);
          } catch {
            // Fallback transcode to standard h264 yuv420p
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
              finalVideoBuffer = await fs.readFile(outTemp);
            } catch {
              finalVideoBuffer = originalBuffer;
            }
          }
        } catch {
          finalVideoBuffer = originalBuffer;
        } finally {
          await fs.unlink(inTemp).catch(() => {});
          await fs.unlink(outTemp).catch(() => {});
        }

        // Clean video filename
        let cleanBase = path.basename(rawName, ext).toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
        const isHeroVideo = targetSection === "hero" || targetSection === "hero-video";
        const uniqueTimestamp = Date.now().toString().slice(-6);
        const videoFilename = isHeroVideo
          ? `hero-${Date.now()}.mp4`
          : `${cleanBase || "video"}-${uniqueTimestamp}${ext === ".mov" ? ".mp4" : ext || ".mp4"}`;

        const targetPath = path.join(videosDir, videoFilename);
        await fs.writeFile(targetPath, finalVideoBuffer);

        // Attempt extracting a high-res poster frame at second 1 for instant background rendering
        let posterUrl: string | undefined = undefined;
        if (isHeroVideo) {
          const posterFilename = `hero-poster-${Date.now()}.jpg`;
          const posterPath = path.join(imagesDir, posterFilename);
          try {
            await execFileAsync("ffmpeg", [
              "-y",
              "-ss", "00:00:01",
              "-i", targetPath,
              "-frames:v", "1",
              "-q:v", "2",
              posterPath,
            ]);
            posterUrl = `/images/${posterFilename}`;
          } catch (posterErr) {
            console.warn("Could not extract hero poster:", posterErr);
          }

          // Keep public/homepage-media.json fallback file updated
          try {
            const configPath = path.join(process.cwd(), "public", "homepage-media.json");
            const raw = await fs.readFile(configPath, "utf-8").catch(() => "{}");
            const currentConfig = JSON.parse(raw);
            if (!currentConfig.hero) currentConfig.hero = {};
            currentConfig.hero.videoUrl = `/videos/${videoFilename}`;
            currentConfig.hero.isVideoEnabled = true;
            if (posterUrl) {
              currentConfig.hero.posterImage = posterUrl;
            }
            await fs.writeFile(configPath, JSON.stringify(currentConfig, null, 2), "utf-8");
          } catch (err) {
            console.warn("Could not write homepage-media.json fallback:", err);
          }
        }

        uploadedAssets.push({
          url: `/videos/${videoFilename}`,
          name: videoFilename,
          type: "video",
          size: finalVideoBuffer.length,
          title: customTitle || (isHeroVideo ? "Hero Background Video" : cleanBase.replace(/-/g, " ")),
          ...(posterUrl ? { posterUrl } : {}),
        });
      } else {
        // Automatic Image Resizing & Compression for fast load times
        const {
          buffer: optimizedBuffer,
          dimensions,
          originalSize,
          optimizedSize,
          savingsPercent,
        } = await resizeAndOptimizeImage(originalBuffer, ext || ".jpg", targetSection);

        // Clean and safe filename
        const cleanBase = path.basename(rawName, ext).replace(/[^\w\s.-]/gi, "_").trim();
        const safeFilename = `${cleanBase}${ext || ".jpg"}`;
        const targetPath = path.join(imagesDir, safeFilename);

        await fs.writeFile(targetPath, optimizedBuffer);

        uploadedAssets.push({
          url: `/images/${safeFilename}`,
          name: safeFilename,
          type: "image",
          size: optimizedSize,
          originalSize,
          savingsPercent,
          dimensions,
          title: customTitle || cleanBase.replace(/[_-]/g, " "),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      assets: uploadedAssets,
      count: uploadedAssets.length,
      message: `Successfully uploaded and auto-resized ${uploadedAssets.length} file(s) for the home landing page.`,
    });
  } catch (error: any) {
    console.error("Home media upload error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to upload file(s)" },
      { status: 500 }
    );
  }
}
