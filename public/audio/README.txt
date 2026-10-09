Offbeat: Soundscapes of the PCT — Audio Files
=============================================

Primary map/library playback is Opus in public/audio/opus/.
Those files are served from the Vercel CDN, not Blob.

Layout:
- opus/1-1.opus … 4-6.opus  — web-ready loops (drop Anna's opus/ here)
- manifest.json             — sample counts for gapless loop windows
- ambient-wind.mp3          — splash ambient, if used

Do not commit:
- Anna's aac/ folder
- offbeat-audio.js
- WAV / AIFF / FLAC masters (those stay in content/audio/, gitignored)

Blob MP3s remain a fallback for browsers that cannot decode Opus.
Replace a clip by renaming it so immutable caches do not keep the old file.
