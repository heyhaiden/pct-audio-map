import { isMapAlive } from "./map-runtime-policy.ts"

/** Must match `lib/audio-marker-layer.ts` — kept local so tests don't pull Mapbox/DOM. */
export const AUDIO_MARKER_SOURCE_ID = "pct-audio-markers"
export const AUDIO_MARKER_LAYER_ID = "pct-audio-markers-pin"

/** Soft cap so a stalled Mapbox idle never traps Begin Journey. */
const OVERVIEW_SCENE_TIMEOUT_MS = 12_000

export const TRAIL_SOURCE_ID = "pct-trail"
export const TRAIL_LINE_LAYER_ID = "pct-trail-line"

/**
 * HTTP/session cache of previously warmed tiles does not mean this map
 * instance has painted. Unlock only once the aerial overview is actually ready.
 */
export function shouldUnlockSplash(options: {
  overviewSceneReady: boolean
  trailPrepCached?: boolean
}): boolean {
  return options.overviewSceneReady
}

function hasFeatures(map: any, method: string, ...args: unknown[]): boolean {
  const query = map?.[method]
  if (typeof query !== "function") return true
  try {
    const features = query.apply(map, args)
    return Array.isArray(features) && features.length > 0
  } catch {
    return false
  }
}

/**
 * Tiles and trail are painted in the aerial view. Pins must be installed, but
 * SoCal markers sit south of the pitched overview frustum — requiring them on
 * screen would stall the splash until timeout.
 */
export function isOverviewSceneReady(map: any): boolean {
  if (!isMapAlive(map)) return false
  if (!map.getSource?.(TRAIL_SOURCE_ID) || !map.getLayer?.(TRAIL_LINE_LAYER_ID)) {
    return false
  }
  if (
    !map.getSource?.(AUDIO_MARKER_SOURCE_ID) ||
    !map.getLayer?.(AUDIO_MARKER_LAYER_ID)
  ) {
    return false
  }
  if (typeof map.areTilesLoaded === "function" && !map.areTilesLoaded()) {
    return false
  }
  if (
    !hasFeatures(map, "queryRenderedFeatures", undefined, {
      layers: [TRAIL_LINE_LAYER_ID],
    })
  ) {
    return false
  }
  if (!hasFeatures(map, "querySourceFeatures", AUDIO_MARKER_SOURCE_ID)) return false
  return true
}

function waitForIdle(map: any, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (!isMapAlive(map)) {
      resolve()
      return
    }

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      map.off?.("idle", finish)
      resolve()
    }

    const timer = setTimeout(finish, timeoutMs)
    map.once?.("idle", finish)
    map.triggerRepaint?.()
  })
}

/**
 * Hold the splash gate until the aerial overview has painted. Never moves the
 * live camera — jumping to Campo (marker 1) was visible through the glass scrim.
 */
export async function waitForOverviewScene(
  map: any,
  stillWaiting: () => boolean,
  options?: {
    timeoutMs?: number
    onProgress?: (progress: number) => void
  },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? OVERVIEW_SCENE_TIMEOUT_MS
  const started = Date.now()

  while (stillWaiting() && isMapAlive(map) && Date.now() - started < timeoutMs) {
    const remaining = timeoutMs - (Date.now() - started)
    options?.onProgress?.(Math.min(0.95, (Date.now() - started) / timeoutMs))
    await waitForIdle(map, Math.min(800, Math.max(0, remaining)))
    if (!stillWaiting()) return false
    if (isOverviewSceneReady(map)) {
      options?.onProgress?.(1)
      return true
    }
  }

  const ready = isOverviewSceneReady(map)
  if (ready) options?.onProgress?.(1)
  return ready
}
