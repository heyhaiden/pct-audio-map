/**
 * Audio Metadata Storage Service
 * Uses Vercel KV (Redis) for fast metadata access
 * Alternative: Vercel Postgres for relational queries
 */

import { kv } from '@vercel/kv'
import type { AudioMetadata, AudioListResponse } from './types'

/**
 * Storage keys
 */
const KEYS = {
  // Individual audio metadata: audio:metadata:{id}
  metadata: (id: string) => `audio:metadata:${id}`,
  // Index of all audio IDs: audio:index
  index: 'audio:index',
  // Chapter index: audio:chapter:{chapter}
  chapterIndex: (chapter: string) => `audio:chapter:${chapter}`,
  // Featured audio index: audio:featured
  featuredIndex: 'audio:featured',
}

/**
 * Store audio metadata in KV
 *
 * @param metadata - Audio metadata to store
 */
export async function storeAudioMetadata(metadata: AudioMetadata): Promise<void> {
  try {
    // Store metadata
    await kv.set(KEYS.metadata(metadata.id), metadata)

    // Add to global index
    await kv.sadd(KEYS.index, metadata.id)

    // Add to chapter index
    await kv.sadd(KEYS.chapterIndex(metadata.chapter), metadata.id)

    // Add to featured index if applicable
    if (metadata.featured) {
      await kv.sadd(KEYS.featuredIndex, metadata.id)
    }
  } catch (error) {
    console.error(`Failed to store metadata for ${metadata.id}:`, error)
    throw new Error(`Metadata storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Retrieve audio metadata by ID
 *
 * @param id - Audio marker ID
 * @returns Audio metadata or null if not found
 */
export async function getAudioMetadata(id: string): Promise<AudioMetadata | null> {
  try {
    const metadata = await kv.get<AudioMetadata>(KEYS.metadata(id))
    return metadata
  } catch (error) {
    console.error(`Failed to retrieve metadata for ${id}:`, error)
    return null
  }
}

/**
 * Update audio metadata
 *
 * @param id - Audio marker ID
 * @param updates - Partial metadata updates
 */
export async function updateAudioMetadata(
  id: string,
  updates: Partial<AudioMetadata>
): Promise<AudioMetadata | null> {
  try {
    const existing = await getAudioMetadata(id)
    if (!existing) return null

    // Handle chapter change
    if (updates.chapter && updates.chapter !== existing.chapter) {
      // Remove from old chapter index
      await kv.srem(KEYS.chapterIndex(existing.chapter), id)
      // Add to new chapter index
      await kv.sadd(KEYS.chapterIndex(updates.chapter), id)
    }

    // Handle featured flag change
    if (updates.featured !== undefined && updates.featured !== existing.featured) {
      if (updates.featured) {
        await kv.sadd(KEYS.featuredIndex, id)
      } else {
        await kv.srem(KEYS.featuredIndex, id)
      }
    }

    const updated = { ...existing, ...updates }
    await kv.set(KEYS.metadata(id), updated)

    return updated
  } catch (error) {
    console.error(`Failed to update metadata for ${id}:`, error)
    throw new Error(`Metadata update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete audio metadata
 *
 * @param id - Audio marker ID
 */
export async function deleteAudioMetadata(id: string): Promise<void> {
  try {
    const metadata = await getAudioMetadata(id)
    if (!metadata) return

    // Remove from all indexes
    await kv.del(KEYS.metadata(id))
    await kv.srem(KEYS.index, id)
    await kv.srem(KEYS.chapterIndex(metadata.chapter), id)
    if (metadata.featured) {
      await kv.srem(KEYS.featuredIndex, id)
    }
  } catch (error) {
    console.error(`Failed to delete metadata for ${id}:`, error)
    throw new Error(`Metadata deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * List all audio markers with optional filters
 *
 * @param options - Filter options
 * @returns List of audio markers
 */
export async function listAudioMarkers(options?: {
  chapter?: string
  featured?: boolean
}): Promise<AudioListResponse> {
  try {
    let ids: string[]

    if (options?.chapter) {
      // Get IDs from chapter index
      ids = await kv.smembers(KEYS.chapterIndex(options.chapter)) as string[]
    } else if (options?.featured) {
      // Get IDs from featured index
      ids = await kv.smembers(KEYS.featuredIndex) as string[]
    } else {
      // Get all IDs from global index
      ids = await kv.smembers(KEYS.index) as string[]
    }

    // Fetch all metadata in parallel
    const metadataPromises = ids.map(id => getAudioMetadata(id))
    const metadataResults = await Promise.all(metadataPromises)

    // Filter out null results
    const markers = metadataResults.filter((m): m is AudioMetadata => m !== null)

    // Apply featured filter if both chapter and featured are specified
    const filtered = options?.featured && options?.chapter
      ? markers.filter(m => m.featured)
      : markers

    return {
      markers: filtered,
      total: filtered.length,
    }
  } catch (error) {
    console.error('Failed to list audio markers:', error)
    throw new Error(`Audio listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get all chapter IDs with audio markers
 *
 * @returns Array of chapter IDs
 */
export async function getChaptersWithAudio(): Promise<string[]> {
  try {
    const allIds = await kv.smembers(KEYS.index) as string[]
    const metadataPromises = allIds.map(id => getAudioMetadata(id))
    const metadata = await Promise.all(metadataPromises)

    const chapters = new Set(
      metadata.filter((m): m is AudioMetadata => m !== null).map(m => m.chapter)
    )

    return Array.from(chapters)
  } catch (error) {
    console.error('Failed to get chapters:', error)
    return []
  }
}

/**
 * Bulk import metadata (for migration)
 *
 * @param metadataList - Array of metadata to import
 */
export async function bulkImportMetadata(metadataList: AudioMetadata[]): Promise<void> {
  try {
    // Store all metadata in parallel
    await Promise.all(metadataList.map(metadata => storeAudioMetadata(metadata)))
  } catch (error) {
    console.error('Failed to bulk import metadata:', error)
    throw new Error(`Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Clear all audio metadata (use with caution!)
 */
export async function clearAllMetadata(): Promise<void> {
  try {
    const ids = await kv.smembers(KEYS.index) as string[]
    const deletePromises = ids.map(id => deleteAudioMetadata(id))
    await Promise.all(deletePromises)
  } catch (error) {
    console.error('Failed to clear metadata:', error)
    throw new Error(`Clear operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
