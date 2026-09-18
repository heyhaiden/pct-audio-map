import { resolveAudioUrl } from "@/lib/resolve-audio-url"

const prefetched = new Set<string>()

const FULL_FILE_PREFETCH = /\.(wav|aiff?|flac)(\?|$)/i

/**
 * Warm a neighbor recording's container header without starting playback.
 * Uncompressed sources are skipped — `preload="auto"` used to download whole WAVs.
 * Safe to call repeatedly — each resolved URL is prefetched once per session.
 */
export function prefetchAudio(audioPath: string): void {
  if (typeof window === "undefined") return

  const url = resolveAudioUrl(audioPath)
  if (!url || prefetched.has(url) || FULL_FILE_PREFETCH.test(url)) return

  prefetched.add(url)

  const audio = new Audio()
  audio.preload = "metadata"
  audio.src = url
}
