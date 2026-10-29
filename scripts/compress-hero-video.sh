#!/usr/bin/env bash
set -euo pipefail

SRC="public/videos/hero.mp4"
WORK="public/videos/hero.compact.mp4"
OUT="public/videos/hero.mp4"
MAX_BYTES=1900000  # keep the new looping hero under ~1.9 MB

if [ ! -f "$SRC" ]; then
  echo "Missing $SRC" >&2
  exit 1
fi

ffmpeg -y \
  -i "$SRC" \
  -vf "scale=960:-2:flags=lanczos,format=yuv420p" \
  -c:v libx264 \
  -preset medium \
  -crf 28 \
  -profile:v main \
  -level 4.0 \
  -movflags +faststart \
  -c:a aac \
  -b:a 64k \
  -t 12 \
  "$WORK"

SIZE=$(stat -c%s "$WORK" 2>/dev/null || stat -f%z "$WORK")
echo "Wrote $WORK ($SIZE bytes)"

if [ "$SIZE" -le "$MAX_BYTES" ]; then
  mv "$WORK" "$OUT"
  echo "Promoted $WORK to $OUT"
else
  echo "Result ($SIZE bytes) still above target ($MAX_BYTES bytes); keeping current hero.mp4 and removing $WORK" >&2
  rm -f "$WORK"
  exit 2
fi
