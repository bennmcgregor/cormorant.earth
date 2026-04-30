#!/usr/bin/env bash
# Convert a video to animated WebP, sized for the map.
# Usage: ./to-animated-webp.sh input.mp4 [output.webp]
#   ./to-animated-webp.sh clip.mp4               -> clip.webp
#   ./to-animated-webp.sh clip.mp4 my-name.webp  -> my-name.webp
#
# Tweak MAX_WIDTH, QUALITY, FPS at the top to taste.

set -euo pipefail

MAX_WIDTH=600    # animated WebP gets expensive fast at higher widths
QUALITY=70       # 0–100; 70 is a sane lossy default; drop to 50 for smaller files
FPS=24           # cap output framerate (most phone video is 30 or 60)

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input-video> [output.webp]" >&2
    exit 1
fi

input="$1"
output="${2:-${input%.*}.webp}"

if [ ! -f "$input" ]; then
    echo "Input not found: $input" >&2
    exit 1
fi

ffmpeg -y -i "$input" \
    -vcodec libwebp \
    -lossless 0 \
    -compression_level 6 \
    -q:v "$QUALITY" \
    -loop 0 \
    -preset picture \
    -an \
    -vsync 0 \
    -vf "fps=${FPS},scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos" \
    "$output"

echo "Wrote $output ($(du -h "$output" | cut -f1))"
