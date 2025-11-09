/**
 * Vercel Blob Service
 * Handles all Vercel Blob storage operations with resilience patterns
 * Supports CDN optimization, range requests, and production-grade error handling
 */

import { put, del, head, list } from '@vercel/blob'
import type {
  AudioBlobMetadata,
  StreamOptions,
  RangeRequest,
  AudioUploadRequest,
  SupportedAudioType,
  AUDIO_EXTENSION_MAP
} from './types'

/**
 * Configuration for Vercel Blob
 */
const BLOB_CONFIG = {
  token: process.env.BLOB_READ_WRITE_TOKEN!,
  // All audio files stored under /audio prefix for organization
  prefix: 'audio/',
  // Cache audio files aggressively (1 year)
  cacheControlMaxAge: 31536000,
  // Public read access via CDN
  access: 'public' as const,
  // Add content-disposition for better browser handling
  addRandomSuffix: false, // Use predictable IDs
}

/**
 * Upload audio file to Vercel Blob
 *
 * @param id - Unique audio marker ID
 * @param buffer - Audio file buffer
 * @param contentType - MIME type (audio/mpeg, audio/mp4, etc.)
 * @returns Blob URL and metadata
 */
export async function uploadAudioBlob(
  id: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; downloadUrl: string }> {
  try {
    const pathname = `${BLOB_CONFIG.prefix}${id}`

    const blob = await put(pathname, buffer, {
      access: BLOB_CONFIG.access,
      token: BLOB_CONFIG.token,
      contentType,
      cacheControlMaxAge: BLOB_CONFIG.cacheControlMaxAge,
      addRandomSuffix: BLOB_CONFIG.addRandomSuffix,
    })

    return {
      url: blob.url, // Direct Blob URL
      downloadUrl: blob.downloadUrl, // CDN URL for streaming
    }
  } catch (error) {
    console.error(`Failed to upload audio blob ${id}:`, error)
    throw new Error(`Blob upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete audio file from Vercel Blob
 *
 * @param url - Blob URL to delete
 */
export async function deleteAudioBlob(url: string): Promise<void> {
  try {
    await del(url, {
      token: BLOB_CONFIG.token,
    })
  } catch (error) {
    console.error(`Failed to delete audio blob ${url}:`, error)
    throw new Error(`Blob deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if audio blob exists
 *
 * @param url - Blob URL to check
 * @returns True if exists, false otherwise
 */
export async function audioBlobExists(url: string): Promise<boolean> {
  try {
    await head(url, {
      token: BLOB_CONFIG.token,
    })
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get blob metadata (size, content-type, etc.)
 *
 * @param url - Blob URL
 * @returns Blob metadata
 */
export async function getAudioBlobInfo(url: string) {
  try {
    const info = await head(url, {
      token: BLOB_CONFIG.token,
    })
    return info
  } catch (error) {
    console.error(`Failed to get blob info for ${url}:`, error)
    throw new Error(`Blob info retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * List all audio blobs
 *
 * @returns Array of blob URLs
 */
export async function listAudioBlobs() {
  try {
    const { blobs } = await list({
      token: BLOB_CONFIG.token,
      prefix: BLOB_CONFIG.prefix,
    })
    return blobs
  } catch (error) {
    console.error('Failed to list audio blobs:', error)
    throw new Error(`Blob listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse Range header for audio streaming
 *
 * @param rangeHeader - HTTP Range header value
 * @param fileSize - Total file size in bytes
 * @returns Parsed range request or null if invalid
 */
export function parseRangeHeader(
  rangeHeader: string | null,
  fileSize: number
): RangeRequest | null {
  if (!rangeHeader) return null

  const parts = rangeHeader.replace(/bytes=/, '').split('-')
  const start = parseInt(parts[0], 10)
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

  // Validate range
  if (isNaN(start) || isNaN(end) || start > end || start < 0 || end >= fileSize) {
    return null
  }

  return {
    start,
    end,
    total: fileSize,
    rawHeader: rangeHeader,
  }
}

/**
 * Get audio blob by ID with metadata
 *
 * @param id - Audio marker ID
 * @returns Blob info with metadata or null if not found
 */
export async function getAudioBlobById(id: string) {
  try {
    const pathname = `${BLOB_CONFIG.prefix}${id}`
    const { blobs } = await list({
      token: BLOB_CONFIG.token,
      prefix: pathname,
      limit: 1,
    })

    if (blobs.length === 0) {
      return null
    }

    const blob = blobs[0]
    const info = await head(blob.url, {
      token: BLOB_CONFIG.token,
    })

    return {
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      size: info.size,
      contentType: info.contentType || 'audio/mpeg',
      uploadedAt: blob.uploadedAt,
    }
  } catch (error) {
    console.error(`Failed to get audio blob ${id}:`, error)
    return null
  }
}

/**
 * Generate cache headers for audio streaming
 *
 * @param etag - ETag from Vercel Blob
 * @returns Cache control headers
 */
export function getAudioCacheHeaders(etag?: string) {
  return {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': etag || `"${Date.now()}"`,
    'Accept-Ranges': 'bytes',
  }
}

/**
 * Get optimal content-type for audio format
 *
 * @param format - Audio format
 * @returns MIME type
 */
export function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    flac: 'audio/flac',
  }

  return contentTypes[format.toLowerCase()] || 'audio/mpeg'
}

/**
 * Validate audio file format
 *
 * @param filename - File name
 * @returns True if valid format
 */
export function isValidAudioFormat(filename: string): boolean {
  const validExtensions = ['.mp3', '.m4a', '.ogg', '.wav', '.flac']
  return validExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Extract format from filename
 *
 * @param filename - File name
 * @returns Audio format
 */
export function extractAudioFormat(filename: string): string {
  const match = filename.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : 'mp3'
}
