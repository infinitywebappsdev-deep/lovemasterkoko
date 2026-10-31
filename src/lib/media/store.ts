import "server-only";

import path from "path";

import staticManifest from "./static-manifest.json";

/**
 * Media storage for uploaded assets.
 *
 * The deployment target (Cloudflare Workers behind OpenNext) has a read-only
 * filesystem and no ffmpeg/sharp, so anything an admin uploads cannot be
 * written next to the bundled `public/` files. Uploads therefore go to the
 * `FILES` R2 bucket and are served through `/media/...`.
 *
 * When no R2 binding is available (plain `next dev`/`next start` on Node) the
 * same API writes to `public/<folder>` so local development keeps behaving the
 * way it always has.
 */

export type MediaFolder = "images" | "videos";

export interface MediaEntry {
  name: string;
  size: number;
  mtime: number;
  /** Where the bytes live: the deployment bundle or uploaded storage. */
  source: "static" | "storage";
}

export interface MediaReadResult {
  body: ReadableStream | Uint8Array;
  /** Byte length of the body that was read. */
  length: number;
  /** Total size of the stored object. */
  size: number;
  contentType: string;
  start: number;
  end: number;
  etag?: string;
  source: "static" | "storage";
}

interface R2ObjectLike {
  key: string;
  size: number;
  uploaded?: Date;
  httpEtag?: string;
  httpMetadata?: { contentType?: string };
  body?: ReadableStream;
}

interface R2BucketLike {
  get(key: string, options?: { range?: { offset: number; length?: number } }): Promise<R2ObjectLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
  ): Promise<unknown>;
  delete(key: string | string[]): Promise<void>;
  list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ objects: R2ObjectLike[]; truncated: boolean; cursor?: string }>;
}

/**
 * Filesystem access is only used outside Workers, so it is imported lazily:
 * the deployment runtime has no writable disk and must never load it.
 */
async function diskFs() {
  return import("fs/promises");
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".json": "application/json",
};

const STATIC_INVENTORY: Record<MediaFolder, MediaEntry[]> = {
  images: (staticManifest.images as Array<{ name: string; size: number; mtime: number }>).map((item) => ({
    ...item,
    source: "static" as const,
  })),
  videos: (staticManifest.videos as Array<{ name: string; size: number; mtime: number }>).map((item) => ({
    ...item,
    source: "static" as const,
  })),
};

export function contentTypeFor(name: string): string {
  return CONTENT_TYPES[path.extname(name).toLowerCase()] || "application/octet-stream";
}

/** Rejects anything that could escape the media folder. */
export function safeMediaName(rawName: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(rawName || "");
    } catch {
      return rawName || "";
    }
  })();

  const base = path.basename(decoded.split("?")[0]).replace(/\0/g, "").trim();
  if (!base || base === "." || base === ".." || base.includes("..")) return "";
  return base;
}

let storagePromise: Promise<R2BucketLike | null> | undefined;

/**
 * Resolves the R2 bucket bound to the deployment, or null outside Workers.
 */
export function getStorage(): Promise<R2BucketLike | null> {
  if (!storagePromise) {
    storagePromise = (async () => {
      try {
        const mod = (await import("@opennextjs/cloudflare")) as {
          getCloudflareContext?: (options?: { async?: boolean }) => unknown;
        };
        if (typeof mod.getCloudflareContext === "function") {
          // In the Worker runtime this is synchronous; during `next dev` the
          // helper is only available in async mode and throws otherwise.
          let context: unknown;
          try {
            context = mod.getCloudflareContext({ async: false });
          } catch {
            try {
              context = await mod.getCloudflareContext({ async: true });
            } catch {
              context = undefined;
            }
          }

          const env = (context as { env?: Record<string, unknown> } | undefined)?.env;
          const bucket = env?.FILES as R2BucketLike | undefined;
          if (bucket && typeof bucket.put === "function") return bucket;
        }
      } catch {
        // @opennextjs/cloudflare is only present for the Sites build.
      }
      return null;
    })();
  }
  return storagePromise;
}

export async function hasStorage(): Promise<boolean> {
  return (await getStorage()) !== null;
}

function keyFor(folder: MediaFolder, name: string): string {
  return `${folder}/${safeMediaName(name)}`;
}

async function listStorage(folder: MediaFolder): Promise<MediaEntry[]> {
  const bucket = await getStorage();
  if (!bucket) return [];

  const entries: MediaEntry[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    const page = await bucket.list({ prefix: `${folder}/`, cursor, limit: 500 });
    for (const object of page.objects || []) {
      const name = object.key.slice(folder.length + 1);
      if (!name || name.includes("/")) continue;
      entries.push({
        name,
        size: object.size,
        mtime: object.uploaded ? new Date(object.uploaded).getTime() : Date.now(),
        source: "storage",
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
    pages += 1;
  } while (cursor && pages < 20);

  return entries;
}

async function listDisk(folder: MediaFolder): Promise<MediaEntry[]> {
  const dir = path.join(process.cwd(), "public", folder);
  const fs = await diskFs();
  try {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const entries: MediaEntry[] = [];
    for (const entry of dirents) {
      if (!entry.isFile()) continue;
      try {
        const stat = await fs.stat(path.join(dir, entry.name));
        entries.push({
          name: entry.name,
          size: stat.size,
          mtime: Math.floor(stat.mtimeMs),
          source: "storage",
        });
      } catch {
        // File vanished between readdir and stat.
      }
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Lists bundled assets merged with uploaded objects (uploads win on name).
 */
export async function listMedia(folder: MediaFolder): Promise<MediaEntry[]> {
  const merged = new Map<string, MediaEntry>();

  for (const entry of STATIC_INVENTORY[folder]) {
    merged.set(entry.name.toLowerCase(), entry);
  }

  const uploaded = (await hasStorage()) ? await listStorage(folder) : await listDisk(folder);
  for (const entry of uploaded) {
    merged.set(entry.name.toLowerCase(), entry);
  }

  return [...merged.values()].sort((a, b) => b.mtime - a.mtime);
}

export async function statMedia(
  folder: MediaFolder,
  rawName: string
): Promise<{ size: number; mtime: number; source: "static" | "storage" } | null> {
  const name = safeMediaName(rawName);
  if (!name) return null;

  const bucket = await getStorage();
  if (bucket) {
    const object = await bucket.head(keyFor(folder, name));
    if (object) {
      return {
        size: object.size,
        mtime: object.uploaded ? new Date(object.uploaded).getTime() : Date.now(),
        source: "storage",
      };
    }
  } else {
    const fs = await diskFs();
    try {
      const stat = await fs.stat(path.join(process.cwd(), "public", folder, name));
      return { size: stat.size, mtime: Math.floor(stat.mtimeMs), source: "storage" };
    } catch {
      // Not an uploaded file; fall through to the bundled inventory.
    }
  }

  const bundled = STATIC_INVENTORY[folder].find((entry) => entry.name.toLowerCase() === name.toLowerCase());
  return bundled ? { size: bundled.size, mtime: bundled.mtime, source: "static" } : null;
}

export async function readMedia(
  folder: MediaFolder,
  rawName: string,
  range?: { start: number; end: number }
): Promise<MediaReadResult | null> {
  const name = safeMediaName(rawName);
  if (!name) return null;

  const bucket = await getStorage();
  if (bucket) {
    const key = keyFor(folder, name);
    const head = await bucket.head(key);
    if (!head) return null;

    const size = head.size;
    const start = range ? Math.max(0, Math.min(range.start, size - 1)) : 0;
    const end = range ? Math.max(start, Math.min(range.end, size - 1)) : size - 1;

    const object =
      size === 0
        ? head
        : await bucket.get(key, { range: { offset: start, length: end - start + 1 } });
    if (!object?.body) return null;

    return {
      body: object.body,
      length: end - start + 1,
      size,
      contentType: head.httpMetadata?.contentType || contentTypeFor(name),
      start,
      end,
      etag: head.httpEtag,
      source: "storage",
    };
  }

  try {
    const fs = await diskFs();
    const filePath = path.join(process.cwd(), "public", folder, name);
    const stat = await fs.stat(filePath);
    const size = stat.size;
    const start = range ? Math.max(0, Math.min(range.start, size - 1)) : 0;
    const end = range ? Math.max(start, Math.min(range.end, size - 1)) : size - 1;
    const handle = await fs.open(filePath, "r");
    try {
      const buffer = new Uint8Array(end - start + 1);
      await handle.read(buffer, 0, buffer.length, start);
      return {
        body: buffer,
        length: buffer.length,
        size,
        contentType: contentTypeFor(name),
        start,
        end,
        source: "storage",
      };
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

/**
 * Stores bytes for `name`. Returns where they were written.
 */
export async function writeMedia(
  folder: MediaFolder,
  rawName: string,
  data: Uint8Array,
  contentType?: string
): Promise<{ source: "static" | "storage"; name: string }> {
  const name = safeMediaName(rawName);
  if (!name) throw new Error("Invalid media filename");

  const bucket = await getStorage();
  if (bucket) {
    await bucket.put(keyFor(folder, name), data, {
      httpMetadata: {
        contentType: contentType || contentTypeFor(name),
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    return { source: "storage", name };
  }

  const fs = await diskFs();
  const dir = path.join(process.cwd(), "public", folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), data);
  return { source: "storage", name };
}

/**
 * Removes an uploaded object. Bundled assets cannot be deleted at runtime, so
 * callers get `false` and should surface that the reference cleanup still ran.
 */
export async function deleteMedia(folder: MediaFolder, rawName: string): Promise<boolean> {
  const name = safeMediaName(rawName);
  if (!name) return false;

  const bucket = await getStorage();
  if (bucket) {
    const key = keyFor(folder, name);
    const existing = await bucket.head(key);
    if (!existing) return false;
    await bucket.delete(key);
    return true;
  }

  try {
    const fs = await diskFs();
    await fs.unlink(path.join(process.cwd(), "public", folder, name));
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies a media object to a new name.
 *
 * Bundled assets are not in storage, so `sourceUrl` lets the caller hand over
 * the public address the Worker can read the bytes back from.
 */
export async function copyMedia(
  folder: MediaFolder,
  oldName: string,
  newName: string,
  sourceUrl?: string
): Promise<{ ok: boolean; name: string; error?: string }> {
  const from = safeMediaName(oldName);
  const to = safeMediaName(newName);
  if (!from || !to) return { ok: false, name: to, error: "Invalid file name." };

  const bucket = await getStorage();
  if (bucket) {
    const object = await bucket.get(keyFor(folder, from));
    let payload: ArrayBuffer | null = null;
    let contentType = contentTypeFor(to);

    if (object?.body) {
      payload = await new Response(object.body).arrayBuffer();
      contentType = object.httpMetadata?.contentType || contentType;
    } else if (sourceUrl) {
      try {
        const response = await fetch(sourceUrl, { cache: "no-store" });
        if (response.ok) {
          payload = await response.arrayBuffer();
          contentType = response.headers.get("content-type") || contentType;
        }
      } catch {
        payload = null;
      }
    }

    if (!payload) return { ok: false, name: to, error: "File not found." };

    await bucket.put(keyFor(folder, to), payload, {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
    });
    return { ok: true, name: to };
  }

  try {
    const fs = await diskFs();
    const dir = path.join(process.cwd(), "public", folder);
    await fs.copyFile(path.join(dir, from), path.join(dir, to));
    return { ok: true, name: to };
  } catch (error) {
    return { ok: false, name: to, error: (error as Error)?.message || "File copy failed" };
  }
}

/** Reads then writes, so an uploaded object can be renamed in place. */
export async function renameMedia(
  folder: MediaFolder,
  oldName: string,
  newName: string
): Promise<{ ok: boolean; name: string; error?: string }> {
  const from = safeMediaName(oldName);
  const to = safeMediaName(newName);
  if (!from || !to) return { ok: false, name: to, error: "Invalid file name." };

  const bucket = await getStorage();
  if (bucket) {
    const fromKey = keyFor(folder, from);
    const toKey = keyFor(folder, to);
    const object = await bucket.get(fromKey);
    if (!object) return { ok: false, name: to, error: "File not found." };

    await bucket.put(toKey, await new Response(object.body).arrayBuffer(), {
      httpMetadata: {
        contentType: object.httpMetadata?.contentType || contentTypeFor(to),
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    await bucket.delete(fromKey);
    return { ok: true, name: to };
  }

  try {
    const fs = await diskFs();
    const dir = path.join(process.cwd(), "public", folder);
    await fs.access(path.join(dir, from));
    await fs.rename(path.join(dir, from), path.join(dir, to));
    return { ok: true, name: to };
  } catch (error) {
    return { ok: false, name: to, error: (error as Error)?.message || "File rename failed" };
  }
}

/** Config documents (currently the homepage media backup) stored outside public/. */
export async function readMediaJson<T>(key: string): Promise<T | null> {
  const bucket = await getStorage();
  if (bucket) {
    const object = await bucket.get(key);
    if (!object?.body) return null;
    try {
      return JSON.parse(await new Response(object.body).text()) as T;
    } catch {
      return null;
    }
  }

  try {
    const fs = await diskFs();
    const raw = await fs.readFile(path.join(process.cwd(), "public", key), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeMediaJson(key: string, value: unknown): Promise<void> {
  const payload = JSON.stringify(value, null, 2);

  const bucket = await getStorage();
  if (bucket) {
    await bucket.put(key, new TextEncoder().encode(payload), {
      httpMetadata: { contentType: "application/json", cacheControl: "no-store" },
    });
    return;
  }

  const fs = await diskFs();
  const filePath = path.join(process.cwd(), "public", key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, payload, "utf-8");
}
