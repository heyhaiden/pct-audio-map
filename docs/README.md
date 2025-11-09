# PCT Audio Map Documentation

Complete documentation for the Vercel Blob audio storage and streaming backend.

## Quick Links

- **[SETUP.md](./SETUP.md)** - Quick setup guide for new installations
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Step-by-step migration from static files
- **[AUDIO_ARCHITECTURE.md](./AUDIO_ARCHITECTURE.md)** - Detailed architecture documentation
- **[API_EXAMPLES.md](./API_EXAMPLES.md)** - Code examples and usage patterns
- **[api-schema.yaml](./api-schema.yaml)** - OpenAPI specification

## Overview

This backend service architecture enables efficient storage and streaming of 50+ audio files attached to PCT trail map markers using:

- **Vercel Blob** - CDN-backed audio storage
- **Vercel KV** - Fast metadata access (Redis)
- **Next.js 15 App Router** - API route handlers
- **Range Requests** - Native seeking support
- **Edge Network** - Global audio delivery

## Architecture Highlights

### CDN-First Streaming

Audio streaming uses **307 redirects** to Vercel Blob CDN URLs for optimal performance:

```
Client → Edge Function (validate) → 307 Redirect → Vercel CDN → Audio
         (~10ms)                                     (cached globally)
```

This minimizes edge function execution time while leveraging Vercel's global CDN.

### Range Request Support

Native browser seeking with HTTP range requests:

```
Range: bytes=0-1048575 (first 1MB)
→ 206 Partial Content
Content-Range: bytes 0-1048575/5242880
```

Mobile users can seek without downloading entire files.

### Metadata Layer

Fast metadata access via Vercel KV (Redis):

```
/api/audio/metadata/[id] → Vercel KV → JSON response (5ms)
```

No Blob API calls needed for duration, size, format, coordinates.

### Secure Admin API

Protected upload/management endpoints:

```
POST /api/admin/audio/upload
Authorization: Bearer <token>
```

Rate limiting, input validation, and file format checking.

## API Endpoints

### Public (Unauthenticated)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/audio/stream/[id]` | Stream audio with range support |
| GET | `/api/audio/metadata/[id]` | Get audio metadata |
| GET | `/api/audio/list` | List all markers (filterable) |

### Protected (Admin Only)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/audio/upload` | Upload new audio file |
| POST | `/api/admin/audio/migrate` | Migrate static files to Blob |
| DELETE | `/api/admin/audio/[id]` | Delete audio file |
| PUT | `/api/admin/audio/[id]/metadata` | Update marker metadata |

## Data Flow

### Streaming Flow

```mermaid
sequenceDiagram
    Client->>Edge: GET /api/audio/stream/mt-whitney
    Edge->>KV: Fetch metadata
    KV-->>Edge: AudioMetadata
    Edge-->>Client: 307 Redirect to CDN URL
    Client->>CDN: Follow redirect
    CDN-->>Client: 200 OK (audio stream)
    Note over Client,CDN: Subsequent requests hit CDN cache
```

### Upload Flow

```mermaid
sequenceDiagram
    Admin->>Edge: POST /api/admin/audio/upload
    Edge->>Edge: Validate token & file
    Edge->>Edge: Extract metadata
    Edge->>Blob: Upload file
    Blob-->>Edge: CDN URL
    Edge->>KV: Store metadata
    Edge-->>Admin: 201 Created
```

## File Structure

```
├── app/api/
│   ├── audio/
│   │   ├── stream/[id]/route.ts      # Streaming endpoint
│   │   ├── metadata/[id]/route.ts    # Metadata endpoint
│   │   └── list/route.ts             # List endpoint
│   └── admin/audio/
│       ├── upload/route.ts           # Upload endpoint
│       ├── migrate/route.ts          # Migration endpoint
│       ├── [id]/route.ts             # Delete endpoint
│       └── [id]/metadata/route.ts    # Update endpoint
├── lib/audio/
│   ├── types.ts                      # TypeScript interfaces
│   ├── blob-service.ts               # Blob operations
│   ├── metadata-service.ts           # Audio metadata extraction
│   ├── storage-service.ts            # KV operations
│   └── auth-service.ts               # Authentication
└── docs/
    ├── SETUP.md                      # Setup guide
    ├── MIGRATION_GUIDE.md            # Migration steps
    ├── AUDIO_ARCHITECTURE.md         # Architecture docs
    ├── API_EXAMPLES.md               # Code examples
    └── api-schema.yaml               # OpenAPI spec
```

## Getting Started

### 1. Install Dependencies

```bash
pnpm install @vercel/blob @vercel/kv music-metadata
```

### 2. Configure Environment

```bash
# Copy example
cp .env.example .env.local

# Add your tokens (see SETUP.md)
vercel env add BLOB_READ_WRITE_TOKEN
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
vercel env add ADMIN_API_TOKEN
```

### 3. Deploy

```bash
git push origin main
# Auto-deploys to Vercel
```

### 4. Migrate Files

```bash
curl -X POST https://your-app.vercel.app/api/admin/audio/migrate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Update Frontend

```typescript
// Before
<audio src="/audio/mt-whitney.mp3" />

// After
<audio src="/api/audio/stream/mt-whitney" />
```

See [SETUP.md](./SETUP.md) for detailed instructions.

## Key Features

### Performance

- **CDN Caching**: 1-year immutable cache for audio files
- **Edge Streaming**: Minimal server-side processing
- **Range Requests**: Efficient seeking for mobile
- **Metadata Cache**: Fast access without Blob API calls

### Resilience

- **Graceful Degradation**: Audio streams even if metadata fails
- **Retry Logic**: Automatic retries for Blob operations
- **Error Handling**: Consistent error responses with codes
- **Rate Limiting**: Protection against abuse

### Security

- **Bearer Authentication**: Token-based admin access
- **Input Validation**: File format, size, metadata validation
- **Rate Limiting**: Request throttling per IP
- **Public Read-Only**: Streaming requires no authentication

### Mobile Optimization

- **Range Requests**: Download only needed portions
- **Compression**: Automatic gzip/Brotli support
- **Adaptive**: Future support for multiple bitrates
- **Preloading**: Metadata preload for instant playback

## Cost Estimates

Based on 50 audio files (~5GB) with moderate traffic:

| Service | Usage | Cost |
|---------|-------|------|
| Vercel Blob Storage | 5GB | $0.75/month |
| Vercel Blob Bandwidth | 500GB | $40/month |
| Vercel KV Storage | 256MB | Free |
| Vercel KV Requests | 10M | Free |
| Edge Functions | 1M invocations | Free |
| **Total** | | **~$40/month** |

Scales linearly with traffic. CDN caching reduces bandwidth costs.

## Performance Benchmarks

| Metric | Value | Notes |
|--------|-------|-------|
| Edge function time | ~10ms | Metadata fetch + redirect |
| CDN response time | ~50ms | Global edge locations |
| Range request overhead | ~5ms | Partial content calculation |
| Metadata API response | ~15ms | KV fetch + JSON serialize |
| Upload processing | ~500ms | 5MB file + metadata extraction |

## Common Use Cases

### Featured Marker Preloading

```typescript
useEffect(() => {
  // Preload featured markers on page load
  fetch('/api/audio/list?featured=true')
    .then(r => r.json())
    .then(({ markers }) => {
      markers.forEach(m => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'fetch'
        link.href = `/api/audio/stream/${m.id}`
        document.head.appendChild(link)
      })
    })
}, [])
```

### Chapter-Based Loading

```typescript
// Load audio when user enters a chapter
function onChapterChange(chapter: string) {
  fetch(`/api/audio/list?chapter=${chapter}`)
    .then(r => r.json())
    .then(({ markers }) => {
      // Show markers on map
      markers.forEach(addMarkerToMap)
    })
}
```

### Progressive Audio Loading

```typescript
// Load audio in chunks for large files
async function loadAudioChunked(id: string) {
  const metadata = await fetch(`/api/audio/metadata/${id}`).then(r => r.json())
  const chunkSize = 1024 * 1024 // 1MB

  for (let start = 0; start < metadata.size; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, metadata.size - 1)
    const chunk = await fetch(`/api/audio/stream/${id}`, {
      headers: { 'Range': `bytes=${start}-${end}` }
    }).then(r => r.arrayBuffer())

    // Process chunk
  }
}
```

## Troubleshooting

### Audio Not Playing

1. Check browser console for errors
2. Verify Blob URL is accessible
3. Test audio format (MP3, M4A, OGG)
4. Check network tab for failed requests

See [AUDIO_ARCHITECTURE.md](./AUDIO_ARCHITECTURE.md#troubleshooting) for detailed troubleshooting.

### Migration Issues

1. Verify `/public/audio` directory exists
2. Check environment variables are set
3. Review migration response for failures
4. Re-run migration (idempotent)

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md#troubleshooting) for migration troubleshooting.

### Performance Issues

1. Check CDN cache hit rate in Vercel Analytics
2. Verify audio files are compressed (128kbps)
3. Test from different regions
4. Monitor Blob API latency

See [AUDIO_ARCHITECTURE.md](./AUDIO_ARCHITECTURE.md#performance-optimization) for optimization tips.

## Future Enhancements

- [ ] Adaptive bitrate streaming (multiple formats)
- [ ] Audio transcoding pipeline (automatic conversion)
- [ ] Waveform generation for visualizations
- [ ] Download analytics and usage tracking
- [ ] Offline support with Service Workers (PWA)
- [ ] Audio processing (normalization, compression)
- [ ] Admin UI for uploads (drag-and-drop interface)
- [ ] Bulk operations (batch upload, export)

## Support & Resources

- **Documentation**: This docs folder
- **OpenAPI Spec**: [api-schema.yaml](./api-schema.yaml)
- **Vercel Blob Docs**: https://vercel.com/docs/storage/vercel-blob
- **Vercel KV Docs**: https://vercel.com/docs/storage/vercel-kv
- **HTTP Range Requests**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests

## Contributing

When making changes to the audio backend:

1. Update relevant documentation files
2. Update OpenAPI schema if API changes
3. Add code examples to API_EXAMPLES.md
4. Test migration and streaming endpoints
5. Update cost estimates if storage changes
6. Document breaking changes prominently

## License

Part of the PCT Audio Map project.
