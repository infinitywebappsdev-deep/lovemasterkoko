import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

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
 * Resizes an existing image file on disk in public/images
 */
async function resizeFileOnDisk(filename: string, targetMaxWidth = 1280) {
  const imagesDir = path.join(process.cwd(), "public", "images");
  const cleanName = path.basename(filename);
  const targetPath = path.join(imagesDir, cleanName);

  const stat = await fs.stat(targetPath);
  const originalSize = stat.size;
  const ext = path.extname(cleanName).toLowerCase();

  const tempId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const outTemp = path.join(os.tmpdir(), `${tempId}_opt${ext}`);

  const scaleFilter = `scale='min(${targetMaxWidth},iw)':-2`;

  await execFileAsync("ffmpeg", [
    "-y",
    "-i", targetPath,
    "-vf", scaleFilter,
    "-q:v", "3",
    "-pix_fmt", "yuvj420p",
    "-map_metadata", "-1",
    outTemp,
  ]);

  const optimizedBuffer = await fs.readFile(outTemp);
  const optimizedSize = optimizedBuffer.length;
  const dimensions = await probeDimensions(outTemp);

  // Overwrite the file on disk with the optimized version if smaller
  if (optimizedSize < originalSize) {
    await fs.writeFile(targetPath, optimizedBuffer);
  }

  await fs.unlink(outTemp).catch(() => {});

  const savingsPercent = originalSize > optimizedSize
    ? Math.round(((originalSize - optimizedSize) / originalSize) * 100)
    : 0;

  return {
    filename: cleanName,
    originalSize,
    optimizedSize: Math.min(originalSize, optimizedSize),
    dimensions,
    savingsPercent,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filename = body.filename as string | undefined;
    const url = body.url as string | undefined;
    const maxWidth = Number(body.maxWidth) || 1280;
    const batchList = body.filenames as string[] | undefined;

    if (batchList && Array.isArray(batchList) && batchList.length > 0) {
      const results = [];
      for (const f of batchList) {
        try {
          const res = await resizeFileOnDisk(f, maxWidth);
          results.push(res);
        } catch (e: any) {
          results.push({ filename: f, error: e?.message });
        }
      }
      return NextResponse.json({
        ok: true,
        batch: true,
        results,
        message: `Processed ${results.length} image(s) for optimal landing page performance.`,
      });
    }

    const targetFile = filename || (url ? path.basename(url) : "");
    if (!targetFile) {
      return NextResponse.json({ ok: false, error: "Must specify filename or url" }, { status: 400 });
    }

    const result = await resizeFileOnDisk(targetFile, maxWidth);

    return NextResponse.json({
      ok: true,
      result,
      message: `Image ${result.filename} was automatically resized to ${result.dimensions} (${result.savingsPercent}% file size reduction).`,
    });
  } catch (error: any) {
    console.error("Image resize error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to resize image" },
      { status: 500 }
    );
  }
}
