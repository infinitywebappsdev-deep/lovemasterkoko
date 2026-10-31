import { NextRequest, NextResponse } from "next/server";

import {
  contentTypeFor,
  readMedia,
  safeMediaName,
  statMedia,
  type MediaFolder,
} from "@/lib/media/store";

/**
 * Serves admin-uploaded media from the `FILES` bucket.
 *
 * URLs look like `/media/images/<file>` and `/media/videos/<file>`. Files that
 * were never uploaded (they ship inside the deployment bundle) are redirected
 * to their normal `/images/...` or `/videos/...` address, so a URL produced in
 * one environment keeps working in the other.
 */

export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Accept-Ranges, Content-Range, Content-Type, Origin, Accept",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges, ETag",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Accept-Ranges": "bytes",
};

function resolveTarget(key: string[] | undefined): { folder: MediaFolder; name: string } | null {
  if (!key || key.length < 2) return null;
  const [folder, ...rest] = key;
  if (folder !== "images" && folder !== "videos") return null;
  const name = safeMediaName(rest.join("/"));
  if (!name) return null;
  return { folder, name };
}

/** Parses a single `bytes=` range; returns null when absent or unusable. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header || !header.startsWith("bytes=")) return null;
  const [spec] = header.replace("bytes=", "").split(",");
  const [rawStart, rawEnd] = spec.split("-");

  if (rawStart === "" && rawEnd === "") return null;

  if (rawStart === "") {
    // Suffix range: the final N bytes.
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= size || start > end) return null;
  return { start, end: Math.min(end, size - 1) };
}

async function handle(req: NextRequest, key: string[] | undefined, headOnly: boolean) {
  const target = resolveTarget(key);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
  }

  const { folder, name } = target;
  const stat = await statMedia(folder, name);

  if (!stat) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
  }

  if (stat.source === "static") {
    const url = new URL(`/${folder}/${encodeURIComponent(name)}`, req.nextUrl.origin);
    return NextResponse.redirect(url, 302);
  }

  const requested = parseRange(req.headers.get("range"), stat.size);
  if (req.headers.get("range") && !requested) {
    return new NextResponse(null, {
      status: 416,
      headers: { ...CORS_HEADERS, "Content-Range": `bytes */${stat.size}` },
    });
  }

  if (headOnly) {
    return new NextResponse(null, {
      status: requested ? 206 : 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": contentTypeFor(name),
        "Content-Length": String(requested ? requested.end - requested.start + 1 : stat.size),
        ...(requested
          ? { "Content-Range": `bytes ${requested.start}-${requested.end}/${stat.size}` }
          : {}),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  }

  const media = await readMedia(folder, name, requested || undefined);
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
  }

  return new NextResponse(media.body as BodyInit, {
    status: requested ? 206 : 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": media.contentType,
      "Content-Length": String(media.length),
      ...(requested ? { "Content-Range": `bytes ${media.start}-${media.end}/${media.size}` } : {}),
      ...(media.etag ? { ETag: media.etag } : {}),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  return handle(req, (await ctx.params).key, false);
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  return handle(req, (await ctx.params).key, true);
}
