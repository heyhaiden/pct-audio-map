/**
 * Audio Metadata Service
 * Extracts and manages audio file metadata with production-grade validation
 * Uses existing audio-markers.ts as the source of truth for metadata
 */

import { audioMarkers } from '@/data/audio-markers'
import type { AudioBlobMetadata, SupportedAudioType } from './types'
import { AUDIO_EXTENSION_MAP } from './types'

/**
 * Get audio metadata by ID from the audio-markers data source
 *
 * @param id - Audio marker ID
 * @returns Audio blob metadata or null if not found
 */
export function getAudioMetadataById(id: string): AudioBlobMetadata | null {
  const marker = audioMarkers.find((m) => m.id === id)

  if (!marker) {
    return null
  }

  const extension = getFileExtension(marker.audioUrl)
  const mimeType = getMimeTypeFromExtension(extension)

  return {
    id: marker.id,
    name: marker.name,
    coordinates: marker.coordinates,
    elevation: marker.elevation,
    chapter: marker.chapter,
    featured: marker.featured,
    mimeType,
    uploadedAt: new Date().toISOString(),
    originalFilename: marker.audioUrl.split('/').pop() || `${id}${extension}`,
    // These will be populated when uploaded to Vercel Blob
    duration: undefined,
    bitrate: undefined,
    fileSize: undefined,
  }
}

/**
 * Get all audio metadata from audio-markers
 *
 * @returns Array of audio blob metadata
 */
export function getAllAudioMetadata(): AudioBlobMetadata[] {
  return audioMarkers.map((marker) => {
    const extension = getFileExtension(marker.audioUrl)
    const mimeType = getMimeTypeFromExtension(extension)

    return {
      id: marker.id,
      name: marker.name,
      coordinates: marker.coordinates,
      elevation: marker.elevation,
      chapter: marker.chapter,
      featured: marker.featured,
      mimeType,
      uploadedAt: new Date().toISOString(),
      originalFilename: marker.audioUrl.split('/').pop() || `${marker.id}${extension}`,
      duration: undefined,
      bitrate: undefined,
      fileSize: undefined,
    }
  })
}

/**
 * Extract file extension from URL or filename
 *
 * @param filename - File name or URL
 * @returns File extension with dot (e.g., '.mp3')
 */
function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/)
  return match ? `.${match[1].toLowerCase()}` : '.mp3'
}

/**
 * Get MIME type from file extension
 *
 * @param extension - File extension (e.g., '.mp3')
 * @returns MIME type
 */
function getMimeTypeFromExtension(extension: string): SupportedAudioType {
  return AUDIO_EXTENSION_MAP[extension] || 'audio/mpeg'
}

/**
 * Validate audio metadata completeness
 *
 * @param metadata - Audio metadata to validate
 * @returns True if all required fields are present
 */
export function validateAudioMetadata(
  metadata: Partial<AudioBlobMetadata>
): boolean {
  const required: (keyof AudioBlobMetadata)[] = [
    'id',
    'name',
    'coordinates',
    'elevation',
    'chapter',
    'mimeType',
  ]

  return required.every((field) => {
    const value = metadata[field]
    if (Array.isArray(value)) {
      return value.length === 2 && !value.some(isNaN)
    }
    return value !== undefined && value !== null && value !== ''
  })
}

/**
 * Validate coordinates are within valid ranges
 *
 * @param coordinates - [longitude, latitude]
 * @returns True if coordinates are valid
 */
export function validateCoordinates(coordinates: [number, number]): boolean {
  const [lng, lat] = coordinates
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
}

/**
 * Create complete audio blob metadata
 *
 * @param params - Metadata parameters
 * @returns Complete AudioBlobMetadata object
 */
export function createAudioBlobMetadata(params: {
  id: string
  name: string
  coordinates: [number, number]
  elevation: number
  chapter: string
  featured: boolean
  mimeType: SupportedAudioType
  originalFilename: string
  duration?: number
  bitrate?: number
  fileSize?: number
  url?: string
}): AudioBlobMetadata {
  return {
    id: params.id,
    name: params.name,
    coordinates: params.coordinates,
    elevation: params.elevation,
    chapter: params.chapter,
    featured: params.featured,
    mimeType: params.mimeType,
    originalFilename: params.originalFilename,
    uploadedAt: new Date().toISOString(),
    duration: params.duration,
    bitrate: params.bitrate,
    fileSize: params.fileSize,
    url: params.url,
  }
}

/**
 * Calculate estimated streaming bandwidth
 *
 * @param bitrate - Audio bitrate in kbps
 * @returns Estimated bandwidth in kbps with buffer
 */
export function estimateStreamingBandwidth(bitrate: number): number {
  // Add 20% buffer for protocol overhead
  return Math.round(bitrate * 1.2)
}

/**
 * Determine optimal chunk size for streaming
 *
 * @param bitrate - Audio bitrate in kbps
 * @returns Chunk size in bytes
 */
export function getOptimalChunkSize(bitrate: number): number {
  // Stream 5 seconds worth of audio per chunk
  const secondsPerChunk = 5
  const bytesPerSecond = (bitrate * 1000) / 8 // Convert kbps to bytes per second
  return Math.round(bytesPerSecond * secondsPerChunk)
}

/**
 * Format file size for display
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Format duration for display
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "3:45")
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
