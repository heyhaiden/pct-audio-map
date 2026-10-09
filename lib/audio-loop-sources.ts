import { clipIdFromAudioUrl } from "@/lib/audio-clip-id"

export interface LoopSources {
  clipId: string
  opusUrl: string
  mp3Url: string
}

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
    opusUrl: `/audio/opus/${clipId}.opus`,
    mp3Url: blobBase ? `${blobBase}${mp3Path}` : mp3Path,
  }
}
