import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const tempDir = path.join(
    os.tmpdir(),
    `stitch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  );

  try {
    const formData = await req.formData();
    let slug = (formData.get("slug") as string | null) || "luxury";
    if (slug === "presidential-suite" || slug === "luxury-suite") slug = "luxury";
    const transition = (formData.get("transition") as string | null) || "crossfade";
    const colorGrade = (formData.get("colorGrade") as string | null) || "warm_luxury";
    const conversionMode = (formData.get("conversionMode") as string | null) || "crop_fill";
    const targetDuration = Math.min(Math.max(Number(formData.get("targetDuration")) || 20, 10), 45);

    // Gather all uploaded video files from formData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (
        (key === "videos" || key === "files" || key.startsWith("clip_") || key === "file") &&
        value instanceof File &&
        value.size > 0
      ) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No video clips provided for stitching. Please upload at least 1 video clip (e.g., a1.mp4, a2.mp4, a3.mp4, a4.mp4)." },
        { status: 400 }
      );
    }

    await fs.mkdir(tempDir, { recursive: true });

    // 1. Save uploaded clips to temp directory
    const inputPaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || ".mp4";
      const inputPath = path.join(tempDir, `raw_clip_${i}${ext}`);
      await fs.writeFile(inputPath, buffer);
      inputPaths.push(inputPath);
    }

    // Determine target per-clip duration
    const perClipDuration = Math.max(targetDuration / files.length, 3.5);

    // 2. Normalize each clip to 1080p (1920x1080), 30fps, 16:9 Landscape, H.264 video
    // Converts portrait/vertical video to landscape seamlessly
    const normalizedPaths: string[] = [];
    const clipDurations: number[] = [];

    for (let i = 0; i < inputPaths.length; i++) {
      const normPath = path.join(tempDir, `norm_clip_${i}.mp4`);

      // Video filter: Scale and crop to fit 1920x1080 landscape 16:9 format
      let vf = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p";
      if (conversionMode === "ambient_wings") {
        vf = "split[a][b];[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=20:5[bg];[b]scale=1920:1080:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=30,format=yuv420p";
      }

      await execFileAsync("ffmpeg", [
        "-y",
        "-t", String(perClipDuration + (transition === "crossfade" ? 1.0 : 0)),
        "-i", inputPaths[i],
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "22",
        "-an", // Always completely silent for luxury room background headers
        normPath,
      ]);

      // Inspect duration of normalized clip
      let dur = perClipDuration;
      try {
        const { stdout } = await execFileAsync("ffprobe", [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "default=noprint_wrappers=1:nokey=1",
          normPath,
        ]);
        dur = parseFloat(stdout.trim()) || perClipDuration;
      } catch {
        dur = perClipDuration;
      }

      clipDurations.push(dur);
      normalizedPaths.push(normPath);
    }

    // 3. Stitch normalized clips together
    const stitchedMasterPath = path.join(tempDir, "stitched_master.mp4");

    // Color grading filter: warm luxury tone curve
    const colorGradeFilter =
      colorGrade === "warm_luxury"
        ? ",eq=contrast=1.05:saturation=1.12:brightness=0.01,colorbalance=rs=0.04:gs=0.01:bs=-0.02:rm=0.04:gm=0.01:bm=-0.03"
        : "";

    if (normalizedPaths.length === 1) {
      // Single clip: re-encode with color grade and faststart
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", normalizedPaths[0],
        "-vf", `format=yuv420p${colorGradeFilter}`,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-movflags", "+faststart",
        stitchedMasterPath,
      ]);
    } else if (transition === "crossfade" && normalizedPaths.length >= 2) {
      // Build complex xfade filter graph
      const transitionDuration = 0.8;
      const ffmpegArgs: string[] = ["-y"];

      for (const p of normalizedPaths) {
        ffmpegArgs.push("-i", p);
      }

      let filterGraph = "";
      let currentOffset = 0;
      let lastOutput = "[0:v]";

      for (let i = 0; i < normalizedPaths.length - 1; i++) {
        const nextInput = `[${i + 1}:v]`;
        const outLabel = `[xf_${i}]`;
        const durA = clipDurations[i];
        currentOffset += Math.max(durA - transitionDuration, 1.0);

        filterGraph += `${lastOutput}${nextInput}xfade=transition=fade:duration=${transitionDuration}:offset=${currentOffset.toFixed(2)}${outLabel}; `;
        lastOutput = outLabel;
      }

      filterGraph += `${lastOutput}format=yuv420p${colorGradeFilter}[vfinal]`;

      ffmpegArgs.push(
        "-filter_complex", filterGraph,
        "-map", "[vfinal]",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-movflags", "+faststart",
        stitchedMasterPath
      );

      await execFileAsync("ffmpeg", ffmpegArgs);
    } else {
      // Direct cuts via concat
      const concatListFile = path.join(tempDir, "concat_list.txt");
      const concatContent = normalizedPaths
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join("\n");
      await fs.writeFile(concatListFile, concatContent);

      await execFileAsync("ffmpeg", [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concatListFile,
        "-vf", `format=yuv420p${colorGradeFilter}`,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-movflags", "+faststart",
        stitchedMasterPath,
      ]);
    }

    // 4. Save to public/videos/${slug}-room.mp4 & public/videos/${slug}.mp4
    const publicVideosDir = path.join(process.cwd(), "public", "videos");
    await fs.mkdir(publicVideosDir, { recursive: true });

    const finalBuffer = await fs.readFile(stitchedMasterPath);
    const targetFilename = `${slug}-room.mp4`;
    const targetPath = path.join(publicVideosDir, targetFilename);
    const aliasPath = path.join(publicVideosDir, `${slug}.mp4`);

    await fs.writeFile(targetPath, finalBuffer);
    await fs.writeFile(aliasPath, finalBuffer);

    const noHyphen = slug.replace(/-/g, "");
    if (noHyphen !== slug) {
      await fs.writeFile(path.join(publicVideosDir, `${noHyphen}-room.mp4`), finalBuffer);
      await fs.writeFile(path.join(publicVideosDir, `${noHyphen}.mp4`), finalBuffer);
    }

    if (slug === "hero" || slug === "header") {
      await fs.writeFile(path.join(publicVideosDir, "hero.mp4"), finalBuffer);
    }

    // Update manifest
    try {
      const manifestPath = path.join(publicVideosDir, "manifest.json");
      let manifest: any = {};
      try {
        const existing = await fs.readFile(manifestPath, "utf-8");
        manifest = JSON.parse(existing);
      } catch {}
      manifest[slug] = {
        url: `/videos/${targetFilename}`,
        updatedAt: Date.now(),
        size: finalBuffer.length,
      };
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    } catch {}

    // 5. Inspect resulting duration and size
    let durationSec = 0;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        targetPath,
      ]);
      durationSec = parseFloat(stdout.trim()) || 0;
    } catch {
      // ignore probe error
    }

    const now = Date.now();
    return NextResponse.json({
      success: true,
      url: `/videos/${targetFilename}?v=${now}`,
      aliasUrl: `/videos/${slug}.mp4?v=${now}`,
      rawUrl: `/videos/${targetFilename}`,
      slug,
      clipsCount: files.length,
      duration: Math.round(durationSec * 10) / 10,
      sizeBytes: finalBuffer.length,
      message: `Successfully stitched ${files.length} video clip(s) into 16:9 landscape luxury header for ${slug}!`,
    });
  } catch (error: any) {
    console.error("Video stitching failed:", error);
    return NextResponse.json(
      {
        error: "Failed to stitch video clips",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  } finally {
    // Cleanup temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
