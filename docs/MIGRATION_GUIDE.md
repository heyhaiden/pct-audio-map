# Audio Migration Guide

Step-by-step guide to migrate from static `/public/audio` files to Vercel Blob storage.

## Prerequisites

- Vercel project with Blob and KV storage enabled
- Admin API token configured
- Existing audio files in `/public/audio/`
- Audio markers defined in `data/audio-markers.ts`

## Step 1: Enable Vercel Storage

### 1.1 Enable Vercel Blob

```bash
# Via Vercel CLI
vercel env add BLOB_READ_WRITE_TOKEN

# Or via Vercel Dashboard:
# Project Settings → Storage → Create Blob Store
```

### 1.2 Enable Vercel KV

```bash
# Via Vercel CLI
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN

# Or via Vercel Dashboard:
# Project Settings → Storage → Create KV Store
```

### 1.3 Configure Admin Token

```bash
# Generate secure random token
openssl rand -hex 32

# Add to Vercel environment variables
vercel env add ADMIN_API_TOKEN
# Paste token when prompted
```

## Step 2: Install Dependencies

```bash
# Install Vercel storage SDKs
pnpm install @vercel/blob @vercel/kv

# Install audio metadata extraction library
pnpm install music-metadata
```

## Step 3: Deploy Backend Services

```bash
# Build and deploy to production
git add .
git commit -m "Add Vercel Blob audio storage backend"
git push origin main

# Wait for deployment to complete
vercel --prod
```

## Step 4: Run Migration

### 4.1 Test Migration Endpoint

```bash
# Get your production URL
PROD_URL=$(vercel ls --scope your-team | grep main | awk '{print $2}')

# Get your admin token
ADMIN_TOKEN=$(vercel env pull .env.production && grep ADMIN_API_TOKEN .env.production | cut -d '=' -f2)

# Test authentication
curl -X POST "https://$PROD_URL/api/admin/audio/migrate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### 4.2 Run Full Migration

```bash
# Execute migration
curl -X POST "https://your-app.vercel.app/api/admin/audio/migrate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

Expected response:
```json
{
  "migrated": 15,
  "failed": [],
  "urls": {
    "/audio/mt-whitney.mp3": "https://abc123.public.blob.vercel-storage.com/audio/mt-whitney-xyz.mp3",
    "/audio/tuolumne.mp3": "https://abc123.public.blob.vercel-storage.com/audio/tuolumne-xyz.mp3"
    // ... etc
  }
}
```

### 4.3 Handle Failed Migrations

If any files failed:

```json
{
  "migrated": 14,
  "failed": [
    {
      "file": "corrupted.mp3",
      "error": "Invalid audio format"
    }
  ]
}
```

Fix the issues:
1. Check file format is valid (MP3, M4A, OGG, WAV, FLAC)
2. Verify file is not corrupted
3. Ensure marker exists in `audio-markers.ts`
4. Re-run migration (idempotent, skips existing files)

## Step 5: Verify Migration

### 5.1 Check Vercel Blob Dashboard

1. Go to Vercel Dashboard → Your Project → Storage → Blob
2. Verify all audio files are present under `/audio/` prefix
3. Check file sizes match originals

### 5.2 Test Streaming Endpoint

```bash
# Get list of migrated audio
curl "https://your-app.vercel.app/api/audio/list" | jq '.markers[] | .id'

# Test streaming a specific file
curl -I "https://your-app.vercel.app/api/audio/stream/mt-whitney"

# Expected: 307 redirect to Blob CDN URL
# Follow redirect and check final response
curl -L "https://your-app.vercel.app/api/audio/stream/mt-whitney" \
  --output test.mp3

# Verify downloaded file plays correctly
```

### 5.3 Test Range Requests

```bash
# Request first 1MB
curl "https://your-app.vercel.app/api/audio/stream/mt-whitney" \
  -H "Range: bytes=0-1048575" \
  -o partial.mp3

# Verify partial file
ls -lh partial.mp3  # Should be ~1MB
```

### 5.4 Test Metadata Endpoint

```bash
# Get metadata for a marker
curl "https://your-app.vercel.app/api/audio/metadata/mt-whitney" | jq '.'

# Expected response
{
  "id": "mt-whitney",
  "name": "Mt. Whitney Summit",
  "url": "https://abc123.public.blob.vercel-storage.com/audio/mt-whitney-xyz.mp3",
  "duration": 180,
  "size": 2880000,
  "format": "mp3",
  "bitrate": 128,
  "coordinates": [-118.292, 36.578],
  "elevation": 14505,
  "chapter": "sierra-nevada",
  "featured": true,
  "uploadedAt": "2025-01-15T10:00:00Z",
  "contentType": "audio/mpeg"
}
```

## Step 6: Update Frontend

### 6.1 Create Audio Hook

Create `hooks/use-audio-stream.ts`:

```typescript
import { useState, useEffect } from 'react'
import type { AudioMetadata } from '@/lib/audio/types'

export function useAudioStream(audioId: string | null) {
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!audioId) {
      setMetadata(null)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/audio/metadata/${audioId}`)
      .then(res => res.json())
      .then(data => {
        setMetadata(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [audioId])

  const streamUrl = audioId ? `/api/audio/stream/${audioId}` : null

  return { metadata, streamUrl, loading, error }
}
```

### 6.2 Update Audio Player Component

Modify `components/audio/audio-player.tsx`:

```typescript
// Before
<audio src={marker.audioUrl} />

// After
import { useAudioStream } from '@/hooks/use-audio-stream'

function AudioPlayer({ markerId }: { markerId: string }) {
  const { streamUrl, metadata, loading } = useAudioStream(markerId)

  if (loading) return <div>Loading audio...</div>

  return (
    <audio
      src={streamUrl || undefined}
      preload="metadata"  // Only load metadata, not full file
    />
  )
}
```

### 6.3 Update Audio Markers

Modify `components/map/audio-markers.tsx`:

```typescript
// Before
const audioUrl = marker.audioUrl  // "/audio/file.mp3"

// After
const audioUrl = `/api/audio/stream/${marker.id}`
```

### 6.4 Deploy Frontend Changes

```bash
git add .
git commit -m "Update frontend to use Blob audio streaming"
git push origin main
```

## Step 7: Test End-to-End

### 7.1 Test in Browser

1. Open your app: `https://your-app.vercel.app`
2. Click on an audio marker
3. Verify audio player opens
4. Play audio, verify it streams correctly
5. Seek to middle of track, verify seeking works
6. Check Network tab in DevTools:
   - Should see `/api/audio/stream/[id]` request (307 redirect)
   - Should see Blob CDN URL request (200 or 206)
   - Verify `Accept-Ranges: bytes` header
   - Verify `Cache-Control` headers

### 7.2 Test on Mobile

1. Open app on mobile device
2. Test on slow connection (throttle in DevTools)
3. Verify range requests work for seeking
4. Check that audio doesn't buffer entire file
5. Test offline behavior (should fail gracefully)

### 7.3 Test Different Audio Formats

If you have multiple formats:
```bash
# Test MP3
curl -I "https://your-app.vercel.app/api/audio/stream/marker-mp3"

# Test M4A
curl -I "https://your-app.vercel.app/api/audio/stream/marker-m4a"

# Test OGG
curl -I "https://your-app.vercel.app/api/audio/stream/marker-ogg"
```

## Step 8: Cleanup (Optional)

### 8.1 Backup Static Files

```bash
# Create backup before deletion
mkdir -p backups
cp -r public/audio backups/audio-$(date +%Y%m%d)
tar -czf backups/audio-backup-$(date +%Y%m%d).tar.gz backups/audio-$(date +%Y%m%d)
```

### 8.2 Remove Static Files

```bash
# Remove from repository (keep backup locally)
git rm -r public/audio
git commit -m "Remove static audio files (migrated to Blob)"
git push origin main
```

### 8.3 Update .gitignore

```bash
echo "backups/" >> .gitignore
git add .gitignore
git commit -m "Ignore local audio backups"
git push origin main
```

## Step 9: Monitor Performance

### 9.1 Check Vercel Analytics

1. Go to Vercel Dashboard → Your Project → Analytics
2. Monitor:
   - Edge function invocations
   - Response times
   - Error rates
   - Cache hit rates

### 9.2 Monitor Blob Usage

1. Go to Vercel Dashboard → Your Project → Storage → Blob
2. Check:
   - Storage used (GB)
   - Bandwidth used (GB)
   - Request count

### 9.3 Set Up Alerts

Create alerts for:
- High error rates on streaming endpoints
- Blob storage approaching quota
- Bandwidth approaching quota
- Slow response times

## Rollback Procedure

If issues occur, rollback:

### Quick Rollback (Keep Blob)

```bash
# Revert frontend commit
git revert HEAD
git push origin main

# Restore static files from backup
tar -xzf backups/audio-backup-YYYYMMDD.tar.gz
git add public/audio
git commit -m "Rollback: restore static audio files"
git push origin main
```

### Full Rollback (Remove Blob)

```bash
# Revert all audio commits
git log --oneline | grep audio  # Find commit hashes
git revert <commit-hash-1> <commit-hash-2> ...
git push origin main

# Clean up Blob storage (optional)
# Go to Vercel Dashboard → Storage → Blob → Delete Store
```

## Troubleshooting

### Migration fails with "Directory not found"

```bash
# Verify public/audio exists
ls -la public/audio

# If missing, restore from backup or re-download files
```

### Migration succeeds but streaming fails

```bash
# Check environment variables
vercel env ls

# Verify BLOB_READ_WRITE_TOKEN is set
# Verify KV tokens are set

# Check Vercel logs
vercel logs --follow
```

### Audio plays but seeking doesn't work

- Verify browser supports range requests (all modern browsers do)
- Check audio file format is seekable (MP3, M4A, OGG are)
- Test with different audio player (HTML5 audio, Howler.js)

### High bandwidth costs

- Check if CDN caching is working (`Cache-Control` headers)
- Verify audio files are compressed (128kbps MP3)
- Consider implementing adaptive bitrate
- Set up Vercel Firewall to block abusive traffic

## Next Steps

After successful migration:

1. **Add Upload UI**: Create admin interface for uploading new audio
2. **Implement Analytics**: Track most popular audio markers
3. **Add Transcoding**: Convert audio to multiple formats/bitrates
4. **Optimize Formats**: Convert to Opus for better compression
5. **Add Waveforms**: Generate visualizations for audio player
6. **Implement Offline**: Cache audio in Service Worker for PWA

## Support

If you encounter issues:

1. Check Vercel logs: `vercel logs`
2. Review Network tab in DevTools
3. Test API endpoints with curl
4. Check Vercel Dashboard for storage quotas
5. Consult AUDIO_ARCHITECTURE.md for detailed explanations
