import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Accept-Ranges, Content-Range, Content-Type, Origin, Accept",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Accept-Ranges": "bytes",
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  return handleVideoRequest(req, (await params).file, true);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  return handleVideoRequest(req, (await params).file, false);
}

async function handleVideoRequest(
  req: NextRequest,
  fileParts: string[] | undefined,
  isHead: boolean
) {
  try {
    const rawFilename = fileParts ? fileParts.join("/") : "";
    const cleanFilename = path.basename(rawFilename);

    if (!cleanFilename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400, headers: CORS_HEADERS });
    }

    const videosDir = path.join(process.cwd(), "public", "videos");
    let targetPath = path.join(videosDir, cleanFilename);

    // Fallback checks for alias variations
    if (!fs.existsSync(targetPath)) {
      if (cleanFilename.endsWith("-room.mp4")) {
        const alt = path.join(videosDir, cleanFilename.replace("-room.mp4", ".mp4"));
        if (fs.existsSync(alt)) targetPath = alt;
      } else if (cleanFilename.endsWith(".mp4")) {
        const alt = path.join(videosDir, cleanFilename.replace(".mp4", "-room.mp4"));
        if (fs.existsSync(alt)) targetPath = alt;
      }
    }

    // Default fallback to executive-room.mp4 if requested video does not exist
    if (!fs.existsSync(targetPath)) {
      const defaultVideo = path.join(videosDir, "executive-room.mp4");
      if (fs.existsSync(defaultVideo)) {
        targetPath = defaultVideo;
      } else {
        return NextResponse.json({ error: "Video not found" }, { status: 404, headers: CORS_HEADERS });
      }
    }

    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = ext === ".webm" ? "video/webm" : ext === ".mov" ? "video/quicktime" : "video/mp4";

    const rangeHeader = req.headers.get("range");

    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            ...CORS_HEADERS,
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;

      if (isHead) {
        return new NextResponse(null, {
          status: 206,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Content-Length": String(chunkSize),
          },
        });
      }

      const nodeStream = fs.createReadStream(targetPath, { start, end });
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on("data", (chunk) => controller.enqueue(chunk));
          nodeStream.on("end", () => controller.close());
          nodeStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": String(chunkSize),
        },
      });
    }

    if (isHead) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": contentType,
          "Content-Length": String(fileSize),
        },
      });
    }

    const nodeStream = fs.createReadStream(targetPath);
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": contentType,
        "Content-Length": String(fileSize),
      },
    });
  } catch (err) {
    console.error("Error serving video:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: CORS_HEADERS });
  }
}
