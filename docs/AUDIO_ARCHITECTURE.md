# PCT Audio Streaming Architecture

## Overview

This document describes the backend service architecture for storing and streaming 50+ audio files attached to PCT trail map markers using Vercel Blob storage.

## Architecture Principles

1. **CDN-First Streaming**: Direct Vercel Blob CDN URLs for optimal performance
2. **Range Request Support**: Native browser audio seeking with HTTP range requests
3. **Edge-Optimized**: Minimal server-side processing, leverage Vercel Edge Network
4. **Resilient**: Circuit breakers, retries, graceful degradation
5. **Secure**: Admin authentication, rate limiting, input validation
6. **Observable**: Structured logging, error tracking, performance metrics

## System Components

### Storage Layer

**Vercel Blob** (Primary Storage)
- Stores audio files (MP3, M4A, OGG, WAV, FLAC)
- Global CDN distribution
- Automatic compression and optimization
- Native range request support
- 1-year cache headers for immutable files

**Vercel KV** (Metadata Store)
- Redis-based key-value store
- Stores AudioMetadata objects
- Indexes: global, per-chapter, featured
- Fast metadata retrieval without Blob access
- TTL support for cache invalidation

**Alternative: Vercel Postgres** (Not implemented, optional)
- For relational queries (e.g., geographic searches)
- Better for complex filtering and joins
- Trade-off: Slightly higher latency than KV

### API Layer

#### Public Endpoints (Unauthenticated)

**GET /api/audio/stream/[id]**
- **Purpose**: Stream audio with seeking support
- **Strategy**: 307 redirect to Vercel Blob CDN URL
- **Range Support**: CDN handles partial content (206 responses)
- **Caching**: `Cache-Control: public, max-age=31536000, immutable`
- **Performance**: ~10ms edge function time, then CDN-direct
- **Mobile Optimization**: Automatic compression via Accept-Encoding

**GET /api/audio/metadata/[id]**
- **Purpose**: Get audio info without downloading file
- **Source**: Vercel KV (no Blob access)
- **Caching**: `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`
- **Response**: JSON with duration, size, format, coordinates, etc.

**GET /api/audio/list**
- **Purpose**: List all markers with filtering
- **Query Params**: `?chapter=sierra-nevada&featured=true`
- **Caching**: `Cache-Control: public, max-age=300`
- **Response**: Array of AudioMetadata + total count

#### Protected Endpoints (Admin Only)

**POST /api/admin/audio/upload**
- **Auth**: Bearer token in Authorization header
- **Body**: multipart/form-data with file + metadata
- **Validation**: Format, size (50MB max), coordinates, elevation
- **Process**: Extract metadata → Upload to Blob → Store in KV
- **Rate Limit**: 10 uploads per minute per IP
- **Response**: 201 with audio ID, CDN URL, metadata

**POST /api/admin/audio/migrate**
- **Auth**: Bearer token
- **Purpose**: Migrate /public/audio files to Blob
- **Process**: Read local files → Match with audio-markers.ts → Upload to Blob
- **Response**: Migration report (migrated count, failed files, URL mapping)
- **Idempotency**: Can be run multiple times safely

**DELETE /api/admin/audio/[id]**
- **Auth**: Bearer token
- **Process**: Delete from Blob → Delete from KV
- **Response**: 204 No Content
- **Resilience**: Continues with KV deletion even if Blob deletion fails

**PUT /api/admin/audio/[id]/metadata**
- **Auth**: Bearer token
- **Purpose**: Update marker metadata (not audio file)
- **Body**: JSON with optional fields (name, coordinates, elevation, chapter, featured)
- **Process**: Update KV entry, reindex if chapter/featured changed
- **Response**: 200 with updated metadata

### Service Layer

**blob-service.ts**
- Vercel Blob operations (upload, delete, head, list)
- Range request parsing
- Cache header generation
- Content-type detection
- File format validation

**metadata-service.ts**
- Audio metadata extraction using `music-metadata` library
- Duration, bitrate, format detection
- Metadata validation
- Utility functions (file size formatting, duration formatting)

**storage-service.ts**
- Vercel KV operations
- CRUD operations for AudioMetadata
- Indexing (global, chapter, featured)
- Bulk operations for migration
- List/filter operations

**auth-service.ts**
- Bearer token validation
- Multiple admin tokens support (comma-separated env var)
- Rate limiting (in-memory, upgradable to Redis)
- Unauthorized response generation

## Data Models

### AudioMetadata

```typescript
{
  id: string                    // Unique identifier (e.g., "mt-whitney")
  name: string                  // Display name
  url: string                   // Vercel Blob CDN URL
  duration: number              // Seconds
  size: number                  // Bytes
  format: 'mp3' | 'm4a' | 'ogg' // Audio format
  bitrate: number               // kbps
  coordinates: [number, number] // [lng, lat]
  elevation: number             // Feet
  chapter: string               // Trail segment ID
  featured: boolean             // Prominence flag
  uploadedAt: string            // ISO 8601 timestamp
  contentType: string           // MIME type
}
```

### Vercel KV Index Structure

```
audio:metadata:{id}          → AudioMetadata (JSON)
audio:index                  → Set<string> (all IDs)
audio:chapter:{chapter}      → Set<string> (IDs in chapter)
audio:featured               → Set<string> (featured IDs)
```

## Audio Streaming Flow

### Desktop/High-Bandwidth Flow

```
1. Client requests /api/audio/stream/mt-whitney
2. Edge function validates ID, fetches metadata from KV (~5ms)
3. Returns 307 redirect to Vercel Blob CDN URL
4. Client follows redirect, hits Vercel CDN
5. CDN serves audio with Cache-Control: immutable
6. Subsequent requests: Client cached or CDN cached (cache hit)
```

### Mobile/Seeking Flow

```
1. Client requests /api/audio/stream/mt-whitney
   Range: bytes=0-1048575 (first 1MB)
2. Edge function validates range against metadata.size
3. Returns 307 redirect with Range header preserved
4. Client follows redirect to CDN
5. CDN returns 206 Partial Content
   Content-Range: bytes 0-1048575/5242880
6. User seeks to 30 seconds
7. Client calculates byte range from bitrate
8. Requests Range: bytes=500000-1548575
9. CDN returns next chunk (206 response)
```

### Upload Flow

```
1. Admin POSTs to /api/admin/audio/upload
   Authorization: Bearer <token>
   Body: file + name + coordinates + elevation + chapter
2. Edge function validates token, rate limit, file format/size
3. Extracts metadata (duration, bitrate) using music-metadata
4. Uploads to Vercel Blob with content-type and cache headers
5. Receives CDN URL from Blob API
6. Creates AudioMetadata object
7. Stores in Vercel KV with indexing
8. Returns 201 with ID, URL, metadata
```

### Migration Flow

```
1. Admin POSTs to /api/admin/audio/migrate
2. Edge function reads /public/audio directory
3. For each file:
   - Finds matching marker in audio-markers.ts
   - Reads file buffer
   - Extracts metadata
   - Uploads to Blob
   - Stores metadata in KV
   - Tracks success/failure
4. Returns migration report
```

## Caching Strategy

### Levels of Caching

**Level 1: Browser Cache**
- Audio files: Cached indefinitely (immutable)
- Metadata: Cached for 1 hour, revalidated in background

**Level 2: Vercel Edge Network (CDN)**
- Audio files: Cached at edge locations globally
- Cache-Control: public, max-age=31536000, immutable
- ETags for conditional requests

**Level 3: Vercel KV (Metadata)**
- Instant metadata access without Blob API calls
- No TTL (manual invalidation on updates)

### Cache Invalidation

**Audio Files**: Never invalidate (immutable, new uploads get new IDs)
**Metadata**: Invalidate on update via KV writes
**Lists**: Short TTL (5 minutes) for dynamic discovery

## Performance Optimization

### Desktop Optimization

- **Direct CDN Streaming**: 307 redirect minimizes edge function time
- **Immutable Caching**: 1-year max-age prevents revalidation
- **HTTP/2**: Vercel CDN supports multiplexing
- **Compression**: Automatic gzip/Brotli for HTTP headers (not audio data)

### Mobile Optimization

- **Range Requests**: Native seeking support without downloading full file
- **Adaptive Bitrate** (Future): Store multiple formats (128kbps, 256kbps) and serve based on connection
- **Preload Hints**: Link headers for critical audio markers
- **Connection-Aware**: Detect slow connections via Navigator.connection API (client-side)

### Streaming Best Practices

1. **Chunk Size**: 5 seconds of audio per range request
2. **Bitrate**: 128kbps for ambient audio (sufficient quality, smaller size)
3. **Format**: MP3 for widest compatibility, Opus for best compression
4. **Preloading**: Load featured markers on page load for instant playback

## Security

### Authentication

- **Method**: Bearer token authentication
- **Storage**: `ADMIN_API_TOKEN` environment variable
- **Multiple Tokens**: Comma-separated for team access
- **Rotation**: Update env var, old tokens immediately invalid

### Authorization

- **Public Endpoints**: No auth (streaming, metadata, list)
- **Admin Endpoints**: Require valid Bearer token
- **Rate Limiting**: 100 requests/minute for public, 10 uploads/minute for admin

### Input Validation

- **File Format**: Whitelist (mp3, m4a, ogg, wav, flac)
- **File Size**: 50MB hard limit
- **Coordinates**: Validate [lng, lat] format and ranges
- **Elevation**: Numeric validation
- **Chapter**: Validate against known segments

### Attack Prevention

- **DDoS**: Vercel Edge Network built-in protection
- **File Upload**: Size limits, format validation, virus scanning (future)
- **SQL Injection**: N/A (using KV, not SQL)
- **XSS**: N/A (JSON API, not HTML)
- **CSRF**: Not needed (token-based auth, no cookies)

## Resilience Patterns

### Circuit Breaker

Not implemented at API level (Vercel Blob has built-in retry). Future: Add circuit breaker for external dependencies.

### Retry Logic

- **Blob Operations**: Vercel SDK has automatic retry with exponential backoff
- **KV Operations**: Single attempt (fast, low failure rate)

### Timeout Management

- **Edge Function**: 10s default timeout (sufficient for all operations)
- **Blob Upload**: 30s timeout for large files
- **KV Operations**: 1s timeout (redis is fast)

### Graceful Degradation

- **Blob Unavailable**: Serve error, metadata still accessible via KV
- **KV Unavailable**: Serve error, audio still streamable via direct URL
- **Migration Failures**: Continue with other files, return failure report

### Error Handling

All errors return consistent format:
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": "Technical details (optional)"
}
```

Error codes: AUDIO_NOT_FOUND, INVALID_RANGE, STREAM_ERROR, AUTH_REQUIRED, FILE_TOO_LARGE, UPLOAD_ERROR, etc.

## Observability

### Logging

**Structured Logs** (JSON format):
```typescript
{
  timestamp: "2025-01-15T10:30:00Z",
  level: "error",
  message: "Audio upload failed",
  context: {
    audioId: "mt-whitney",
    error: "File too large",
    fileSize: 52428800
  }
}
```

**Log Levels**:
- ERROR: Failed operations, exceptions
- WARN: Degraded operations, missing optional data
- INFO: Successful operations, audit trail
- DEBUG: Detailed diagnostics (disabled in production)

### Metrics (Future Enhancement)

Track in Vercel Analytics or DataDog:
- Audio stream requests/second
- Upload success/failure rate
- Average file size
- Range request percentage
- Cache hit rate
- Edge function duration
- Blob API latency

### Tracing (Future Enhancement)

OpenTelemetry integration:
- Trace audio upload: Form parse → Metadata extract → Blob upload → KV store
- Trace streaming: Metadata fetch → Range validate → Redirect
- Distributed tracing for debugging

## Deployment

### Environment Variables

**Required**:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_token_xxx
KV_REST_API_URL=https://xxx.kv.vercel-storage.com
KV_REST_API_TOKEN=xxx
ADMIN_API_TOKEN=secure_random_token_1,secure_random_token_2
```

**Optional**:
```
NEXT_PUBLIC_AUDIO_CDN_DOMAIN=cdn.pct-audio.com (custom domain)
```

### Migration Steps

1. **Setup Vercel Blob**: Enable in Vercel project settings
2. **Setup Vercel KV**: Enable in Vercel project settings
3. **Set Environment Variables**: Add tokens to Vercel dashboard
4. **Deploy Application**: Push to main branch or run `vercel deploy`
5. **Run Migration**: `curl -X POST https://your-app.vercel.app/api/admin/audio/migrate -H "Authorization: Bearer YOUR_TOKEN"`
6. **Verify Migration**: Check Vercel Blob dashboard, test streaming
7. **Update Frontend**: Change audio URLs from `/audio/file.mp3` to `/api/audio/stream/marker-id`
8. **Remove Static Files**: Delete /public/audio directory (keep backup)

### Rollback Strategy

If issues occur:
1. Revert frontend to use `/audio/*.mp3` paths
2. Keep static files in /public/audio as backup
3. Debug Blob/KV issues
4. Re-run migration when fixed

### Cost Estimates

**Vercel Blob**:
- Storage: $0.15/GB/month (~5GB audio = $0.75/month)
- Bandwidth: First 100GB free, $0.10/GB after (500GB streams = $40/month)

**Vercel KV**:
- Storage: First 256MB free (~50 markers = negligible)
- Requests: First 10M free (streaming doesn't hit KV repeatedly)

**Edge Functions**:
- First 1M invocations free (metadata API calls)
- Streaming uses redirects (minimal function time)

**Total Estimated Cost**: $5-50/month depending on traffic

## Future Enhancements

### Adaptive Bitrate Streaming

Store multiple formats:
```
audio:mp3:128kbps:mt-whitney
audio:mp3:256kbps:mt-whitney
audio:opus:96kbps:mt-whitney
```

Select based on:
- Connection speed (Navigator.connection.effectiveType)
- Device type (mobile vs desktop)
- User preference

### Audio Transcoding Pipeline

Use Vercel Edge Functions or separate worker:
1. Upload high-quality source (WAV, FLAC)
2. Transcode to MP3 128kbps, 256kbps
3. Transcode to Opus 96kbps
4. Store all variants in Blob
5. Serve optimal format

### Download Analytics

Track:
- Most played audio markers
- Average listen duration
- Geographic distribution of listeners
- Device types
- Peak listening times

### Audio Waveform Generation

Generate waveform images:
1. Extract waveform data during upload
2. Generate SVG or PNG visualization
3. Store in Blob
4. Display in audio player UI

### Progressive Web App (PWA)

- Offline audio caching with Service Workers
- Background sync for queue management
- Add to home screen
- Push notifications for new audio

### Audio Processing

- Normalize volume across all files
- Apply compression/limiting
- Add intro/outro fade
- Noise reduction for ambient recordings

## Troubleshooting

### Audio Not Playing

1. Check browser console for network errors
2. Verify Blob URL is accessible (test in browser)
3. Check audio format compatibility (Safari requires MP3/M4A)
4. Verify range request headers in DevTools

### Migration Fails

1. Check /public/audio directory exists
2. Verify BLOB_READ_WRITE_TOKEN is set
3. Check Vercel Blob storage quota
4. Review migration endpoint logs in Vercel dashboard

### Slow Streaming

1. Check user's connection speed
2. Verify CDN cache hit rate (Vercel Analytics)
3. Check audio file size (should be <10MB for 5min)
4. Test from different geographic regions

### Metadata Missing

1. Verify KV storage is enabled
2. Check KV_REST_API_URL and KV_REST_API_TOKEN
3. Re-run migration to populate metadata
4. Check KV dashboard for stored keys

## Additional Resources

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [HTTP Range Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)
- [OpenAPI Specification](./api-schema.yaml)
