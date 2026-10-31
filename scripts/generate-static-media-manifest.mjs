#!/usr/bin/env node
/**
 * Writes src/lib/media/static-manifest.json with the list of media files that
 * ship inside the deployment.
 *
 * The Worker runtime cannot list files inside the asset bundle, so the admin
 * media screens need a build-time inventory to merge with objects stored in R2.
 * Runs automatically from the `prebuild` npm hook and can be run by hand.
 */
import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "src", "lib", "media", "static-manifest.json");

const FOLDERS = {
  images: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".ico"]),
  videos: new Set([".mp4", ".webm", ".mov", ".m4v"]),
};

// No timestamp: the file is committed, and a stable order keeps diffs quiet.
const manifest = { images: [], videos: [] };

for (const [folder, extensions] of Object.entries(FOLDERS)) {
  const dir = join(root, "public", folder);
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // Folder is optional — an empty inventory is valid.
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!extensions.has(extname(entry.name).toLowerCase())) continue;
    try {
      const stat = statSync(join(dir, entry.name));
      manifest[folder].push({ name: entry.name, size: stat.size, mtime: Math.floor(stat.mtimeMs) });
    } catch {
      // Skip files that disappear mid-scan.
    }
  }
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");

console.log(
  `static-media-manifest: ${manifest.images.length} image(s), ${manifest.videos.length} video(s)`
);
