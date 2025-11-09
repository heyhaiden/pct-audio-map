# Audio Backend Services

This directory contains the backend infrastructure for audio storage, streaming, and metadata management using Vercel Blob.

## Overview

The audio backend is built on three core principles:
1. **CDN-First Strategy**: Direct redirects to Vercel Blob CDN URLs for optimal performance
2. **Range Request Support**: Native HTTP 206 partial content for mobile audio streaming
3. **Type Safety**: Full TypeScript coverage with no `any` types

## Architecture

```
lib/audio/
├── types.ts              # TypeScript interfaces and type definitions
├── blob-service.ts       # Vercel Blob storage operations
├── metadata-service.ts   # Audio metadata management
└── README.md            # This file

app/api/audio/
├── [id]/route.ts                  # GET /api/audio/:id - Stream audio
├── metadata/[id]/route.ts         # GET /api/audio/metadata/:id - Get metadata
└── list/route.ts                  # GET /api/audio/list - List all audio
```

## Installation

Install the required dependencies:

```bash
pnpm add @vercel/blob
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required for audio streaming
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here

# Required for map display
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

Get your Vercel Blob token at: https://vercel.com/dashboard/stores

## API Endpoints

### 1. Stream Audio - `GET /api/audio/[id]`

Stream an audio file with CDN optimization and range request support.

**Request:**
```bash
curl -H "Range: bytes=0-1023" https://your-domain.com/api/audio/desert-wind
```

**Response:**
- `307 Temporary Redirect` to Vercel Blob CDN URL
- Supports HTTP range requests (206 Partial Content)
- Cache headers: `max-age=31536000, immutable`

**Headers:**
- `Range: bytes=START-END` (optional) - Request specific byte range
- `Accept: audio/*` (optional) - Preferred audio format

**Error Codes:**
- `400` - Invalid audio ID
- `404` - Audio not found
- `500` - Streaming error

### 2. Get Metadata - `GET /api/audio/metadata/[id]`

Retrieve audio metadata without downloading the file.

**Request:**
```bash
curl https://your-domain.com/api/audio/metadata/desert-wind
```

**Response:**
```json
{
  "metadata": {
    "id": "desert-wind",
    "name": "Desert Wind at Sunrise",
    "coordinates": [-116.52, 32.68],
    "elevation": 3200,
    "chapter": "southern-california",
    "featured": true,
    "mimeType": "audio/mpeg",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "originalFilename": "desert-wind.mp3",
    "url": "https://blob.vercel-storage.com/...",
    "fileSize": 2457600,
    "duration": 180,
    "bitrate": 128
  },
  "exists": true
}
```

**Cache:** 1 hour (`max-age=3600`)

### 3. List Audio - `GET /api/audio/list`

List all available audio files with optional filtering.

**Request:**
```bash
# List all audio
curl https://your-domain.com/api/audio/list

# Filter by chapter
curl https://your-domain.com/api/audio/list?chapter=sierra-nevada

# Filter featured only
curl https://your-domain.com/api/audio/list?featured=true

# Limit results
curl https://your-domain.com/api/audio/list?limit=5
```

**Query Parameters:**
- `chapter` (string) - Filter by chapter ID (e.g., 'sierra-nevada')
- `featured` (boolean) - Filter by featured status ('true'/'false')
- `limit` (number) - Maximum number of results

**Response:**
```json
{
  "audio": [
    {
      "id": "desert-wind",
      "name": "Desert Wind at Sunrise",
      "coordinates": [-116.52, 32.68],
      "elevation": 3200,
      "chapter": "southern-california",
      "featured": true,
      "mimeType": "audio/mpeg",
      "uploadedAt": "2024-01-15T10:30:00.000Z",
      "originalFilename": "desert-wind.mp3",
      "url": "https://blob.vercel-storage.com/...",
      "fileSize": 2457600
    }
  ],
  "total": 15,
  "paginated": false
}
```

**Cache:** 5 minutes (`max-age=300`)

## Service Layer Functions

### blob-service.ts

**Core Functions:**

- `uploadAudioBlob(id, buffer, contentType)` - Upload audio to Vercel Blob
- `getAudioBlobById(id)` - Retrieve blob info with CDN URL
- `deleteAudioBlob(url)` - Delete audio from storage
- `listAudioBlobs()` - List all audio blobs
- `parseRangeHeader(header, fileSize)` - Parse HTTP range requests

**Utility Functions:**

- `getAudioCacheHeaders(etag)` - Generate cache control headers
- `getContentType(format)` - Get MIME type for audio format
- `isValidAudioFormat(filename)` - Validate audio file extension

### metadata-service.ts

**Core Functions:**

- `getAudioMetadataById(id)` - Get metadata for single audio file
- `getAllAudioMetadata()` - Get metadata for all audio files
- `validateAudioMetadata(metadata)` - Validate metadata structure
- `validateCoordinates(coordinates)` - Validate geographic coordinates
- `createAudioBlobMetadata(params)` - Create complete metadata object

**Utility Functions:**

- `estimateStreamingBandwidth(bitrate)` - Calculate bandwidth requirements
- `getOptimalChunkSize(bitrate)` - Determine optimal streaming chunk size
- `formatFileSize(bytes)` - Format file size for display
- `formatDuration(seconds)` - Format duration for display

## Type Definitions

### AudioBlobMetadata

Complete audio file metadata:

```typescript
interface AudioBlobMetadata {
  id: string                     // Unique identifier
  name: string                   // Display name
  coordinates: [number, number]  // [longitude, latitude]
  elevation: number              // Elevation in feet
  chapter: string                // PCT chapter/segment
  featured: boolean              // Featured recording
  mimeType: string               // MIME type
  uploadedAt: string             // ISO 8601 timestamp
  originalFilename: string       // Original filename
  url?: string                   // Vercel Blob URL
  fileSize?: number              // Size in bytes
  duration?: number              // Duration in seconds
  bitrate?: number               // Bitrate in kbps
}
```

### Error Response

Standardized error format:

```typescript
interface AudioErrorResponse {
  error: string          // Human-readable error message
  status: number         // HTTP status code
  code: ErrorCode        // Machine-readable error code
  details?: string       // Additional error details
  requestId?: string     // Unique request ID for debugging
}
```

## Streaming Strategy

The backend uses a **CDN redirect strategy** for optimal performance:

1. Client requests audio: `GET /api/audio/[id]`
2. API validates request and checks blob storage
3. API returns `307 Temporary Redirect` to Vercel Blob CDN URL
4. Client streams directly from CDN (supports range requests)

**Benefits:**
- Zero proxy overhead
- Native range request support
- CDN edge caching
- Lower server costs
- Better mobile performance

## Caching Strategy

Different cache policies for different endpoints:

| Endpoint | Cache Duration | Rationale |
|----------|----------------|-----------|
| `/api/audio/[id]` | 1 year, immutable | Audio files never change |
| `/api/audio/metadata/[id]` | 1 hour | Metadata rarely changes |
| `/api/audio/list` | 5 minutes | List may change with uploads |

All endpoints include `stale-while-revalidate` for better UX.

## Error Handling

All endpoints return standardized error responses:

```typescript
{
  "error": "Audio file not found: invalid-id",
  "status": 404,
  "code": "AUDIO_NOT_FOUND",
  "details": "Check audio ID and try again",
  "requestId": "uuid-v4"
}
```

**Error Codes:**
- `AUDIO_NOT_FOUND` - Audio file doesn't exist
- `INVALID_RANGE` - Invalid range request
- `STREAM_ERROR` - Streaming failure
- `METADATA_NOT_FOUND` - Metadata not found
- `INVALID_FORMAT` - Invalid audio format
- `BLOB_STORAGE_ERROR` - Vercel Blob error
- `INVALID_REQUEST` - Invalid request parameters

## Performance Optimization

### Mobile Optimization

- **Range Requests**: Support partial content (HTTP 206) for mobile streaming
- **CDN Redirect**: Direct streaming from CDN edges
- **Aggressive Caching**: 1-year cache for audio files
- **Parallel Enrichment**: Batch blob info retrieval in list endpoint

### Server Optimization

- **Zero Proxy**: Redirect to CDN instead of proxying audio
- **Minimal Processing**: Validate and redirect only
- **Efficient Queries**: Single list call for batch operations
- **Error Resilience**: Graceful fallbacks for blob storage failures

## Security Considerations

1. **Token Security**: Never expose `BLOB_READ_WRITE_TOKEN` to client
2. **Input Validation**: All IDs validated before blob operations
3. **Rate Limiting**: Consider adding rate limiting in production
4. **CORS Headers**: Configured for audio streaming compatibility
5. **Token Rotation**: Rotate Vercel Blob tokens every 90 days

## Integration with Existing Code

The backend integrates seamlessly with existing audio-markers:

```typescript
// In your components
import { getAudioMetadataById } from '@/lib/audio/metadata-service'

const metadata = getAudioMetadataById('desert-wind')
if (metadata) {
  // Use metadata to display audio marker
  const audioUrl = `/api/audio/${metadata.id}`
}
```

## Future Enhancements

Potential improvements for Phase 3+:

1. **Upload API**: POST endpoint for uploading new audio files
2. **Transcoding**: Automatic conversion to optimal formats
3. **Waveform Generation**: Generate waveform data for visualizations
4. **Analytics**: Track playback statistics
5. **Rate Limiting**: Redis-based rate limiting with Vercel KV
6. **CDN Purging**: Programmatic cache invalidation

## Testing

Test the endpoints locally:

```bash
# Start dev server
pnpm dev

# Test streaming endpoint
curl -v http://localhost:3000/api/audio/desert-wind

# Test metadata endpoint
curl http://localhost:3000/api/audio/metadata/desert-wind | jq

# Test list endpoint
curl http://localhost:3000/api/audio/list | jq

# Test range request
curl -H "Range: bytes=0-1023" http://localhost:3000/api/audio/desert-wind
```

## Deployment

1. Add environment variables in Vercel dashboard
2. Deploy with `git push` (auto-deploys via Vercel)
3. Verify endpoints at your production URL
4. Monitor Vercel Blob usage in dashboard

## Support

For issues or questions:
- Check logs in Vercel dashboard
- Verify environment variables are set
- Ensure `@vercel/blob` package is installed
- Review error codes and request IDs in responses
