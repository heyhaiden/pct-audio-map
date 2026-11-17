/**
 * Hold the intro on the aerial overview until the terrain under the landing
 * view has loaded, so the fly-down never lands on flat ground.
 *
 * Only the elevation (DEM) tiles gate the hold. Low-detail satellite imagery
 * fills in quickly behind the flight; flat terrain is what reads as broken.
 */

/** Never fly sooner than this: the overview needs a beat to register. */
export const INTRO_HOLD_MIN_MS = 500
/** Never hold longer than this, however slow the network. */
export const INTRO_HOLD_MAX_MS = 8000
/** Show the "descending" caption only once the hold is visibly a wait. */
export const INTRO_HOLD_CAPTION_DELAY_MS = 700

export type LandingTerrainResult = "loaded" | "timeout" | "unsupported" | "cancelled"

/** Starts loading the landing tiles; calls `done` once they have all settled. */
export type LandingTerrainPreload = (done: () => void) => void

export type IntroTerrainHold = {
  promise: Promise<LandingTerrainResult>
  cancel: () => void
}

/**
 * Resolve when `preload` reports done, but no sooner than `minMs` and no later
 * than `maxMs`. A null `preload` (unsupported map build) waits `minMs` only.
 * `onSlow` fires once if the hold is still running after `slowAfterMs`.
 */
export function holdForLandingTerrain(options: {
  preload: LandingTerrainPreload | null
  minMs?: number
  maxMs?: number
  slowAfterMs?: number
  onSlow?: () => void
}): IntroTerrainHold {
  const minMs = options.minMs ?? INTRO_HOLD_MIN_MS
  const maxMs = Math.max(minMs, options.maxMs ?? INTRO_HOLD_MAX_MS)
  const slowAfterMs = options.slowAfterMs ?? INTRO_HOLD_CAPTION_DELAY_MS

  let settle: (result: LandingTerrainResult) => void = () => {}
  const timers: ReturnType<typeof setTimeout>[] = []
  let finished = false
  let minElapsed = false
  let loaded = false

  const promise = new Promise<LandingTerrainResult>((resolve) => {
    settle = (result) => {
      if (finished) return
      finished = true
      for (const t of timers) clearTimeout(t)
      resolve(result)
    }
  })

  timers.push(
    setTimeout(() => {
      minElapsed = true
      if (loaded) settle("loaded")
      else if (!options.preload) settle("unsupported")
    }, minMs),
  )
  timers.push(setTimeout(() => settle("timeout"), maxMs))
  if (options.onSlow && slowAfterMs < maxMs) {
    timers.push(
      setTimeout(() => {
        if (!finished) options.onSlow?.()
      }, slowAfterMs),
    )
  }

  if (options.preload) {
    try {
      options.preload(() => {
        loaded = true
        if (minElapsed) settle("loaded")
      })
    } catch {
      // A failed preload must never strand the intro; the max timer still fires.
    }
  }

  return { promise, cancel: () => settle("cancelled") }
}

export type LandingCamera = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

/**
 * Load one source's tiles for a camera the map isn't at yet, with a callback
 * when they settle. Public `jumpTo({ preloadOnly: true })` loads the same tiles
 * but never says when it's finished, so this calls the source cache directly.
 * Returns null when this Mapbox build doesn't expose what it needs; callers
 * then fall back to the public preload and the minimum hold.
 */
export function preloadSourceForCamera(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reaches into Mapbox internals, feature-detected
  map: any,
  sourceId: string,
  camera: LandingCamera,
  makeLngLat: (lng: number, lat: number) => unknown,
): LandingTerrainPreload | null {
  const caches = map?.style?.getSourceCaches?.(sourceId)
  const transform = map?.transform
  if (!Array.isArray(caches) || caches.length === 0) return null
  if (!caches.every((c) => typeof c?._preloadTiles === "function")) return null
  if (typeof transform?.clone !== "function") return null

  return (done) => {
    const tr = transform.clone()
    tr.zoom = camera.zoom
    tr.center = makeLngLat(camera.center[0], camera.center[1])
    tr.bearing = camera.bearing
    tr.pitch = camera.pitch
    let pending = caches.length
    for (const cache of caches) {
      cache._preloadTiles(tr, () => {
        pending -= 1
        if (pending === 0) done()
      })
    }
  }
}
