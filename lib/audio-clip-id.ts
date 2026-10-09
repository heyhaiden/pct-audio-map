const STEM = /([^/]+)\.(mp3|opus|m4a|aac|wav|aiff?|flac)(?:\?.*)?$/i

export function clipIdFromAudioUrl(audioUrl: string): string | null {
  if (!audioUrl) return null
  const path = audioUrl.split("?")[0]
  const match = path.match(STEM)
  return match?.[1] ?? null
}
