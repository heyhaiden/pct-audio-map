# Vercel Blob Migration Guide

## 🎯 Current Status
- ✅ Audio player working with local files
- ✅ API routes ready for Blob URLs
- ✅ Migration script ready
- ⏳ Need to migrate files to Vercel Blob

## 📋 Step-by-Step Migration (10 minutes)

### Step 1: Get Vercel Blob Token (2 minutes)

1. Go to: https://vercel.com/dashboard/stores
2. Click **"Create Database"** → Select **"Blob"**
3. Name it: `pct-audio-storage` (or any name you prefer)
4. Click **"Create"**
5. **Copy the token** that appears (starts with `vercel_blob_rw_`)

### Step 2: Configure Environment (1 minute)

Add the token to `.env.local`:

```bash
# Your existing token
MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiaGV5aGFpZGVuIiwiYSI6ImNtZnNoN3kzaDBpNHMybHNjb212bGF0b3YifQ.t1mLadktZ9tlCgJBf6Z7kg

# Add this new line with your Vercel Blob token
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxx
```

**Important:** Replace `vercel_blob_rw_xxxxxxxxxxxxxxxxxx` with your actual token!

### Step 3: Run Migration Script (5 minutes)

```bash
# This uploads all audio files from /public/audio/ to Vercel Blob
# and updates audio-markers.ts with new Blob URLs
pnpm tsx scripts/migrate-audio-to-blob.ts
```

**What the script does:**
1. Finds all audio files in `/public/audio/`
2. Uploads each to Vercel Blob with public access
3. Gets the CDN URL for each file
4. Updates `data/audio-markers.ts` with new Blob URLs
5. Shows you a summary of what was uploaded

**Expected output:**
```
🎵 PCT Audio Map - Blob Migration Script
=========================================

🔍 Checking prerequisites...
   ✓ BLOB_READ_WRITE_TOKEN configured
   ✓ Found 2 audio files

🔍 Checking existing Blob storage...
   ✓ Blob storage is empty

📤 Uploading 2 audio files to Vercel Blob...

🔄 Batch 1 of 1
   ↑ Uploading desert-wind.mp3...
   ✓ Uploaded desert-wind.mp3 (1.01 MB)
     URL: https://xxxxx.public.blob.vercel-storage.com/audio/desert-wind.mp3

   ↑ Uploading coyote-calls.mp3...
   ✓ Uploaded coyote-calls.mp3 (0.70 MB)
     URL: https://xxxxx.public.blob.vercel-storage.com/audio/coyote-calls.mp3

📝 Updating audio-markers.ts...
✓ Updated 2 audio URLs in audio-markers.ts

==========================================================
📊 MIGRATION SUMMARY
==========================================================
✓ Successful uploads: 2
✗ Failed uploads: 0
📦 Total size uploaded: 1.71 MB

✅ Next steps:
   1. Verify uploads in Vercel dashboard
   2. Test audio playback: pnpm dev
   3. Commit updated audio-markers.ts
   4. Deploy to Vercel
==========================================================
```

### Step 4: Test Locally (2 minutes)

```bash
# Start dev server
pnpm dev

# Open http://localhost:3000
# Click on "Desert Wind" or "Coyote Calls"
# Audio should play from Vercel Blob CDN!
```

**How to verify it's using Blob:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click an audio marker
4. Look for audio requests - they should go to `*.vercel-storage.com` instead of `localhost`

### Step 5: Commit Changes

```bash
# The migration script updated audio-markers.ts with Blob URLs
git add data/audio-markers.ts
git commit -m "Migrate audio files to Vercel Blob CDN"
git push origin main
```

### Step 6: Deploy to Vercel (Optional)

If deploying to production:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `BLOB_READ_WRITE_TOKEN` for all environments (Production, Preview, Development)
4. Deploy!

---

## 🔧 Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN not configured"
**Fix:** Make sure you added the token to `.env.local` and restarted any running processes

### Error: "Audio files not found"
**Fix:** Check that audio files exist in `/public/audio/`
```bash
ls -la public/audio/
```

### Error: "Failed to upload"
**Fix:**
- Check internet connection
- Verify token is valid (check Vercel dashboard)
- Check Vercel Blob quota (free tier: 1GB storage)

### Audio doesn't play after migration
**Fix:**
1. Check `data/audio-markers.ts` - URLs should start with `https://`
2. Check browser console for errors
3. Verify files uploaded: Go to Vercel dashboard → Stores → Your Blob store

### Want to re-run migration?
The script will overwrite existing files with the same name. It's safe to run multiple times.

---

## 📊 What Gets Migrated

Currently you have **2 audio files** that will be migrated:
- ✅ `desert-wind.mp3` (1.01 MB)
- ✅ `coyote-calls.mp3` (0.70 MB)

**Total:** ~1.71 MB (well within free tier's 1GB limit)

**Missing files** (will show 404 until you add them):
- desert-silence.mp3
- alpine-wind.mp3
- mountain-streams.mp3
- granite-echoes.mp3
- volcanic-winds.mp3
- forest-streams.mp3
- bird-chorus.mp3
- forest-rain.mp3
- lake-lapping.mp3
- owl-calls.mp3
- glacier-melt.mp3
- rainforest-ambience.mp3
- mountain-silence.mp3

You can either:
1. Add these files to `/public/audio/` before migration
2. Upload them later using the same script
3. Use the dummy audio creation script: `./scripts/create-dummy-audio.sh`

---

## 🎉 Benefits After Migration

Once migrated, you'll get:

✅ **Global CDN**: Audio served from edge locations worldwide (faster)
✅ **Automatic Compression**: Vercel optimizes delivery based on client
✅ **Range Requests**: Built-in support for seeking in audio
✅ **Infinite Scale**: No need to commit large audio files to Git
✅ **Easy Updates**: Upload new audio without redeploying
✅ **Cost Efficient**: Free tier covers 1GB storage + 100GB bandwidth

---

## 💰 Cost Estimate

**Free Tier (Hobby):**
- 1 GB storage: $0
- 100 GB bandwidth/month: $0

**Your current usage:**
- Storage: 1.71 MB → **$0** (well under limit)
- Estimated bandwidth: ~5 GB/month → **$0** (well under limit)

**If you exceed free tier:**
- Storage: $0.15/GB/month
- Bandwidth: $0.40/GB

---

## 🆘 Need Help?

If anything goes wrong:
1. Check this guide's troubleshooting section
2. Review the migration script output for errors
3. Check Vercel dashboard → Stores → Blob → Your storage
4. Verify `.env.local` has the correct token

---

**Ready to migrate?** Start with Step 1! ☝️
