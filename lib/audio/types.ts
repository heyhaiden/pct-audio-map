/**
 * TypeScript interfaces and types for audio streaming system
 * Supports Vercel Blob storage with CDN optimization and range requests
 */

/**
 * Audio blob metadata stored in Vercel Blob
 */
export interface AudioBlobMetadata {
  /** Unique identifier matching AudioMarker.id */
  id: string
  /** Display name of the audio recording */
  name: string
  /** Geographic coordinates [longitude, latitude] */
  coordinates: [number, number]
  /** Elevation in feet */
  elevation: number
  /** PCT chapter/segment this audio belongs to */
  chapter: string
  /** Whether this is a featured recording */
  featured: boolean
  /** Audio duration in seconds */
  duration?: number
  /** Audio bitrate in kbps */
  bitrate?: number
  /** Audio file size in bytes */
  fileSize?: number
  /** MIME type (e.g., 'audio/mpeg', 'audio/wav') */
  mimeType: string
  /** Upload timestamp ISO 8601 */
  uploadedAt: string
  /** Original filename */
  originalFilename: string
  /** Vercel Blob CDN URL */
  url?: string
}

/**
 * Response from audio streaming endpoint
 */
export interface AudioStreamResponse {
  /** CDN-optimized URL for direct streaming */
  url: string
  /** Audio metadata */
  metadata: AudioBlobMetadata
  /** Cache control headers suggestion */
  cacheControl: string
  /** Whether the URL supports range requests */
  supportsRangeRequests: boolean
}

/**
 * Response from audio metadata endpoint
 */
export interface AudioMetadataResponse {
  /** Audio metadata */
  metadata: AudioBlobMetadata
  /** Whether the audio file exists in blob storage */
  exists: boolean
}

/**
 * Response from audio list endpoint
 */
export interface AudioListResponse {
  /** Array of all audio files with metadata */
  audio: AudioBlobMetadata[]
  /** Total count of audio files */
  total: number
  /** Whether the list is paginated (for future expansion) */
  paginated: false
}

/**
 * Audio upload request data
 */
export interface AudioUploadRequest {
  /** Unique identifier for this audio */
  id: string
  /** File buffer or stream */
  file: Buffer | Blob
  /** Metadata to associate with the blob */
  metadata: Omit<AudioBlobMetadata, 'uploadedAt' | 'fileSize' | 'url'>
}

/**
 * Audio upload response
 */
export interface AudioUploadResponse {
  /** Success status */
  success: boolean
  /** Blob URL */
  url: string
  /** Uploaded metadata */
  metadata: AudioBlobMetadata
  /** Error message if failed */
  error?: string
}

/**
 * HTTP Range request header parsed data
 */
export interface RangeRequest {
  /** Start byte position */
  start: number
  /** End byte position (undefined means to end of file) */
  end?: number
  /** Total file size */
  total?: number
  /** Original range header string */
  rawHeader: string
}

/**
 * Error response structure
 */
export interface AudioErrorResponse {
  /** Error message */
  error: string
  /** HTTP status code */
  status: number
  /** Error code for client handling */
  code: ErrorCode
  /** Additional error details */
  details?: string
  /** Request ID for debugging */
  requestId?: string
}

/**
 * Error codes for audio operations
 */
export type ErrorCode =
  | 'AUDIO_NOT_FOUND'
  | 'INVALID_RANGE'
  | 'STREAM_ERROR'
  | 'METADATA_NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'AUTH_REQUIRED'
  | 'FILE_TOO_LARGE'
  | 'UPLOAD_ERROR'
  | 'BLOB_STORAGE_ERROR'
  | 'INVALID_REQUEST'
  | 'RATE_LIMIT_EXCEEDED'

/**
 * Cache configuration for audio files
 */
export interface CacheConfig {
  /** Max age in seconds (default: 31536000 = 1 year) */
  maxAge: number
  /** Whether content is immutable */
  immutable: boolean
  /** Stale-while-revalidate window in seconds */
  staleWhileRevalidate?: number
}

/**
 * Default cache configuration for audio streaming
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxAge: 31536000, // 1 year
  immutable: true,
  staleWhileRevalidate: 86400, // 24 hours
}

/**
 * Supported audio MIME types
 */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg', // MP3
  'audio/mp4', // M4A
  'audio/wav', // WAV
  'audio/webm', // WebM
  'audio/ogg', // OGG
  'audio/flac', // FLAC
] as const

export type SupportedAudioType = (typeof SUPPORTED_AUDIO_TYPES)[number]

/**
 * Audio file extension to MIME type mapping
 */
export const AUDIO_EXTENSION_MAP: Record<string, SupportedAudioType> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
}

/**
 * Stream options for audio delivery
 */
export interface StreamOptions {
  /** Range request parameters */
  range?: {
    start: number
    end?: number
  }
  /** Force CDN redirect instead of proxying */
  forceCDN?: boolean
}

/**
 * Migration result for bulk uploads
 */
export interface MigrationResult {
  /** Number of successfully migrated files */
  migrated: number
  /** Array of failed uploads with error details */
  failed: Array<{
    file: string
    error: string
  }>
  /** Mapping of old paths to new Blob URLs */
  urls: Record<string, string>
}
