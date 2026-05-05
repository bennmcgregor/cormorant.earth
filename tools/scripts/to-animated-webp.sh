#!/usr/bin/env bash
# Compress a video to a small H.264 MP4 for web embedding and git storage.
# Usage: ./to-animated-webp.sh input.mp4 [output.mp4]
#   ./to-animated-webp.sh clip.mp4               -> clip-web.mp4
#   ./to-animated-webp.sh clip.mp4 my-name.mp4   -> my-name.mp4
#
# Tweak MAX_WIDTH, CRF, FPS at the top to taste.
# CRF: 18=near-lossless, 28=good lossy, 34=aggressive — lower means larger file.

set -euo pipefail

MAX_WIDTH=600
CRF=28
FPS=24

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input-video> [output.mp4]" >&2
    exit 1
fi

input="$1"
output="${2:-${input%.*}-web.mp4}"

if [ ! -f "$input" ]; then
    echo "Input not found: $input" >&2
    exit 1
fi

ffmpeg -y -i "$input" \
    -c:v libx264 \
    -crf "$CRF" \
    -preset slow \
    -an \
    -vf "fps=${FPS},scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos" \
    -movflags +faststart \
    "$output"

echo "Wrote $output ($(du -h "$output" | cut -f1))"
