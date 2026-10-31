import { NextRequest, NextResponse } from "next/server";

import path from "path";

import {
  DEFAULT_HOMEPAGE_MEDIA,
  HomepageMediaConfig,
  normalizeHomepageMedia,
} from "@/lib/homepage-media";
import { requireStaff, jsonError } from "@/lib/booking/auth";
import {
  copyMedia,
  readMediaJson,
  renameMedia,
  statMedia,
  writeMediaJson,
} from "@/lib/media/store";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "config/homepage-media.json";
const PROTECTED_FILES = new Set(["favicon.ico", "favicon.png", "banky-desktop-logo.png"]);

interface RenameItem {
  oldUrl: string;
  newUrl: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const body = await req.json();
    const type = (body.type || "image") as "image" | "video";
    const renames: RenameItem[] = body.renames;

    if (!Array.isArray(renames) || renames.length === 0) {
      return NextResponse.json({ ok: false, error: "No rename items provided" }, { status: 400 });
    }

    const folder = type === "video" ? "videos" : "images";
    const urlPrefix = `/media/${folder}`;

    const results: Array<{ oldUrl: string; newUrl: string; success: boolean; error?: string }> = [];
    const urlMap = new Map<string, string>();

    const decodeBase = (value: string): string => {
      const withoutQuery = String(value || "").split("?")[0];
      try {
        return path.basename(decodeURIComponent(withoutQuery)).trim();
      } catch {
        return path.basename(withoutQuery).trim();
      }
    };

    for (const item of renames) {
      const oldClean = decodeBase(item.oldUrl);
      let newClean = decodeBase(item.newUrl);

      if (!oldClean || !newClean || oldClean.includes("..") || newClean.includes("..")) {
        results.push({
          oldUrl: item.oldUrl,
          newUrl: item.newUrl,
          success: false,
          error: "Invalid file name.",
        });
        continue;
      }

      if (PROTECTED_FILES.has(oldClean.toLowerCase())) {
        results.push({
          oldUrl: item.oldUrl,
          newUrl: item.newUrl,
          success: false,
          error: "Cannot rename protected brand asset.",
        });
        continue;
      }

      const oldExt = path.extname(oldClean).toLowerCase();
      if (!path.extname(newClean) && oldExt) {
        newClean += oldExt;
      }

      // Normalize the new name to safe characters
      const newExt = path.extname(newClean).toLowerCase() || oldExt;
      const baseOnly = path.basename(newClean, newExt).toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
      newClean = `${baseOnly}${newExt}`;

      const oldUrlFinal = `/${folder}/${encodeURIComponent(oldClean)}`;

      if (oldClean === newClean) {
        results.push({ oldUrl: oldUrlFinal, newUrl: `${urlPrefix}/${encodeURIComponent(newClean)}`, success: true });
        continue;
      }

      const source = await statMedia(folder, oldClean);
      if (!source) {
        results.push({
          oldUrl: oldUrlFinal,
          newUrl: `${urlPrefix}/${encodeURIComponent(newClean)}`,
          success: false,
          error: "File not found.",
        });
        continue;
      }

      // Avoid clobbering an existing object: add -1, -2, ... until free
      let candidate = newClean;
      let counter = 1;
      while (await statMedia(folder, candidate)) {
        candidate = `${baseOnly}-${counter}${newExt}`;
        counter += 1;
      }

      const moved =
        source.source === "static"
          ? await copyMedia(
              folder,
              oldClean,
              candidate,
              `${req.nextUrl.origin}/${folder}/${encodeURIComponent(oldClean)}`
            )
          : await renameMedia(folder, oldClean, candidate);

      if (!moved.ok) {
        results.push({
          oldUrl: oldUrlFinal,
          newUrl: `${urlPrefix}/${encodeURIComponent(candidate)}`,
          success: false,
          error: moved.error || "File rename failed",
        });
        continue;
      }

      const resolvedNewUrl = `${urlPrefix}/${encodeURIComponent(moved.name)}`;
      results.push({ oldUrl: oldUrlFinal, newUrl: resolvedNewUrl, success: true });
      urlMap.set(oldUrlFinal, resolvedNewUrl);
      urlMap.set(oldClean, moved.name);
    }

    // Update stored homepage config references when files moved
    let updatedConfig: HomepageMediaConfig | null = null;
    if (urlMap.size > 0) {
      try {
        const stored = await readMediaJson<HomepageMediaConfig>(CONFIG_KEY);
        const current = stored
          ? normalizeHomepageMedia(stored)
          : normalizeHomepageMedia({ ...DEFAULT_HOMEPAGE_MEDIA });

        const replaceUrl = (url: string | undefined): string => {
          if (!url) return "";
          if (urlMap.has(url)) return urlMap.get(url)!;
          const base = path.basename(url.split("?")[0]);
          for (const [oldU, newU] of urlMap.entries()) {
            if (path.basename(oldU) === base) return newU;
          }
          return url;
        };

        if (current.hero.videoUrl) current.hero.videoUrl = replaceUrl(current.hero.videoUrl);
        if (current.hero.videoSecondaryUrl) {
          current.hero.videoSecondaryUrl = replaceUrl(current.hero.videoSecondaryUrl);
        }
        if (current.hero.posterImage) current.hero.posterImage = replaceUrl(current.hero.posterImage);

        if (Array.isArray(current.hero.slideshowImages)) {
          current.hero.slideshowImages = current.hero.slideshowImages.map(replaceUrl);
        }

        if (current.about.image1) current.about.image1 = replaceUrl(current.about.image1);
        if (current.about.image2) current.about.image2 = replaceUrl(current.about.image2);

        if (Array.isArray(current.gallery)) {
          current.gallery = current.gallery.map((g) => ({ ...g, url: replaceUrl(g.url) }));
        }

        if (Array.isArray(current.experiences)) {
          current.experiences = current.experiences.map((e) => ({ ...e, img: replaceUrl(e.img) }));
        }

        if (Array.isArray(current.featuredVideos)) {
          current.featuredVideos = current.featuredVideos.map((v) => ({
            ...v,
            url: replaceUrl(v.url),
            poster: v.poster ? replaceUrl(v.poster) : undefined,
          }));
        }

        current.updatedAt = new Date().toISOString();
        await writeMediaJson(CONFIG_KEY, current);
        updatedConfig = current;
      } catch (cfgErr) {
        console.warn("Could not sync renamed URLs to homepage media config:", cfgErr);
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
