#!/bin/bash
# Create dummy silent audio files for testing
# This creates 1-second silent MP3 files for all missing audio markers

cd "$(dirname "$0")/.."

echo "Creating dummy audio files for testing..."

# List of all audio files needed
audio_files=(
  "desert-wind.mp3"
  "coyote-calls.mp3"
  "desert-silence.mp3"
  "alpine-wind.mp3"
  "mountain-streams.mp3"
  "granite-echoes.mp3"
  "volcanic-winds.mp3"
  "forest-streams.mp3"
  "bird-chorus.mp3"
  "forest-rain.mp3"
  "lake-lapping.mp3"
  "owl-calls.mp3"
  "glacier-melt.mp3"
  "rainforest-ambience.mp3"
  "mountain-silence.mp3"
)

# Check if ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg not found. Install it with:"
    echo "   brew install ffmpeg"
    exit 1
fi

echo "✓ ffmpeg found"
echo ""

created=0
skipped=0

for file in "${audio_files[@]}"; do
    filepath="public/audio/$file"

    if [ -f "$filepath" ]; then
        echo "⏭️  Skipping $file (already exists)"
        ((skipped++))
    else
        echo "📝 Creating $file (1 second silent audio)..."
        ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame "$filepath" -y 2>&1 | grep -v "^Input\|^Output\|^Stream\|^encoder\|^  " || true
        ((created++))
    fi
done

echo ""
echo "=================="
echo "✅ Done!"
echo "   Created: $created files"
echo "   Skipped: $skipped files (already existed)"
echo ""
echo "Next: Start dev server with 'pnpm dev'"
