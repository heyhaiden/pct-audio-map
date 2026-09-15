# Content ingest — see scripts/ingest-audio.ts

1. Edit `content/audio-markers.csv` (see `audio-markers.example.csv` for columns)
2. Drop audio files in `content/audio/` using the `filename` values
3. `pnpm ingest:audio`

Leave `filename` blank when a sample is not ready yet. Those rows still get coordinates and miles, but no audio URL until a file is attached.
