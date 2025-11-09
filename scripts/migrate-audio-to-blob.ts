#!/usr/bin/env ts-node
/**
 * Migration Script: Upload Audio Files to Vercel Blob
 *
 * This script uploads all audio files from /public/audio/ to Vercel Blob storage
 * and updates the audio-markers.ts file with the new Blob URLs.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-audio-to-blob.ts
 *
 * Prerequisites:
 *   1. BLOB_READ_WRITE_TOKEN set in .env.local
 *   2. Audio files exist in /public/audio/
 *   3. pnpm install @vercel/blob (already installed)
 */

import { put, list } from '@vercel/blob'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { audioMarkers } from '../data/audio-markers'

// Configuration
const AUDIO_DIR = join(process.cwd(), 'public', 'audio')
const DATA_FILE = join(process.cwd(), 'data', 'audio-markers.ts')
const BATCH_SIZE = 5 // Upload 5 files concurrently

interface UploadResult {
  id: string
  localPath: string
  blobUrl: string
  size: number
  success: boolean
  error?: string
}

/**
 * Check if Vercel Blob token is configured
 */
function checkBlobToken(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token || token === 'your_vercel_blob_token_here') {
    console.error('❌ Error: BLOB_READ_WRITE_TOKEN not configured')
    console.error('   Please set it in .env.local')
    console.error('   Get token from: https://vercel.com/dashboard/stores')
    return false
  }
  return true
}

/**
 * Check if audio files exist
 */
function checkAudioFiles(): string[] {
  if (!existsSync(AUDIO_DIR)) {
    console.error(`❌ Error: Audio directory not found: ${AUDIO_DIR}`)
    return []
  }

  const files = readdirSync(AUDIO_DIR).filter(f =>
    f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.wav')
  )

  if (files.length === 0) {
    console.error(`❌ Error: No audio files found in ${AUDIO_DIR}`)
    return []
  }

  return files
}

/**
 * Upload a single audio file to Vercel Blob
 */
async function uploadAudioFile(filename: string): Promise<UploadResult> {
  const localPath = join(AUDIO_DIR, filename)
  const markerId = filename.replace(/\.(mp3|m4a|wav)$/, '')

  try {
    console.log(`   ↑ Uploading ${filename}...`)

    // Read file
    const fileBuffer = readFileSync(localPath)
    const size = fileBuffer.length

    // Upload to Vercel Blob with metadata
    const blob = await put(`audio/${filename}`, fileBuffer, {
      access: 'public',
      addRandomSuffix: false, // Keep original filename
      contentType: filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4',
    })

    console.log(`   ✓ Uploaded ${filename} (${(size / 1024 / 1024).toFixed(2)} MB)`)
    console.log(`     URL: ${blob.url}`)

    return {
      id: markerId,
      localPath: `/audio/${filename}`,
      blobUrl: blob.url,
      size,
      success: true,
    }
  } catch (error) {
    console.error(`   ✗ Failed to upload ${filename}:`, error)
    return {
      id: markerId,
      localPath: `/audio/${filename}`,
      blobUrl: '',
      size: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Upload files in batches
 */
async function uploadAllFiles(files: string[]): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  console.log(`\n📤 Uploading ${files.length} audio files to Vercel Blob...\n`)

  // Upload in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)
    console.log(`\n🔄 Batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(files.length / BATCH_SIZE)}`)

    const batchResults = await Promise.all(
      batch.map(file => uploadAudioFile(file))
    )

    results.push(...batchResults)
  }

  return results
}

/**
 * Update audio-markers.ts with new Blob URLs
 */
function updateAudioMarkersFile(results: UploadResult[]): void {
  console.log('\n📝 Updating audio-markers.ts...')

  // Create a map of audioUrl to blobUrl
  const urlMap = new Map(
    results
      .filter(r => r.success)
      .map(r => [r.localPath, r.blobUrl])
  )

  // Read the current file
  let fileContent = readFileSync(DATA_FILE, 'utf-8')

  // Replace URLs
  let replacementCount = 0
  urlMap.forEach((blobUrl, localPath) => {
    const regex = new RegExp(`audioUrl: "${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')
    if (fileContent.match(regex)) {
      fileContent = fileContent.replace(regex, `audioUrl: "${blobUrl}"`)
      replacementCount++
    }
  })

  // Write back to file
  writeFileSync(DATA_FILE, fileContent, 'utf-8')

  console.log(`✓ Updated ${replacementCount} audio URLs in audio-markers.ts`)
}

/**
 * Print summary
 */
function printSummary(results: UploadResult[]): void {
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const totalSize = successful.reduce((sum, r) => sum + r.size, 0)

  console.log('\n' + '='.repeat(60))
  console.log('📊 MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`✓ Successful uploads: ${successful.length}`)
  console.log(`✗ Failed uploads: ${failed.length}`)
  console.log(`📦 Total size uploaded: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)

  if (failed.length > 0) {
    console.log('\n❌ Failed uploads:')
    failed.forEach(r => {
      console.log(`   - ${r.localPath}: ${r.error}`)
    })
  }

  console.log('\n✅ Next steps:')
  console.log('   1. Verify uploads in Vercel dashboard')
  console.log('   2. Test audio playback: pnpm dev')
  console.log('   3. Commit updated audio-markers.ts')
  console.log('   4. Deploy to Vercel')
  console.log('='.repeat(60) + '\n')
}

/**
 * Main migration function
 */
async function main() {
  console.log('🎵 PCT Audio Map - Blob Migration Script')
  console.log('=========================================\n')

  // Step 1: Check prerequisites
  console.log('🔍 Checking prerequisites...')

  if (!checkBlobToken()) {
    process.exit(1)
  }
  console.log('   ✓ BLOB_READ_WRITE_TOKEN configured')

  const audioFiles = checkAudioFiles()
  if (audioFiles.length === 0) {
    process.exit(1)
  }
  console.log(`   ✓ Found ${audioFiles.length} audio files`)

  // Step 2: Check what's already in Blob storage
  console.log('\n🔍 Checking existing Blob storage...')
  try {
    const { blobs } = await list({ prefix: 'audio/' })
    if (blobs.length > 0) {
      console.log(`   ⚠️  Found ${blobs.length} existing files in Blob storage`)
      console.log('   This script will overwrite them if filenames match.')
    } else {
      console.log('   ✓ Blob storage is empty')
    }
  } catch (error) {
    console.warn('   ⚠️  Could not check existing blobs:', error)
  }

  // Step 3: Confirm migration
  console.log('\n❓ Ready to upload audio files to Vercel Blob?')
  console.log('   This will update audio-markers.ts with new URLs.')
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')

  await new Promise(resolve => setTimeout(resolve, 5000))

  // Step 4: Upload files
  const results = await uploadAllFiles(audioFiles)

  // Step 5: Update audio-markers.ts
  const successCount = results.filter(r => r.success).length
  if (successCount > 0) {
    updateAudioMarkersFile(results)
  }

  // Step 6: Print summary
  printSummary(results)

  // Exit with error code if any uploads failed
  const failedCount = results.filter(r => !r.success).length
  process.exit(failedCount > 0 ? 1 : 0)
}

// Run migration
main().catch(error => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
