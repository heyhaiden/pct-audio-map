# API Examples

Practical examples for using the PCT Audio API.

## Public API (No Authentication Required)

### Stream Audio File

**Basic Streaming**
```bash
curl -L "https://your-app.vercel.app/api/audio/stream/mt-whitney" \
  --output mt-whitney.mp3
```

**Range Request (Seek to 30 seconds)**
```bash
# Assuming 128kbps MP3: 30s * 128kbps / 8 = ~480KB = 491520 bytes
curl "https://your-app.vercel.app/api/audio/stream/mt-whitney" \
  -H "Range: bytes=491520-" \
  --output mt-whitney-30s.mp3
```

**Check Headers (Metadata only)**
```bash
curl -I "https://your-app.vercel.app/api/audio/stream/mt-whitney"

# Expected response:
# HTTP/2 307
# Location: https://xxxxx.public.blob.vercel-storage.com/audio/mt-whitney-xyz.mp3
# Cache-Control: public, max-age=31536000, immutable
# Accept-Ranges: bytes
# Content-Type: audio/mpeg
```

**JavaScript/TypeScript Client**
```typescript
// Simple fetch
const response = await fetch('/api/audio/stream/mt-whitney')
const blob = await response.blob()
const url = URL.createObjectURL(blob)
audio.src = url

// With range request for seeking
const response = await fetch('/api/audio/stream/mt-whitney', {
  headers: {
    'Range': 'bytes=0-1048575'  // First 1MB
  }
})
```

**React Hook**
```typescript
import { useState, useEffect } from 'react'

function useAudioStream(audioId: string | null) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null)

  useEffect(() => {
    if (audioId) {
      setStreamUrl(`/api/audio/stream/${audioId}`)
    } else {
      setStreamUrl(null)
    }
  }, [audioId])

  return streamUrl
}

// Usage
function AudioPlayer({ markerId }: { markerId: string }) {
  const streamUrl = useAudioStream(markerId)
  return <audio src={streamUrl || undefined} controls />
}
```

### Get Audio Metadata

**Basic Request**
```bash
curl "https://your-app.vercel.app/api/audio/metadata/mt-whitney" | jq '.'
```

**Response**
```json
{
  "id": "mt-whitney",
  "name": "Mt. Whitney Summit",
  "url": "https://xxxxx.public.blob.vercel-storage.com/audio/mt-whitney-xyz.mp3",
  "duration": 180,
  "size": 2880000,
  "format": "mp3",
  "bitrate": 128,
  "coordinates": [-118.292, 36.578],
  "elevation": 14505,
  "chapter": "sierra-nevada",
  "featured": true,
  "uploadedAt": "2025-01-15T10:00:00.000Z",
  "contentType": "audio/mpeg"
}
```

**JavaScript Client**
```typescript
async function getAudioMetadata(audioId: string) {
  const response = await fetch(`/api/audio/metadata/${audioId}`)
  if (!response.ok) {
    throw new Error(`Metadata not found: ${response.status}`)
  }
  return await response.json()
}

// Usage
const metadata = await getAudioMetadata('mt-whitney')
console.log(`Duration: ${metadata.duration}s, Size: ${metadata.size} bytes`)
```

**React Hook with SWR**
```typescript
import useSWR from 'swr'

function useAudioMetadata(audioId: string | null) {
  const { data, error, isLoading } = useSWR(
    audioId ? `/api/audio/metadata/${audioId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,  // Cache for 1 minute
    }
  )

  return {
    metadata: data,
    isLoading,
    error
  }
}

// Usage
function AudioInfo({ markerId }: { markerId: string }) {
  const { metadata, isLoading, error } = useAudioMetadata(markerId)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h3>{metadata.name}</h3>
      <p>Duration: {Math.floor(metadata.duration / 60)}:{metadata.duration % 60}</p>
      <p>Size: {(metadata.size / 1024 / 1024).toFixed(2)} MB</p>
    </div>
  )
}
```

### List All Audio Markers

**Get All Markers**
```bash
curl "https://your-app.vercel.app/api/audio/list" | jq '.'
```

**Filter by Chapter**
```bash
curl "https://your-app.vercel.app/api/audio/list?chapter=sierra-nevada" | jq '.markers[].name'
```

**Get Only Featured Markers**
```bash
curl "https://your-app.vercel.app/api/audio/list?featured=true" | jq '.markers[].name'
```

**Combined Filters**
```bash
curl "https://your-app.vercel.app/api/audio/list?chapter=sierra-nevada&featured=true" | jq '.'
```

**Response**
```json
{
  "markers": [
    {
      "id": "mt-whitney",
      "name": "Mt. Whitney Summit",
      "url": "https://xxxxx.public.blob.vercel-storage.com/audio/mt-whitney-xyz.mp3",
      "duration": 180,
      "size": 2880000,
      "format": "mp3",
      "bitrate": 128,
      "coordinates": [-118.292, 36.578],
      "elevation": 14505,
      "chapter": "sierra-nevada",
      "featured": true,
      "uploadedAt": "2025-01-15T10:00:00.000Z",
      "contentType": "audio/mpeg"
    }
  ],
  "total": 1
}
```

**JavaScript Client**
```typescript
interface ListOptions {
  chapter?: string
  featured?: boolean
}

async function listAudioMarkers(options: ListOptions = {}) {
  const params = new URLSearchParams()
  if (options.chapter) params.set('chapter', options.chapter)
  if (options.featured !== undefined) params.set('featured', String(options.featured))

  const response = await fetch(`/api/audio/list?${params}`)
  return await response.json()
}

// Usage
const all = await listAudioMarkers()
const sierraNevada = await listAudioMarkers({ chapter: 'sierra-nevada' })
const featured = await listAudioMarkers({ featured: true })
```

## Admin API (Authentication Required)

### Upload Audio File

**cURL Example**
```bash
curl -X POST "https://your-app.vercel.app/api/admin/audio/upload" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@mt-whitney.mp3" \
  -F "name=Mt. Whitney Summit" \
  -F "coordinates=[-118.292, 36.578]" \
  -F "elevation=14505" \
  -F "chapter=sierra-nevada" \
  -F "featured=true" \
  | jq '.'
```

**Response (201 Created)**
```json
{
  "id": "mt-whitney-summit",
  "url": "https://xxxxx.public.blob.vercel-storage.com/audio/mt-whitney-summit-xyz.mp3",
  "metadata": {
    "id": "mt-whitney-summit",
    "name": "Mt. Whitney Summit",
    "url": "https://xxxxx.public.blob.vercel-storage.com/audio/mt-whitney-summit-xyz.mp3",
    "duration": 180,
    "size": 2880000,
    "format": "mp3",
    "bitrate": 128,
    "coordinates": [-118.292, 36.578],
    "elevation": 14505,
    "chapter": "sierra-nevada",
    "featured": true,
    "uploadedAt": "2025-01-15T10:00:00.000Z",
    "contentType": "audio/mpeg"
  }
}
```

**JavaScript Client**
```typescript
async function uploadAudio(
  file: File,
  metadata: {
    name: string
    coordinates: [number, number]
    elevation: number
    chapter: string
    featured?: boolean
  },
  adminToken: string
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', metadata.name)
  formData.append('coordinates', JSON.stringify(metadata.coordinates))
  formData.append('elevation', String(metadata.elevation))
  formData.append('chapter', metadata.chapter)
  if (metadata.featured) {
    formData.append('featured', 'true')
  }

  const response = await fetch('/api/admin/audio/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
}

// Usage
const file = document.querySelector('input[type="file"]').files[0]
const result = await uploadAudio(
  file,
  {
    name: 'Mt. Whitney Summit',
    coordinates: [-118.292, 36.578],
    elevation: 14505,
    chapter: 'sierra-nevada',
    featured: true,
  },
  'your_admin_token'
)
console.log('Uploaded:', result.url)
```

**React Component**
```typescript
function AudioUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadAudio(
        file,
        {
          name: 'Test Audio',
          coordinates: [-120.0, 38.0],
          elevation: 8000,
          chapter: 'sierra-nevada',
          featured: false,
        },
        process.env.NEXT_PUBLIC_ADMIN_TOKEN!
      )
      alert(`Uploaded: ${result.url}`)
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  )
}
```

### Migrate Existing Files

**cURL Example**
```bash
curl -X POST "https://your-app.vercel.app/api/admin/audio/migrate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

**Response**
```json
{
  "migrated": 15,
  "failed": [],
  "urls": {
    "/audio/mt-whitney.mp3": "https://xxxxx.public.blob.vercel-storage.com/audio/mt-whitney-xyz.mp3",
    "/audio/tuolumne.mp3": "https://xxxxx.public.blob.vercel-storage.com/audio/tuolumne-xyz.mp3"
  }
}
```

**JavaScript Client**
```typescript
async function migrateAudio(adminToken: string) {
  const response = await fetch('/api/admin/audio/migrate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
}

// Usage
const result = await migrateAudio('your_admin_token')
console.log(`Migrated ${result.migrated} files`)
if (result.failed.length > 0) {
  console.error('Failed:', result.failed)
}
```

### Update Audio Metadata

**cURL Example**
```bash
curl -X PUT "https://your-app.vercel.app/api/admin/audio/mt-whitney/metadata" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mt. Whitney Summit - Updated",
    "featured": true
  }' \
  | jq '.'
```

**Response**
```json
{
  "id": "mt-whitney",
  "metadata": {
    "id": "mt-whitney",
    "name": "Mt. Whitney Summit - Updated",
    "featured": true,
    // ... rest of metadata
  }
}
```

**JavaScript Client**
```typescript
async function updateAudioMetadata(
  audioId: string,
  updates: Partial<{
    name: string
    coordinates: [number, number]
    elevation: number
    chapter: string
    featured: boolean
  }>,
  adminToken: string
) {
  const response = await fetch(`/api/admin/audio/${audioId}/metadata`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
}

// Usage
await updateAudioMetadata(
  'mt-whitney',
  { name: 'Mt. Whitney Summit - Updated', featured: true },
  'your_admin_token'
)
```

### Delete Audio

**cURL Example**
```bash
curl -X DELETE "https://your-app.vercel.app/api/admin/audio/mt-whitney" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: 204 No Content (empty response)
```

**JavaScript Client**
```typescript
async function deleteAudio(audioId: string, adminToken: string) {
  const response = await fetch(`/api/admin/audio/${audioId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  // 204 No Content - success
}

// Usage
await deleteAudio('mt-whitney', 'your_admin_token')
console.log('Audio deleted')
```

## Error Handling

**Common Errors**

```typescript
async function fetchWithErrorHandling(url: string) {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()

      switch (error.code) {
        case 'AUDIO_NOT_FOUND':
          console.error('Audio file not found')
          break
        case 'INVALID_RANGE':
          console.error('Range request invalid')
          break
        case 'AUTH_REQUIRED':
          console.error('Authentication required')
          break
        case 'FILE_TOO_LARGE':
          console.error('File exceeds 50MB limit')
          break
        default:
          console.error('Unknown error:', error.error)
      }

      throw new Error(error.error)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Network error:', error)
    }
    throw error
  }
}
```

## Advanced Usage

### Preload Audio for Instant Playback

```typescript
function preloadAudio(audioIds: string[]) {
  audioIds.forEach(id => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'fetch'
    link.href = `/api/audio/stream/${id}`
    document.head.appendChild(link)
  })
}

// Preload featured markers
preloadAudio(['mt-whitney', 'forester-pass'])
```

### Progressive Loading with Range Requests

```typescript
async function loadAudioProgressively(
  audioId: string,
  chunkSize: number = 1024 * 1024  // 1MB chunks
) {
  const metadata = await getAudioMetadata(audioId)
  const chunks: ArrayBuffer[] = []

  for (let start = 0; start < metadata.size; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, metadata.size - 1)

    const response = await fetch(`/api/audio/stream/${audioId}`, {
      headers: { 'Range': `bytes=${start}-${end}` }
    })

    chunks.push(await response.arrayBuffer())
    console.log(`Loaded ${Math.round((end / metadata.size) * 100)}%`)
  }

  // Combine chunks
  const blob = new Blob(chunks, { type: metadata.contentType })
  return URL.createObjectURL(blob)
}
```

### Batch Metadata Fetching

```typescript
async function fetchAudioMetadataBatch(audioIds: string[]) {
  const promises = audioIds.map(id =>
    fetch(`/api/audio/metadata/${id}`).then(r => r.json())
  )
  return await Promise.all(promises)
}

// Usage
const metadata = await fetchAudioMetadataBatch([
  'mt-whitney',
  'forester-pass',
  'muir-pass'
])
```
