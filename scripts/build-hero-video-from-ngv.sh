#!/usr/bin/env bash
set -euo pipefail

INPUT="public/images/exterior-night.jpg"
OUT="public/videos/hero.mp4"
# A few seconds is enough for a pleasant atmospheric loop on the homepage.
DURATION_SECONDS=8
TARGET_W=960

if [ ! -f "$INPUT" ]; then
  echo "Missing $INPUT" >&2
  exit 1
fi

ffmpeg -y \
  -loop 1 -i "$INPUT" \
  -vf "scale=${TARGET_W}:-2:flags=lanczos,format=yuv420p,zoompan=z='min(zoom+0.0006,1.06)':d=${DURATION_SECONDS}:s=${TARGET_W}x480:fps=30,format=yuv420p" \
  -c:v libx264 \
  -preset medium \
  -crf 28 \
  -profile:v main \
  -level 4.0 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  -t "$DURATION_SECONDS" \
  "$OUT"

SIZE=$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")
echo "Wrote $OUT ($SIZE bytes)"
