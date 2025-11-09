# Architecture Summary

High-level overview of the PCT audio streaming backend architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Web Browser  │  │    Mobile    │  │    Admin     │         │
│  │  (Desktop)   │  │   Browser    │  │  Interface   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ GET /stream      │ GET /stream      │ POST /upload
          │ GET /metadata    │ (Range requests) │ (Bearer token)
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│                      VERCEL EDGE NETWORK                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js 15 App Router (Edge)               │   │
│  │                                                           │   │
│  │  ┌───────────────────┐    ┌──────────────────────┐     │   │
│  │  │   Public Routes   │    │   Protected Routes    │     │   │
│  │  │                   │    │                       │     │   │
│  │  │ /audio/stream     │    │ /admin/audio/upload   │     │   │
│  │  │ /audio/metadata   │    │ /admin/audio/migrate  │     │   │
│  │  │ /audio/list       │    │ /admin/audio/[id]     │     │   │
│  │  └─────────┬─────────┘    └───────┬───────────────┘     │   │
│  │            │                      │                       │   │
│  │            ▼                      ▼                       │   │
│  │  ┌─────────────────┐    ┌────────────────┐             │   │
│  │  │  Blob Service   │    │  Auth Service   │             │   │
│  │  │  Metadata Svc   │    │  Storage Svc    │             │   │
│  │  └─────────┬───────┘    └────────┬────────┘             │   │
│  └────────────┼─────────────────────┼───────────────────────┘   │
└───────────────┼─────────────────────┼───────────────────────────┘
                │                     │
        ┌───────▼───────┐     ┌──────▼──────┐
        │               │     │             │
        │  Vercel Blob  │     │ Vercel KV   │
        │   (Storage)   │     │  (Redis)    │
        │               │     │             │
        │  50+ Audio    │     │  Metadata   │
        │    Files      │     │   Index     │
        │   ~5-10GB     │     │   ~256MB    │
        │               │     │             │
        └───────┬───────┘     └─────────────┘
                │
                ▼
        ┌───────────────┐
        │  Vercel CDN   │
        │  (Global)     │
        │               │
        │ • Edge Cache  │
        │ • Compression │
        │ • Range Reqs  │
        └───────────────┘
```

## Request Flow

### Audio Streaming (CDN-First)

```
1. Client:     GET /api/audio/stream/mt-whitney
               Range: bytes=0-1048575

2. Edge:       Validate ID
               Fetch metadata from KV (~5ms)
               Parse range header
               Generate redirect

3. Edge:       307 Redirect → Blob CDN URL
               Cache-Control: public, max-age=31536000

4. Client:     Follow redirect to CDN

5. CDN:        206 Partial Content
               Content-Range: bytes 0-1048575/5242880
               (Cached at edge for future requests)

Total latency: ~10ms (Edge) + ~50ms (CDN) = 60ms first request
               ~50ms (CDN cache hit) on subsequent requests
```

### Metadata Access (KV-Backed)

```
1. Client:     GET /api/audio/metadata/mt-whitney

2. Edge:       Fetch from Vercel KV
               Key: audio:metadata:mt-whitney

3. KV:         Return JSON (~5ms Redis lookup)

4. Edge:       Serialize response
               Cache-Control: public, max-age=3600

5. Client:     Receive metadata (duration, size, format, etc.)

Total latency: ~15ms (Edge + KV + JSON)
```

### Upload Flow (Admin)

```
1. Admin:      POST /api/admin/audio/upload
               Authorization: Bearer <token>
               Content-Type: multipart/form-data

2. Edge:       Validate Bearer token
               Check rate limit (10/min)
               Validate file format/size

3. Edge:       Extract audio metadata
               (duration, bitrate using music-metadata)

4. Edge:       Upload to Vercel Blob
               Path: /audio/{id}.{format}
               Cache-Control: public, max-age=31536000

5. Blob:       Store file + return CDN URL

6. Edge:       Store metadata in KV
               Indexes: global, chapter, featured

7. Edge:       Return 201 Created
               {id, url, metadata}

Total time: ~500ms for 5MB file
```

## Data Models

### AudioMetadata (Stored in Vercel KV)

```typescript
{
  id: "mt-whitney"                        // Unique identifier
  name: "Mt. Whitney Summit"              // Display name
  url: "https://...vercel-storage.com..." // CDN URL
  duration: 180                           // Seconds
  size: 2880000                           // Bytes
  format: "mp3"                           // mp3 | m4a | ogg
  bitrate: 128                            // kbps
  coordinates: [-118.292, 36.578]         // [lng, lat]
  elevation: 14505                        // Feet
  chapter: "sierra-nevada"                // Trail segment
  featured: true                          // Prominence flag
  uploadedAt: "2025-01-15T10:00:00Z"     // ISO timestamp
  contentType: "audio/mpeg"               // MIME type
}
```

### KV Index Structure

```
audio:metadata:{id}          → AudioMetadata (hash)
audio:index                  → Set<audioId> (all IDs)
audio:chapter:{chapter}      → Set<audioId> (chapter filter)
audio:featured               → Set<audioId> (featured filter)
```

## Service Layer

### blob-service.ts

**Responsibilities**:
- Vercel Blob CRUD operations
- Range header parsing
- Cache header generation
- Content-type detection
- File validation

**Key Functions**:
```typescript
uploadAudioBlob(id, buffer, contentType)
deleteAudioBlob(url)
audioBlobExists(url)
parseRangeHeader(header, fileSize)
getAudioCacheHeaders(etag)
```

### metadata-service.ts

**Responsibilities**:
- Audio metadata extraction
- Duration/bitrate detection
- Metadata validation
- Utility formatters

**Key Functions**:
```typescript
extractAudioMetadata(buffer, filename)
createAudioMetadata(params)
estimateStreamingBandwidth(bitrate)
formatFileSize(bytes)
formatDuration(seconds)
```

### storage-service.ts

**Responsibilities**:
- Vercel KV operations
- Metadata CRUD
- Index management
- List/filter operations

**Key Functions**:
```typescript
storeAudioMetadata(metadata)
getAudioMetadata(id)
updateAudioMetadata(id, updates)
deleteAudioMetadata(id)
listAudioMarkers(filters)
```

### auth-service.ts

**Responsibilities**:
- Bearer token validation
- Rate limiting
- Admin auth middleware

**Key Functions**:
```typescript
validateAdminToken(authHeader)
requireAdminAuth(request)
checkRateLimit(identifier, max, window)
```

## Caching Strategy

### Level 1: Browser Cache

```
Cache-Control: public, max-age=31536000, immutable

Audio files: Cached indefinitely (immutable URLs)
Metadata:    Cached 1 hour, revalidate in background
```

### Level 2: Vercel CDN

```
Global edge network caches:
- Audio files: 1 year cache
- Range requests: Cached per range
- ETags: Conditional requests
```

### Level 3: Vercel KV

```
Metadata stored in Redis:
- Instant access (~5ms)
- No TTL (manual invalidation)
- Indexed for fast filtering
```

## Security Model

### Public Endpoints (No Auth)

- `/api/audio/stream/[id]` - Read-only streaming
- `/api/audio/metadata/[id]` - Read-only metadata
- `/api/audio/list` - Read-only listing

**Protection**: Rate limiting via Vercel Edge

### Protected Endpoints (Bearer Token)

- `/api/admin/audio/upload` - Create
- `/api/admin/audio/migrate` - Bulk create
- `/api/admin/audio/[id]` - Delete
- `/api/admin/audio/[id]/metadata` - Update

**Protection**:
- Bearer token validation
- Rate limiting (10 uploads/min)
- Input validation (format, size)
- File format whitelist

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Stream (first request) | 60ms | Edge redirect + CDN |
| Stream (cache hit) | 50ms | CDN only |
| Metadata fetch | 15ms | KV lookup + JSON |
| List markers | 30ms | KV multi-get |
| Upload 5MB file | 500ms | Extract + Blob + KV |
| Range request | 55ms | Edge + CDN partial |

## Scaling Characteristics

### Horizontal Scaling

- **Edge Functions**: Auto-scale globally
- **Vercel CDN**: Distributed worldwide
- **Vercel KV**: Managed Redis cluster
- **Vercel Blob**: Auto-scaling storage

### Vertical Scaling

- **File Size Limit**: 50MB per file (configurable)
- **Storage Limit**: 100GB+ (Vercel Blob quota)
- **Concurrent Streams**: Unlimited (CDN-backed)
- **Metadata Queries**: 10,000+ QPS (KV capacity)

## Cost Model

### Storage Costs

```
Vercel Blob:
- $0.15/GB/month storage
- 5GB audio = $0.75/month

Vercel KV:
- First 256MB free
- 50 markers = ~1MB = FREE
```

### Bandwidth Costs

```
Vercel Blob:
- First 100GB free
- $0.10/GB thereafter

Example:
- 500GB/month = $40/month
- 1TB/month = $90/month

CDN caching reduces bandwidth costs significantly
```

### Compute Costs

```
Edge Functions:
- First 1M invocations free
- $0.60 per 1M thereafter

Streaming uses redirects (minimal compute)
Metadata API counts toward quota
```

### Total Cost Examples

```
Light Traffic (10K streams/month):
- Storage: $0.75
- Bandwidth: FREE (under 100GB)
- Compute: FREE (under 1M)
Total: $0.75/month

Medium Traffic (100K streams/month):
- Storage: $0.75
- Bandwidth: ~$20 (300GB)
- Compute: FREE
Total: ~$20/month

Heavy Traffic (1M streams/month):
- Storage: $0.75
- Bandwidth: ~$200 (2TB)
- Compute: ~$1
Total: ~$200/month
```

## Resilience Patterns

### Retry Logic

- Vercel Blob SDK: Automatic exponential backoff
- KV Operations: Single attempt (fast, low failure rate)
- Client-side: Retry on 5xx errors

### Circuit Breaker

- Not implemented (Vercel infrastructure handles this)
- Future: Add for external dependencies

### Graceful Degradation

- Blob unavailable: Metadata still accessible
- KV unavailable: Direct Blob URLs still work
- Edge function error: Return cached response

### Error Handling

Consistent error response format:
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

Error codes: `AUDIO_NOT_FOUND`, `INVALID_RANGE`, `AUTH_REQUIRED`, etc.

## Technology Stack

- **Runtime**: Next.js 15 App Router (Edge Runtime)
- **Storage**: Vercel Blob (S3-compatible)
- **Database**: Vercel KV (Redis)
- **CDN**: Vercel Edge Network
- **Metadata**: music-metadata library
- **Auth**: Bearer token (environment variable)
- **Validation**: Zod (optional, for request validation)
- **TypeScript**: Strict mode with path aliases

## Deployment Model

### Development

```
Local: http://localhost:3000
- .env.local for tokens
- KV and Blob via Vercel REST APIs
```

### Production

```
Vercel: https://your-app.vercel.app
- Environment variables in Vercel dashboard
- Auto-deploy on git push
- Edge functions at ~300 global locations
```

## Migration Strategy

### Phase 1: Deploy Backend

1. Install dependencies
2. Configure environment variables
3. Deploy Next.js app to Vercel
4. Verify API endpoints work

### Phase 2: Migrate Data

1. Run migration endpoint
2. Verify all files uploaded
3. Test streaming endpoints
4. Check metadata accuracy

### Phase 3: Update Frontend

1. Change audio URLs to API endpoints
2. Deploy frontend changes
3. Test end-to-end in production
4. Monitor for errors

### Phase 4: Cleanup

1. Verify migration success
2. Remove static files from /public/audio
3. Monitor performance and costs
4. Set up alerts and dashboards

## Monitoring & Observability

### Metrics to Track

- Audio stream requests/second
- Upload success/failure rate
- Cache hit rate (CDN)
- Edge function duration
- Blob API latency
- KV operation latency
- Error rate by endpoint

### Logging Strategy

Structured JSON logs with context:
```json
{
  "timestamp": "2025-01-15T10:00:00Z",
  "level": "error",
  "message": "Audio upload failed",
  "audioId": "mt-whitney",
  "error": "File too large",
  "fileSize": 52428800
}
```

### Alerting

Set up alerts for:
- High error rates (>1%)
- Slow response times (>500ms p95)
- Storage quota approaching limit
- Bandwidth quota approaching limit
- Unusual traffic patterns

## Future Enhancements

### Short-term (1-3 months)

- Admin upload UI (drag-and-drop)
- Audio transcoding (multiple bitrates)
- Waveform generation
- Download analytics

### Medium-term (3-6 months)

- Adaptive bitrate streaming
- Offline support (PWA)
- Audio processing (normalization)
- Bulk operations API

### Long-term (6+ months)

- Real-time audio streaming (WebRTC)
- Collaborative audio annotations
- AI-powered transcription
- Spatial audio (3D positioning)

## Decision Records

### Why Vercel Blob over S3?

- **Pros**: Integrated with Vercel, automatic CDN, simple API, no CORS config
- **Cons**: Vendor lock-in, potentially higher cost at scale
- **Decision**: Use Blob for MVP, migrate to S3 if costs become prohibitive

### Why KV (Redis) over Postgres?

- **Pros**: Faster for key-value lookups, simpler indexing, lower latency
- **Cons**: Limited query capabilities, no joins, no transactions
- **Decision**: Use KV for metadata, consider Postgres for analytics

### Why 307 Redirect over Proxy?

- **Pros**: Minimal edge function time, lower costs, better caching
- **Cons**: Two requests (redirect + content), harder to track metrics
- **Decision**: Use redirect for performance, add proxy option for analytics

### Why Range Requests over Adaptive Streaming?

- **Pros**: Standard HTTP, browser native support, simpler implementation
- **Cons**: Not optimal for very slow connections, single bitrate
- **Decision**: Use range requests for MVP, add adaptive streaming later

## Resources

- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)
- [HTTP Range Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)
- [Next.js App Router](https://nextjs.org/docs/app)
- [music-metadata](https://github.com/borewit/music-metadata)
