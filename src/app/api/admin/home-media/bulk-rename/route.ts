import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { DEFAULT_HOMEPAGE_MEDIA, HomepageMediaConfig, normalizeHomepageMedia } from "@/lib/homepage-media";

export const dynamic = "force-dynamic";

const BACKUP_FILE = path.join(process.cwd(), "public", "homepage-media.json");

interface RenameItem {
  oldUrl: string;
  newUrl: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = (body.type || "image") as "image" | "video";
    const renames: RenameItem[] = body.renames;

    if (!Array.isArray(renames) || renames.length === 0) {
      return NextResponse.json({ ok: false, error: "No rename items provided" }, { status: 400 });
    }

    const folder = type === "video" ? "videos" : "images";
    const baseDir = path.join(process.cwd(), "public", folder);
    await fs.mkdir(baseDir, { recursive: true });

    const results: Array<{
      oldUrl: string;
      newUrl: string;
      success: boolean;
      error?: string;
    }> = [];

    const urlMap = new Map<string, string>(); // oldUrl -> newUrl

    for (const item of renames) {
      const oldClean = path.basename(decodeURIComponent(item.oldUrl || "")).trim();
      let newClean = path.basename(decodeURIComponent(item.newUrl || "")).trim();

      // Protect against directory traversal
      if (!oldClean || !newClean || oldClean.includes("..") || newClean.includes("..")) {
        results.push({
          oldUrl: item.oldUrl,
          newUrl: item.newUrl,
          success: false,
          error: "Invalid file name.",
        });
        continue;
      }

      // Safeguard essential logo files
      const protectedFiles = new Set(["favicon.ico", "favicon.png", "banky-desktop-logo.png"]);
      if (protectedFiles.has(oldClean.toLowerCase())) {
        results.push({
          oldUrl: item.oldUrl,
          newUrl: item.newUrl,
          success: false,
          error: "Cannot rename protected brand asset.",
        });
        continue;
      }

      // Preserve file extension
      const oldExt = path.extname(oldClean).toLowerCase();
      if (!path.extname(newClean) && oldExt) {
        newClean += oldExt;
      }

      // Normalize new name to safe characters
      const newExt = path.extname(newClean).toLowerCase() || oldExt;
      const baseOnly = path.basename(newClean, newExt).toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
      newClean = `${baseOnly}${newExt}`;

      const oldPath = path.join(baseDir, oldClean);
      const newPath = path.join(baseDir, newClean);

      const oldUrlFinal = `/${folder}/${oldClean}`;
      const newUrlFinal = `/${folder}/${newClean}`;

      if (oldClean === newClean) {
        results.push({ oldUrl: oldUrlFinal, newUrl: newUrlFinal, success: true });
        continue;
      }

      try {
        await fs.access(oldPath);

        // If target file already exists and is different from source, avoid overwriting
        try {
          await fs.access(newPath);
          // Collision: target already exists! Let's generate a unique increment
          let counter = 1;
          let safeCandidate = `${baseOnly}-${counter}${newExt}`;
          while (true) {
            try {
              await fs.access(path.join(baseDir, safeCandidate));
              counter++;
              safeCandidate = `${baseOnly}-${counter}${newExt}`;
            } catch {
              break;
            }
          }
          newClean = safeCandidate;
        } catch {
          // Target doesn't exist, fine to rename
        }

        const safeNewPath = path.join(baseDir, newClean);
        await fs.rename(oldPath, safeNewPath);

        const resolvedNewUrl = `/${folder}/${newClean}`;
        results.push({ oldUrl: oldUrlFinal, newUrl: resolvedNewUrl, success: true });
        urlMap.set(oldUrlFinal, resolvedNewUrl);
        // Also map raw filenames
        urlMap.set(oldClean, newClean);
      } catch (err: any) {
        results.push({
          oldUrl: oldUrlFinal,
          newUrl: newUrlFinal,
          success: false,
          error: err?.message || "File rename failed",
        });
      }
    }

    // Now update references in /public/homepage-media.json if any files were renamed
    let updatedConfig: HomepageMediaConfig | null = null;
    if (urlMap.size > 0) {
      try {
        let current: HomepageMediaConfig = { ...DEFAULT_HOMEPAGE_MEDIA };
        try {
          const raw = await fs.readFile(BACKUP_FILE, "utf-8");
          current = normalizeHomepageMedia(JSON.parse(raw));
        } catch {}

        // Replace any matching URLs
        const replaceUrl = (url: string | undefined): string => {
          if (!url) return "";
          // Direct match
          if (urlMap.has(url)) return urlMap.get(url)!;
          // Basename match
          const base = path.basename(url);
          for (const [oldU, newU] of urlMap.entries()) {
            if (path.basename(oldU) === base) {
              return newU;
            }
          }
          return url;
        };

        if (current.hero.videoUrl) current.hero.videoUrl = replaceUrl(current.hero.videoUrl);
        if (current.hero.videoSecondaryUrl) current.hero.videoSecondaryUrl = replaceUrl(current.hero.videoSecondaryUrl);
        if (current.hero.posterImage) current.hero.posterImage = replaceUrl(current.hero.posterImage);

        if (Array.isArray(current.hero.slideshowImages)) {
          current.hero.slideshowImages = current.hero.slideshowImages.map(replaceUrl);
        }

        if (current.about.image1) current.about.image1 = replaceUrl(current.about.image1);
        if (current.about.image2) current.about.image2 = replaceUrl(current.about.image2);

        if (Array.isArray(current.gallery)) {
          current.gallery = current.gallery.map((g) => ({
            ...g,
            url: replaceUrl(g.url),
          }));
        }

        if (Array.isArray(current.experiences)) {
          current.experiences = current.experiences.map((e) => ({
            ...e,
            img: replaceUrl(e.img),
          }));
        }

        if (Array.isArray(current.featuredVideos)) {
          current.featuredVideos = current.featuredVideos.map((v) => ({
            ...v,
            url: replaceUrl(v.url),
            poster: v.poster ? replaceUrl(v.poster) : undefined,
          }));
        }

        current.updatedAt = new Date().toISOString();
        await fs.writeFile(BACKUP_FILE, JSON.stringify(current, null, 2), "utf-8");
        updatedConfig = current;
      } catch (cfgErr) {
        console.warn("Could not sync renamed URLs to homepage-media.json:", cfgErr);
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      ok: true,
      count: successCount,
      total: results.length,
      results,
      config: updatedConfig,
      message: `Successfully renamed ${successCount} file(s) and synchronized landing page paths.`,
    });
  } catch (error: any) {
    console.error("Bulk rename API error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to process bulk rename" },
      { status: 500 }
    );
  }
}
