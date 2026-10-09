export interface NormalizedClip {
  sampleCount: number
  mp3Delay?: number
  mp3Padding?: number
}

export type LoopManifest = Record<string, NormalizedClip>

const DEFAULT_MP3_DELAY = 576
const DEFAULT_MP3_PADDING = 0

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asNonNegativeInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined
  return Math.floor(value)
}

function normalizeClip(raw: unknown): NormalizedClip | null {
  if (!isRecord(raw)) return null

  const sampleCount = asNonNegativeInt(raw.sampleCount) ?? asNonNegativeInt(raw.samples)
  if (!sampleCount) return null

  const mp3Delay = asNonNegativeInt(raw.mp3Delay) ?? asNonNegativeInt(raw.encoderDelay)
  const mp3Padding = asNonNegativeInt(raw.mp3Padding) ?? asNonNegativeInt(raw.padding)

  const clip: NormalizedClip = { sampleCount }
  if (mp3Delay !== undefined) clip.mp3Delay = mp3Delay
  if (mp3Padding !== undefined) clip.mp3Padding = mp3Padding
  return clip
}

export function normalizeManifest(raw: unknown): LoopManifest {
  if (!isRecord(raw)) return {}

  const source = isRecord(raw.clips) ? raw.clips : raw
  const manifest: LoopManifest = {}

  for (const [id, value] of Object.entries(source)) {
    if (id === "clips") continue
    const clip = normalizeClip(value)
    if (clip) manifest[id] = clip
  }

  return manifest
}

export function loopWindow(
  clip: NormalizedClip,
  format: "opus" | "mp3",
  sampleRate: number,
): { start: number; end: number } {
  if (!(sampleRate > 0) || !(clip.sampleCount > 0)) {
    return { start: 0, end: 0 }
  }

  const full = { start: 0, end: clip.sampleCount / sampleRate }
  if (format === "opus") return full

  const delay = clip.mp3Delay ?? DEFAULT_MP3_DELAY
  const padding = clip.mp3Padding ?? DEFAULT_MP3_PADDING
  const startSamples = delay
  const endSamples = clip.sampleCount - padding
  if (endSamples <= startSamples) return full

  return {
    start: startSamples / sampleRate,
    end: endSamples / sampleRate,
  }
}
