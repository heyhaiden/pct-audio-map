# Audio Backend Setup

Quick setup guide for the Vercel Blob audio storage backend.

## 1. Install Dependencies

```bash
pnpm install @vercel/blob @vercel/kv music-metadata
```

Add to `package.json`:
```json
{
  "dependencies": {
    "@vercel/blob": "^0.23.0",
    "@vercel/kv": "^1.0.1",
    "music-metadata": "^8.1.4"
  }
}
```

## 2. Environment Variables

Create `.env.local` for development:

```bash
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxxx

# Vercel KV (Redis)
KV_REST_API_URL=https://xxxxxx.kv.vercel-storage.com
KV_REST_API_TOKEN=xxxxxxxxxx

# Admin API Authentication
ADMIN_API_TOKEN=your_secure_random_token_here

# Optional: Custom CDN domain
NEXT_PUBLIC_AUDIO_CDN_DOMAIN=cdn.pct-audio.com
```

### Generate Secure Token

```bash
# macOS/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Vercel Project Configuration

### Enable Blob Storage

Via Vercel Dashboard:
1. Go to your project
2. Navigate to Storage tab
3. Click "Create Database" → Select "Blob"
4. Copy `BLOB_READ_WRITE_TOKEN` to environment variables

Via CLI:
```bash
vercel link  # Link to your project
vercel storage create blob pct-audio-blob
vercel env add BLOB_READ_WRITE_TOKEN
```

### Enable KV Storage

Via Vercel Dashboard:
1. Go to your project
2. Navigate to Storage tab
3. Click "Create Database" → Select "KV"
4. Copy `KV_REST_API_URL` and `KV_REST_API_TOKEN` to environment variables

Via CLI:
```bash
vercel storage create kv pct-audio-metadata
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
```

### Add Admin Token

```bash
# Generate token
TOKEN=$(openssl rand -hex 32)

# Add to Vercel (production)
vercel env add ADMIN_API_TOKEN production
# Paste token when prompted

# Add to local .env.local
echo "ADMIN_API_TOKEN=$TOKEN" >> .env.local
```

## 4. TypeScript Configuration

Ensure paths are configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## 5. Deploy Backend

```bash
# Build locally to check for errors
pnpm build

# Deploy to Vercel
git add .
git commit -m "Add Vercel Blob audio backend"
git push origin main

# Or deploy directly
vercel --prod
```

## 6. Test Deployment

```bash
# Set variables
PROD_URL="https://your-app.vercel.app"
ADMIN_TOKEN="your_admin_token_here"

# Test metadata endpoint
curl "$PROD_URL/api/audio/list" | jq '.'

# Should return empty list before migration:
# {"markers":[],"total":0}

# Test upload (with actual audio file)
curl -X POST "$PROD_URL/api/admin/audio/upload" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@test.mp3" \
  -F "name=Test Audio" \
  -F "coordinates=[-120.0, 38.0]" \
  -F "elevation=8000" \
  -F "chapter=sierra-nevada" \
  -F "featured=false" \
  | jq '.'

# Expected: 201 response with audio metadata
```

## 7. Run Migration

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration steps.

Quick version:
```bash
curl -X POST "$PROD_URL/api/admin/audio/migrate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.'
```

## 8. Update Frontend

Modify audio player to use streaming API:

```typescript
// Before
<audio src="/audio/mt-whitney.mp3" />

// After
<audio src="/api/audio/stream/mt-whitney" />
```

## 9. Verify Everything Works

```bash
# List migrated audio
curl "$PROD_URL/api/audio/list" | jq '.markers[].name'

# Test streaming
curl -I "$PROD_URL/api/audio/stream/mt-whitney"
# Should return 307 redirect to Blob CDN

# Test range request
curl "$PROD_URL/api/audio/stream/mt-whitney" \
  -H "Range: bytes=0-1048575" \
  --output partial.mp3
ls -lh partial.mp3  # Should be ~1MB
```

## Common Issues

### "BLOB_READ_WRITE_TOKEN is not defined"

```bash
# Check environment variable is set
vercel env ls

# Add if missing
vercel env add BLOB_READ_WRITE_TOKEN
```

### "KV_REST_API_URL is not defined"

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Check if KV is created
vercel storage ls
```

### "Unauthorized" on admin endpoints

```bash
# Verify token matches
vercel env get ADMIN_API_TOKEN

# Test with correct token
curl -X POST "$PROD_URL/api/admin/audio/migrate" \
  -H "Authorization: Bearer YOUR_ACTUAL_TOKEN"
```

### Migration says "No matching marker"

Check that audio filenames in `/public/audio/` match `audioUrl` in `data/audio-markers.ts`:

```typescript
// data/audio-markers.ts
{
  id: "mt-whitney",
  audioUrl: "/audio/mt-whitney.mp3",  // Must match filename
  // ...
}
```

### Audio doesn't play in browser

1. Check Content-Type header is correct (`audio/mpeg`, `audio/mp4`, etc.)
2. Verify file format is supported by browser (Safari requires MP3/M4A)
3. Test with different audio player library (Howler.js, Plyr)
4. Check browser console for CORS errors (should not happen with Vercel Blob)

## Security Notes

### Protect Admin Token

- Never commit `ADMIN_API_TOKEN` to git
- Add `.env.local` to `.gitignore`
- Rotate token if compromised
- Use different tokens for production and staging

### Rate Limiting

Current implementation uses in-memory rate limiting. For production with multiple instances:

```typescript
// lib/audio/auth-service.ts
// Replace in-memory Map with Redis:
import { kv } from '@vercel/kv'

export async function checkRateLimit(identifier: string) {
  const key = `ratelimit:${identifier}`
  const count = await kv.incr(key)

  if (count === 1) {
    await kv.expire(key, 60)  // 1 minute window
  }

  return count <= 10  // 10 requests per minute
}
```

## Performance Tips

### Optimize Audio Files

```bash
# Compress MP3 to 128kbps (good quality for ambient audio)
ffmpeg -i input.mp3 -b:a 128k -ar 44100 output.mp3

# Convert to Opus (better compression)
ffmpeg -i input.mp3 -c:a libopus -b:a 96k output.opus

# Normalize volume
ffmpeg -i input.mp3 -af loudnorm output.mp3
```

### Preload Strategy

Only preload featured markers:
```typescript
<link
  rel="preload"
  as="fetch"
  href="/api/audio/metadata/mt-whitney"
  crossOrigin="anonymous"
/>
```

### Cache Audio List

Cache the list response client-side:
```typescript
const { data } = useSWR('/api/audio/list', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000,  // 1 minute
})
```

## Next Steps

- Read [AUDIO_ARCHITECTURE.md](./AUDIO_ARCHITECTURE.md) for detailed architecture
- Follow [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration steps
- Review [api-schema.yaml](./api-schema.yaml) for API documentation
- Set up monitoring and alerts in Vercel Dashboard
- Consider implementing adaptive bitrate streaming
- Add analytics to track audio usage
