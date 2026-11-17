import {
  CAMERA_PATH_POINTS,
  PCT_TOTAL_MILES,
  type CameraPathPoint,
} from "./railing-camera.ts"
import { geoFractionForTrailMile } from "./trail-mile-calibration.ts"

/**
 * Builds the railing camera path: `CAMERA_PATH_POINTS + 1` samples along the
 * trail, each with a look-ahead bearing and a smoothed bearing.
 *
 * The geodesic math below reproduces Turf's `distance`, `bearing`,
 * `destination` and `along` formulas so the path is the same one Turf produced.
 * The difference is cost: Turf's `along` walks the line from its first vertex
 * on every call, and this path needs about a thousand samples of a 12,657-point
 * line. Here the cumulative distances are summed once and each sample is a
 * binary search.
 */

const EARTH_RADIUS_KM = 6371.0088
const BEARING_LOOK_AHEAD_KM = 16
const BEARING_SMOOTHING_WINDOW = 8

type Position = readonly number[]

const toRadians = (degrees: number) => ((degrees % 360) * Math.PI) / 180
const toDegrees = (radians: number) => ((radians % (2 * Math.PI)) * 180) / Math.PI

/** Haversine distance in kilometers. */
export function distanceKm(from: Position, to: Position): number {
  const dLat = toRadians(to[1] - from[1])
  const dLon = toRadians(to[0] - from[0])
  const lat1 = toRadians(from[1])
  const lat2 = toRadians(to[1])
  const a =
    Math.pow(Math.sin(dLat / 2), 2) +
    Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2)
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * EARTH_RADIUS_KM
}

/** Initial great-circle bearing in degrees, -180 to 180. */
export function bearingDegrees(from: Position, to: Position): number {
  const lon1 = toRadians(from[0])
  const lon2 = toRadians(to[0])
  const lat1 = toRadians(from[1])
  const lat2 = toRadians(to[1])
  const a = Math.sin(lon2 - lon1) * Math.cos(lat2)
  const b =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  return toDegrees(Math.atan2(a, b))
}

function destination(origin: Position, km: number, bearing: number): [number, number] {
  const lon1 = toRadians(origin[0])
  const lat1 = toRadians(origin[1])
  const bearingRad = toRadians(bearing)
  const radians = km / EARTH_RADIUS_KM
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(radians) + Math.cos(lat1) * Math.sin(radians) * Math.cos(bearingRad),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(radians) * Math.cos(lat1),
      Math.cos(radians) - Math.sin(lat1) * Math.sin(lat2),
    )
  return [toDegrees(lon2), toDegrees(lat2)]
}

export interface LineMeasure {
  /** Point at a distance along the line, clamped to its last vertex. */
  along: (km: number) => [number, number]
  totalKm: number
}

/** Sums the line's segment lengths once so every `along` is a binary search. */
export function measureLine(coordinates: readonly Position[]): LineMeasure {
  const cumulative = new Float64Array(coordinates.length)
  for (let i = 1; i < coordinates.length; i++) {
    cumulative[i] = cumulative[i - 1] + distanceKm(coordinates[i - 1], coordinates[i])
  }
  const last = coordinates.length - 1
  const totalKm = cumulative[last] ?? 0

  const along = (km: number): [number, number] => {
    if (last < 0) return [0, 0]
    // First vertex at or beyond the target distance.
    let low = 0
    let high = last
    while (low < high) {
      const mid = (low + high) >> 1
      if (cumulative[mid] >= km) high = mid
      else low = mid + 1
    }
    const vertex = coordinates[low]
    const overshoot = km - cumulative[low]
    if (overshoot >= 0 || low === 0) return [vertex[0], vertex[1]]
    // Step back from that vertex along the segment that led to it.
    return destination(vertex, overshoot, bearingDegrees(vertex, coordinates[low - 1]) - 180)
  }

  return { along, totalKm }
}

export function buildCameraPath(trailCoordinates: readonly Position[]): CameraPathPoint[] {
  if (trailCoordinates.length < 2) return []

  const line = measureLine(trailCoordinates)
  const points: CameraPathPoint[] = []

  for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
    const distance =
      geoFractionForTrailMile((i / CAMERA_PATH_POINTS) * PCT_TOTAL_MILES) * line.totalKm
    const point = line.along(distance)
    const nextPoint = line.along(Math.min(distance + BEARING_LOOK_AHEAD_KM, line.totalKm))
    const pointBearing = bearingDegrees(point, nextPoint)

    points.push({
      lng: point[0],
      lat: point[1],
      bearing: pointBearing,
      smoothedBearing: pointBearing,
    })
  }

  for (let i = 0; i < points.length; i++) {
    let sumX = 0
    let sumY = 0
    let count = 0
    const from = Math.max(0, i - BEARING_SMOOTHING_WINDOW)
    const to = Math.min(points.length - 1, i + BEARING_SMOOTHING_WINDOW)

    for (let j = from; j <= to; j++) {
      const rad = (points[j].bearing * Math.PI) / 180
      sumX += Math.cos(rad)
      sumY += Math.sin(rad)
      count++
    }

    const avgBearing = (Math.atan2(sumY / count, sumX / count) * 180) / Math.PI
    points[i].smoothedBearing = (avgBearing + 360) % 360
  }

  return points
}
