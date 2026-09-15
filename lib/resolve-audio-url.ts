/**
 * Resolve a marker's stable audio path (e.g. `/audio/campo.mp3`) to a playable URL.
 * When NEXT_PUBLIC_AUDIO_CDN_URL is set, prefixes the Vercel Blob public store.
 * Otherwise returns the path for same-origin / public/audio fallbacks in dev.
 */
export function resolveAudioUrl(audioPath: string): string {
  if (!audioPath) return ""

  if (/^https?:\/\//i.test(audioPath)) {
    return audioPath
  }

  const normalized = audioPath.startsWith("/") ? audioPath : `/${audioPath}`
  const base = process.env.NEXT_PUBLIC_AUDIO_CDN_URL?.replace(/\/$/, "")

  if (!base) {
    return normalized
  }

  return `${base}${normalized}`
}
