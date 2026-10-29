#!/usr/bin/env node
import { readFileSync, writeFileSync, unlinkSync, existsSync, statSync } from "node:fs";

const SRC = "public/videos/hero.mp4";
const WORK = "public/videos/hero.compact.mp4";
const TARGET_MAX_BYTES = 1_900_000;

function fileBytes(path) {
  return statSync(path).size;
}

function shell(cmd) {
  const proc = Bun ? Bun.spawn(cmd, { stdio: ["ignore", "inherit", "inherit"], windowsHide: true }) :
    require?.("child_process")?.spawnSync(cmd, { stdio: "inherit", windowsHide: true });
  if (!proc) return 127;
  return typeof proc.exitCode === "number" ? proc.exitCode : 127;
}

try {
  if (!existsSync(SRC)) {
    console.log("No hero video yet:", SRC);
    process.exit(0);
  }

  const srcBytes = fileBytes(SRC);
  console.log("Current hero video:", srcBytes, "bytes");

  if (srcBytes <= TARGET_MAX_BYTES) {
    console.log("Current hero video is already within target; no compaction needed.");
    process.exit(0);
  }

  if (shell("command -v ffmpeg") !== 0) {
    console.log("ffmpeg not available; leaving hero video as-is.");
    process.exit(0);
  }

  console.log("Compacting hero video (target <= %d bytes)...", TARGET_MAX_BYTES);

  const ok = shell(
    `ffmpeg -y -i ${SRC} -vf "scale=960:-2:flags=lanczos,format=yuv420p" -c:v libx264 -preset medium -crf 28 -profile:v main -level 4.0 -movflags +faststart -c:a aac -b:a 64k -t 12 ${WORK}`
  );
  if (ok !== 0 || !existsSync(WORK)) {
    console.log("ffmpeg failed; leaving existing hero video untouched.");
    process.exit(1);
  }

  const outBytes = fileBytes(WORK);
  console.log("Compact candidate:", outBytes, "bytes");

  if (outBytes <= TARGET_MAX_BYTES) {
    writeFileSync(SRC, readFileSync(WORK));
    unlinkSync(WORK);
    console.log("Replaced hero video with compact version.");
    process.exit(0);
  }

  console.log("Compact result still too large; leaving existing hero video.");
  unlinkSync(WORK);
  process.exit(0);
} catch (err) {
  console.error("Unexpected error:", err);
  process.exit(1);
}
