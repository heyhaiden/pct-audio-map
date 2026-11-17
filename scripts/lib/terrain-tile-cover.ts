import { measureLine } from "../../lib/camera-path.ts"
import { PCT_TOTAL_MILES } from "../../lib/railing-camera.ts"
import { geoFractionForTrailMile } from "../../lib/trail-mile-calibration.ts"

/**
 * Which web-mercator tiles cover a band around the trail. Pure math: the
 * script in `scripts/terrain-tiles.ts` does the listing and downloading.
 */

export type TileId = { z: number; x: number; y: number }

const KM_PER_DEGREE_LAT = 110.574
const KM_PER_DEGREE_LNG_AT_EQUATOR = 111.32
/** Web mercator stops here; tiles beyond it don't exist. */
const MAX_MERCATOR_LAT = 85.0511

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** The tile containing a point, clamped to the world at that zoom. */
export function lngLatToTile(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom
  const boundedLat = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT)
  const latRad = (boundedLat * Math.PI) / 180
  const x = Math.floor(((lng + 180) / 360) * n)
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n)
  return { x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) }
}

/** [west, south, east, north] of a tile, in degrees. */
export function tileBounds({ z, x, y }: TileId): [number, number, number, number] {
  const n = 2 ** z
  const lng = (tileX: number) => (tileX / n) * 360 - 180
  const lat = (tileY: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n))) * 180) / Math.PI
  return [lng(x), lat(y + 1), lng(x + 1), lat(y)]
}

/** Points every `stepKm` along the trail from its start to `endMiles`. */
export function sampleTrail(
  coordinates: readonly (readonly number[])[],
  endMiles: number,
  stepKm: number,
): Array<[number, number]> {
  if (coordinates.length < 2 || stepKm <= 0) return []
  const line = measureLine(coordinates)
  const endKm = geoFractionForTrailMile(clamp(endMiles, 0, PCT_TOTAL_MILES)) * line.totalKm
  const points: Array<[number, number]> = []
  for (let km = 0; km < endKm; km += stepKm) points.push(line.along(km))
  points.push(line.along(endKm))
  return points
}

/**
 * Every tile at `zoom` that touches a square of half-width `bufferKm` around
 * any of the points. A square is a little more than a round buffer needs, and
 * never less.
 */
export function tilesAroundPoints(
  points: ReadonlyArray<readonly [number, number]>,
  zoom: number,
  bufferKm: number,
): TileId[] {
  const seen = new Set<number>()
  const tiles: TileId[] = []
  const n = 2 ** zoom

  for (const [lng, lat] of points) {
    const dLat = bufferKm / KM_PER_DEGREE_LAT
    const dLng = bufferKm / (KM_PER_DEGREE_LNG_AT_EQUATOR * Math.max(0.05, Math.cos((lat * Math.PI) / 180)))
    const topLeft = lngLatToTile(clamp(lng - dLng, -180, 179.999999), lat + dLat, zoom)
    const bottomRight = lngLatToTile(clamp(lng + dLng, -180, 179.999999), lat - dLat, zoom)

    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        const key = y * n + x
        if (seen.has(key)) continue
        seen.add(key)
        tiles.push({ z: zoom, x, y })
      }
    }
  }

  return tiles.sort((a, b) => a.x - b.x || a.y - b.y)
}

/** The full strip: one band per zoom level, widest at the shallowest zoom. */
export function terrainTileCover(
  coordinates: readonly (readonly number[])[],
  options: {
    endMiles: number
    zoomBuffersKm: ReadonlyArray<readonly [zoom: number, bufferKm: number]>
    /** Spacing of the trail samples; keep it well under the narrowest buffer. */
    stepKm?: number
  },
): TileId[] {
  const points = sampleTrail(coordinates, options.endMiles, options.stepKm ?? 2)
  return options.zoomBuffersKm.flatMap(([zoom, bufferKm]) => tilesAroundPoints(points, zoom, bufferKm))
}

export function tileUrl(template: string, { z, x, y }: TileId): string {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y))
}
