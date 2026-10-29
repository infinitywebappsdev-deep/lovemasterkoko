#!/usr/bin/env bash
set -euo pipefail

SRC="public/videos/hero.mp4"
WORK="public/videos/hero.compact.mp4"
OUT="public/videos/hero.mp4"
MAX_BYTES=1900000
FFMPEG="${FFMPEG:-${HOME}/node_modules/ffmpeg-static/ffmpeg}"

if [ ! -f "$SRC" ]; then
  echo "Missing $SRC" >&2
  exit 1
fi

if [ ! -x "$FFMPEG" ]; then
  echo "ffmpeg not available at $FFMPEG" >&2
  exit 2
fi

SIZE=$(stat -c%s "$SRC" 2>/dev/null || stat -f%z "$SRC")
echo "Current hero video: $SIZE bytes"

if [ "$SIZE" -le "$MAX_BYTES" ]; then
  echo "Current hero video is already within target; no compaction needed."
  exit 0
fi

echo "Compacting hero video (target <= $MAX_BYTES bytes)..."

"$FFMPEG" -y \
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

if [ ! -f "$WORK" ]; then
  echo "ffmpeg failed; leaving existing hero video untouched." >&2
  exit 1
fi

NEW_SIZE=$(stat -c%s "$WORK" 2>/dev/null || stat -f%z "$WORK")
echo "Compact candidate: $NEW_SIZE bytes"

if [ "$NEW_SIZE" -le "$MAX_BYTES" ]; then
  mv "$WORK" "$OUT"
  echo "Replaced hero video with compact version."
  exit 0
fi

echo "Compact result still too large; leaving existing hero video." >&2
rm -f "$WORK"
exit 2
