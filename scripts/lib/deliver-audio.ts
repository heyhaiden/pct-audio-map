import { spawnSync } from "node:child_process"
import { basename, extname } from "node:path"

/** Delivery format for field recordings served from Vercel Blob. */
export const DELIVERY_EXT = ".mp3"
export const DELIVERY_BITRATE = "128k"

const TRANSCODE_EXTS = new Set([".wav", ".aiff", ".aif", ".flac"])

export function needsTranscode(filename: string): boolean {
  return TRANSCODE_EXTS.has(extname(filename).toLowerCase())
}

/** Blob object name: uncompressed sources become `.mp3`, already-lossy files keep their name. */
export function deliveryBasename(filename: string): string {
  const base = basename(filename)
  const ext = extname(base).toLowerCase()
  if (TRANSCODE_EXTS.has(ext)) {
    return `${base.slice(0, -ext.length)}${DELIVERY_EXT}`
  }
  return base
}

export function blobPathname(filename: string): string {
  return `audio/${deliveryBasename(filename)}`
}

export function publicAudioUrl(filename: string): string {
  return `/audio/${deliveryBasename(filename)}`
}

/** Original Blob pathname to delete after a transcoded upload, if it differs. */
export function sourceBlobPathname(filename: string): string | null {
  const base = basename(filename)
  const delivered = deliveryBasename(filename)
  if (base === delivered) return null
  return `audio/${base}`
}

export function probeDurationSeconds(filePath: string): number | null {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8" },
  )
  if (result.status !== 0) return null
  const seconds = Number.parseFloat(result.stdout.trim())
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  return Math.round(seconds)
}

export function transcodeToMp3(inputPath: string, outputPath: string): void {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputPath,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      DELIVERY_BITRATE,
      "-ar",
      "44100",
      "-vn",
      outputPath,
    ],
    { encoding: "utf8" },
  )
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `ffmpeg failed for ${inputPath}`)
  }
}
