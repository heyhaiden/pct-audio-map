export type MapPrefetchPolicy = {
  warmFullRoute: boolean
  trailheadSamples: number
  windowAheadMiles: number
  windowSamples: number
}

export function getMapPrefetchPolicy(reducedGpu: boolean): MapPrefetchPolicy {
  return reducedGpu
    ? {
        warmFullRoute: false,
        trailheadSamples: 4,
        windowAheadMiles: 24,
        windowSamples: 3,
      }
    : {
        warmFullRoute: true,
        trailheadSamples: 10,
        windowAheadMiles: 45,
        windowSamples: 8,
      }
}

export function isFatalMapboxError(event: any, mapLoaded: boolean): boolean {
  if (mapLoaded) return false

  const error = event?.error ?? event
  const status = Number(error?.status)
  const message = String(error?.message ?? "")
  const sourceId = String(event?.sourceId ?? "")

  // Per-source / per-tile misses are recoverable. Treating them as fatal tears
  // the map down while preloadOnly is still in flight and surfaces as
  // undefined tileZoom / projection / style.get crashes.
  if (sourceId || /failed to load (tile|source)|tile not found/i.test(message)) {
    return false
  }

  if (/tileZoom|reading ['"]get['"]/i.test(message)) return false

  if (status === 401 || status === 403 || status === 404) return true

  return /access token|unauthorized|forbidden|style.+(?:load|parse|invalid|not found)/i.test(message)
}

/**
 * Mapbox clears `style` / transform during `remove()`. Calling `jumpTo` with
 * `preloadOnly` against a dead map throws inside `_preloadTiles`
 * (`tileZoom` / `projection` / style `get`).
 */
export function isMapAlive(map: any): boolean {
  return !!map && !map._removed && !!map.style
}

function getSourceCaches(map: any): any[] {
  const style = map?.style
  if (!style) return []
  if (typeof style.getSourceCaches === "function") {
    const caches = style.getSourceCaches()
    if (Array.isArray(caches)) return caches
    if (caches && typeof caches === "object") return Object.values(caches)
  }
  const dict = style.sourceCaches ?? style._sourceCaches
  return dict && typeof dict === "object" ? Object.values(dict) : []
}

/**
 * Mapbox `jumpTo({ preloadOnly: true })` reads `transform.tileZoom` on each
 * source cache, not just the camera. `addSource` / `setTerrain` create caches
 * whose transform is assigned on the next style update — calling preloadOnly
 * before that throws `Cannot read properties of undefined (reading 'tileZoom')`.
 * Unloaded sources retry `_preloadTiles` on a later `data` event, outside our
 * try/catch, so the caches must already have transforms before the first call.
 */
export function isMapReadyForPreload(map: any): boolean {
  if (!isMapAlive(map) || map.transform?.tileZoom == null) return false
  const caches = getSourceCaches(map)
  if (caches.length === 0) return false
  return caches.every((cache) => cache?.transform?.tileZoom != null)
}
