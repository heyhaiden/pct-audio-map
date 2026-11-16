/**
 * Pure helpers behind the `map_ready_ms` and `first_sound_ms` PostHog events.
 * All times are on the `performance.now()` timeline (ms since the document's
 * time origin), which is also the time base of DOM `event.timeStamp`.
 */

/** Where the clip's audio came from when a play request started. */
export type ClipCacheState = "decoded" | "compressed" | "inflight" | "network"

/** Best cache tier wins: a decoded buffer needs no fetch and no decode. */
export function resolveClipCacheState(options: {
  decoded: boolean
  compressed: boolean
  inflight: boolean
}): ClipCacheState {
  if (options.decoded) return "decoded"
  if (options.compressed) return "compressed"
  if (options.inflight) return "inflight"
  return "network"
}

export type NavigationKind = "hard" | "soft"

/**
 * Start of the map-ready clock. A document that loaded on the homepage starts
 * at its time origin. A client-side route change into the homepage (or a second
 * mount in the same document) starts when the page mounted, because the time
 * origin belongs to an earlier page.
 */
export function resolveMapReadyStart(options: {
  /** Pathname the document was loaded on, or null when unknown. */
  documentPath: string | null
  firstMountInDocument: boolean
  mountedAtMs: number
}): { startMs: number; navigation: NavigationKind } {
  if (options.documentPath === "/" && options.firstMountInDocument) {
    return { startMs: 0, navigation: "hard" }
  }
  return { startMs: options.mountedAtMs, navigation: "soft" }
}

/** Whole milliseconds between two timestamps, or null if the pair is unusable. */
export function elapsedMs(startMs: number, endMs: number): number | null {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null
  const elapsed = endMs - startMs
  if (elapsed < 0) return null
  return Math.round(elapsed)
}

/** Same split the map uses for its reduced-GPU profile. */
export function perfDeviceType(coarseOrNarrow: boolean): "mobile" | "desktop" {
  return coarseOrNarrow ? "mobile" : "desktop"
}

export interface PendingSound<Meta> {
  clipId: string
  tapAtMs: number
  meta: Meta
}

/**
 * Pairs a marker tap with the engine's next `playing` event. Only the latest
 * tap is kept: a newer tap supersedes an older one, exactly as the engine's
 * generation token drops the older play request.
 */
export function createFirstSoundTracker<Meta>() {
  let pending: PendingSound<Meta> | null = null

  return {
    begin(next: PendingSound<Meta>) {
      pending = next
    },
    clear() {
      pending = null
    },
    /** Returns the measurement once, when the playing clip matches the tap. */
    resolve(clipId: string, nowMs: number): { firstSoundMs: number; meta: Meta } | null {
      const current = pending
      if (!current || current.clipId !== clipId) return null
      pending = null
      const firstSoundMs = elapsedMs(current.tapAtMs, nowMs)
      if (firstSoundMs == null) return null
      return { firstSoundMs, meta: current.meta }
    },
  }
}
