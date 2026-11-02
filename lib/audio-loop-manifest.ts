export interface NormalizedClip {
  sampleCount: number
  /** Linear per-clip boost from manifest playbackGainDb, capped at maxGainDb. */
  playbackGain?: number
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

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function normalizeClip(raw: unknown): NormalizedClip | null {
  if (!isRecord(raw)) return null

  const sampleCount = asNonNegativeInt(raw.sampleCount) ?? asNonNegativeInt(raw.samples)
  if (!sampleCount) return null

  const mp3Delay = asNonNegativeInt(raw.mp3Delay) ?? asNonNegativeInt(raw.encoderDelay)
  const mp3Padding = asNonNegativeInt(raw.mp3Padding) ?? asNonNegativeInt(raw.padding)

  const clip: NormalizedClip = { sampleCount }
  const gainDb = asFiniteNumber(raw.playbackGainDb)
  if (gainDb !== undefined) {
    // maxGainDb keeps two overlapping clips 3 dB under clipping during a crossfade.
    const ceilingDb = asFiniteNumber(raw.maxGainDb)
    const appliedDb = ceilingDb === undefined ? gainDb : Math.min(gainDb, ceilingDb)
    clip.playbackGain = 10 ** (appliedDb / 20)
  }
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

/** Per-clip playback boost (linear). 1 when the manifest has no gain for the clip. */
export function clipPlaybackGain(manifest: LoopManifest | null | undefined, clipId: string): number {
  return manifest?.[clipId]?.playbackGain ?? 1
}

let sharedManifest: Promise<LoopManifest> | null = null

/** Cached fetch of /audio/manifest.json for players that don't own a loop engine. */
export function fetchLoopManifest(url = "/audio/manifest.json"): Promise<LoopManifest> {
  sharedManifest ??= fetch(url)
    .then(async (response) => (response.ok ? normalizeManifest(await response.json()) : {}))
    .catch(() => ({}))
  return sharedManifest
}
