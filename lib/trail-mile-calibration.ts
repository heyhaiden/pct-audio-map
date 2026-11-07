import { PCT_TOTAL_MILES } from "./railing-camera.ts"

/**
 * `public/pct-trail.geojson` is shorter/straighter in places than the official
 * PCT mileage, so "fraction of line length × 2,650" drifts by up to ~40 miles.
 * These anchors pin geometry miles (that naive proportional reading) to real
 * trail miles from field QA; between anchors we interpolate linearly.
 *
 * Both camera paths sample the line through `geoFractionForTrailMile`, which
 * makes scroll progress × PCT_TOTAL_MILES read as real trail miles everywhere
 * (chapter cards, WIP edge, resume, stats) without touching those callers.
 *
 * [geometry mile, trail mile]
 */
const ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [97, 105], // San Ysidro Creek
  [276, 298], // Deep Creek Bridge
  [712, 752], // Chicken Spring Lake
  [1110, 1142], // Palisades Ski Resort
  [1777, 1786], // Christi's Spring, Sky Lakes Wilderness
  [PCT_TOTAL_MILES, PCT_TOTAL_MILES],
]

function interpolate(value: number, fromIdx: 0 | 1, toIdx: 0 | 1): number {
  if (value <= 0) return 0
  if (value >= PCT_TOTAL_MILES) return PCT_TOTAL_MILES
  for (let i = 1; i < ANCHORS.length; i++) {
    const a = ANCHORS[i - 1]
    const b = ANCHORS[i]
    if (value <= b[fromIdx]) {
      const t = (value - a[fromIdx]) / (b[fromIdx] - a[fromIdx])
      return a[toIdx] + t * (b[toIdx] - a[toIdx])
    }
  }
  return PCT_TOTAL_MILES
}

/** Naive geometry mile → real trail mile. */
export function trailMileForGeoMile(geoMile: number): number {
  return interpolate(geoMile, 0, 1)
}

/** Real trail mile → fraction (0–1) of the geojson line's length. */
export function geoFractionForTrailMile(trailMile: number): number {
  return interpolate(trailMile, 1, 0) / PCT_TOTAL_MILES
}
