/**
 * Poster-first hero mode for the homepage.
 *
 * The current hero.mp4 is ranges-capable but still a ~2.5 MB looping clip.
 * On the homepage we want the visible cover (poster image) to win the LCP race,
 * and only activate the looping video after the browser is reasonably ready and
 * the device is not clearly bandwidth-constrained.
 */

export interface HeroPlaybackPlan {
  /** Use the video as the primary hero layer, but keep the poster visible first. */
  videoEnabled: boolean;
  /** Maximum video file size in bytes we are willing to auto-activate on first paint. */
  maxAutoplayBytes?: number;
  /** Whether to start muted by default (browser autoplay policy is happier with muted). */
  startMuted?: boolean;
}

/** Sensible default: keep video enabled on desktop, but do not blow the LCP budget automatically. */
export const DEFAULT_HERO_PLAYBACK_PLAN: HeroPlaybackPlan = {
  videoEnabled: true,
  maxAutoplayBytes: 2_000_000,
  startMuted: true,
};

/**
 * Decide whether the hero video should be activated automatically on first render.
 *
 * Heuristic:
 * - If video is disabled, never activate.
 * - If the video file is larger than the configured budget, hold off until the user
 *   taps play instead of letting the browser fetch the whole clip during LCP.
 * - Otherwise, allow the normal autoplay path the page already uses.
 */
export function shouldAutoactivateVideoOnFirstPaint(
  plan: HeroPlaybackPlan,
  videoUrl: string,
  estimatedFileSizeBytes?: number
): boolean {
  if (!plan.videoEnabled) return false;
  if (plan.maxAutoplayBytes && estimatedFileSizeBytes !== undefined) {
    if (estimatedFileSizeBytes > plan.maxAutoplayBytes) {
      return false;
    }
  }
  return true;
}
