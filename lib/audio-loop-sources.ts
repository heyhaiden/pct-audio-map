import { clipIdFromAudioUrl } from "@/lib/audio-clip-id"

export interface LoopSources {
  clipId: string
  opusUrl: string
  mp3Url: string
}

/**
 * Bump when clips are replaced under the same name. Opus is served
 * immutable for a year and Blob MP3s are cached the same way, so without
 * this, returning visitors keep the old files.
 */
export const AUDIO_VERSION = "2"

export function resolveLoopSources(
  audioUrl: string,
  options: { blobBase?: string } = {},
): LoopSources | null {
  const clipId = clipIdFromAudioUrl(audioUrl)
  if (!clipId) return null

  const blobBase = options.blobBase?.replace(/\/$/, "")
  const mp3Path = `/audio/${clipId}.mp3`

  return {
    clipId,
    opusUrl: `/audio/opus/${clipId}.opus?v=${AUDIO_VERSION}`,
    mp3Url: `${blobBase ? `${blobBase}${mp3Path}` : mp3Path}?v=${AUDIO_VERSION}`,
  }
}
