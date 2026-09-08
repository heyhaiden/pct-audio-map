import { resolveAudioUrl } from "@/lib/resolve-audio-url"

const prefetched = new Set<string>()

/**
 * Warm metadata for a neighbor recording without starting playback.
 * Safe to call repeatedly — each resolved URL is prefetched once per session.
 */
export function prefetchAudio(audioPath: string): void {
  if (typeof window === "undefined") return

  const url = resolveAudioUrl(audioPath)
  if (!url || prefetched.has(url)) return

  prefetched.add(url)

  const audio = new Audio()
  audio.preload = "auto"
  audio.src = url
}
