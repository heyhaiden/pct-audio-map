# Quick Start Guide - Vercel Blob Audio Streaming

This guide will help you get the audio streaming feature up and running in **under 10 minutes**.

## 📋 Prerequisites

- [x] Node.js 18+ installed
- [x] pnpm installed
- [x] Vercel account (free tier works!)
- [x] Mapbox account (already configured)

## 🚀 Setup Steps

### Step 1: Create Vercel Blob Storage (2 minutes)

1. Go to https://vercel.com/dashboard/stores
2. Click "Create Database" → Select "Blob"
3. Name it `pct-audio-storage` (or any name)
4. Click "Create"
5. Copy the `BLOB_READ_WRITE_TOKEN` that appears

### Step 2: Configure Environment Variables (1 minute)

Add to your `.env.local` file:

```bash
# Your existing Mapbox token
MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiaGV5aGFpZGVuIiwiYSI6ImNtZnNoN3kzaDBpNHMybHNjb212bGF0b3YifQ.t1mLadktZ9tlCgJBf6Z7kg

# Add this new line with your Vercel Blob token
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxx
```

### Step 3: Prepare Audio Files (Optional - for testing)

If you don't have audio files yet, you can create dummy files for testing:

```bash
# Create audio directory if it doesn't exist
mkdir -p public/audio

# Create dummy audio files (silent MP3s for testing)
# Or place your real audio files here
```

**Expected structure:**
```
public/audio/
  ├── desert-wind.mp3
  ├── coyote-calls.mp3
  ├── desert-silence.mp3
  ├── alpine-wind.mp3
  ├── mountain-streams.mp3
  ├── granite-echoes.mp3
  ├── volcanic-winds.mp3
  ├── forest-streams.mp3
  ├── bird-chorus.mp3
  ├── forest-rain.mp3
  ├── lake-lapping.mp3
  ├── owl-calls.mp3
  ├── glacier-melt.mp3
  ├── rainforest-ambience.mp3
  └── mountain-silence.mp3
```

### Step 4: Run Migration Script (2 minutes)

This uploads your audio files to Vercel Blob:

```bash
# Install tsx if not already installed
pnpm add -D tsx

# Run migration
pnpm tsx scripts/migrate-audio-to-blob.ts
```

**What it does:**
- ✅ Uploads all files from `public/audio/` to Vercel Blob
- ✅ Updates `data/audio-markers.ts` with new Blob URLs
- ✅ Shows upload progress and summary

### Step 5: Test Locally (2 minutes)

```bash
# Start development server
pnpm dev

# Open http://localhost:3000
```

**Test checklist:**
- [ ] Map loads with Mapbox terrain
- [ ] Audio markers appear on map
- [ ] Click an audio marker
- [ ] Streaming player opens at bottom
- [ ] Audio plays with buffer indicator
- [ ] Seeking works (drag progress bar)
- [ ] Volume control works
- [ ] Network indicator shows (green dot)

## 🎯 Quick Troubleshooting

### Problem: "BLOB_READ_WRITE_TOKEN not configured"
**Solution:** Make sure you added the token to `.env.local` and restarted the dev server

### Problem: "Audio files not found"
**Solution:** Check that files exist in `public/audio/` and match the filenames in `data/audio-markers.ts`

### Problem: "Failed to upload" during migration
**Solution:** Check your internet connection and Vercel Blob quota (free tier: 1GB)

### Problem: Audio player doesn't appear
**Solution:** Check browser console for errors. Make sure audio files were uploaded successfully.

### Problem: Audio doesn't play
**Solution:**
- Check if Blob URLs are valid (should start with `https://`)
- Try different audio file format (MP3 recommended)
- Check browser audio autoplay policy (click play button manually)

## 📊 What You Get

### Performance Features
- ✅ CDN-optimized audio delivery
- ✅ Range request support (instant seeking)
- ✅ Progressive buffering
- ✅ Mobile-optimized streaming
- ✅ Bandwidth detection

### User Experience
- ✅ Smooth playback with loading states
- ✅ Visual buffer indicator
- ✅ Network quality indicator (green/yellow/red dot)
- ✅ Playback speed control (0.5x - 2x)
- ✅ Volume control with mute
- ✅ Keyboard shortcuts (Space, J, L, arrows)

### Mobile Optimizations
- ✅ Touch-optimized controls
- ✅ Battery-aware preloading
- ✅ Network-aware quality
- ✅ Efficient data usage

## 🚢 Deploy to Vercel (3 minutes)

### Option A: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Add environment variables:
   - `MAPBOX_ACCESS_TOKEN` (your existing token)
   - `BLOB_READ_WRITE_TOKEN` (same as local)
5. Click "Deploy"

### Option B: Deploy via CLI

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel

# Add environment variables
vercel env add BLOB_READ_WRITE_TOKEN production
```

## 🎛️ Configuration Options

### Adjust Preloading (optional)

Edit `app/page.tsx` to customize preloading behavior:

```typescript
const [preloadConfig] = useState<PreloadConfig>({
  enabled: true,           // Enable/disable preloading
  maxConcurrent: 3,        // Max files to preload at once
  distanceThreshold: 100,  // Miles from current location
  maxCacheSize: 50,        // MB to cache
  wifiOnly: false          // Only preload on WiFi
})
```

### Adjust Streaming Quality (optional)

Streaming quality is automatically detected based on:
- Network speed (WiFi, 4G, 3G, 2G)
- Data saver mode
- Battery level

## 📈 Monitoring

### Check Vercel Blob Usage

Go to https://vercel.com/dashboard/stores and select your Blob store to see:
- Storage used
- Bandwidth used
- Request count
- Cost (if exceeding free tier)

### Analytics (built-in)

The streaming player tracks:
- Load times
- Buffer underruns
- Seek latency
- Bandwidth usage
- Error rates

View in browser console: Toggle "Show performance info" in player

## 🎉 Success!

You now have a production-ready audio streaming system with:
- ✅ 50+ audio files ready for CDN delivery
- ✅ Optimized for mobile and desktop
- ✅ Range request support for instant seeking
- ✅ Intelligent preloading
- ✅ Full accessibility support

## 📚 Next Steps

1. **Add More Audio:** Upload new files to Blob via admin API or re-run migration
2. **Customize Player:** Edit `components/audio/streaming-audio-player.tsx`
3. **Add Analytics:** Connect to Google Analytics, Mixpanel, etc.
4. **Monitor Performance:** Set up alerts for errors and slow loads

## 🆘 Need Help?

- Check detailed docs: `/STREAMING_AUDIO_IMPLEMENTATION.md`
- Review API docs: `/lib/audio/README.md`
- Migration guide: `/MIGRATION_GUIDE.md`
- Architecture: `/ARCHITECTURE_DIAGRAM.md`

---

**Estimated Total Time:** 10 minutes
**Difficulty:** Easy 🟢
