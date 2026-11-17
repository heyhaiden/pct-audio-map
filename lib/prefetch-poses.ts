import { buildCameraPath } from "./camera-path.ts"
import {
  PCT_TOTAL_MILES,
  computeRailingPose,
  offsetLngLat,
  type CameraPathPoint,
  type FreeCameraPose,
} from "./railing-camera.ts"

/**
 * Pure pose math behind `lib/tile-prefetch.ts`: which camera poses to warm and
 * what `jumpTo({ preloadOnly })` target each one becomes. No Mapbox, no DOM.
 */

/** Warm style + terrain out to early Oregon; content ends there for now. */
export const PREFETCH_END_MILES = 1800

/**
 * The prefetch normally borrows the scroll rail's path. If that isn't built
 * yet, build the same path here with the same single-pass builder — it used to
 * rebuild with Turf's `along` per sample, a 2 s task on a throttled phone.
 */
export function prefetchCameraPath(trailCoordinates: number[][]): CameraPathPoint[] | null {
  try {
    const path = buildCameraPath(trailCoordinates)
    return path.length > 0 ? path : null
  } catch {
    // Background warm — a malformed line means no prefetch, not a crash.
    return null
  }
}

export function posesAlongMiles(
  path: CameraPathPoint[],
  startMiles: number,
  endMiles: number,
  count: number,
): FreeCameraPose[] {
  const poses: FreeCameraPose[] = []
  const start = Math.max(0, startMiles) / PCT_TOTAL_MILES
  const end = Math.min(PREFETCH_END_MILES, endMiles) / PCT_TOTAL_MILES
  if (end <= start) return poses

  for (let i = 0; i < count; i++) {
    const progress = start + ((end - start) * i) / Math.max(1, count - 1)
    poses.push(computeRailingPose(path, progress))
  }
  return poses
}

/** Rough FreeCamera-altitude → standard-zoom mapping, good enough for tile coverage. */
function approxZoomForAltitude(altitudeMeters: number): number {
  if (altitudeMeters > 40000) return 8
  if (altitudeMeters > 25000) return 10
  if (altitudeMeters > 12000) return 11
  return 12
}

/**
 * computeRailingPose() returns the camera's own position, offset backward/above
 * the ground point it's actually looking at (see railing-camera.ts's
 * computeRailingPose — same offsetLngLat call, reversed here). easeTo's `center`
 * means "ground point under view," so preloading needs this, not the raw pose.
 */
function lookAtGroundPoint(pose: FreeCameraPose): [number, number] {
  const groundOffsetKm = (pose.altitude * Math.tan((pose.pitch * Math.PI) / 180)) / 1000
  return offsetLngLat(pose.lng, pose.lat, groundOffsetKm, pose.bearing)
}

export type PreloadTarget = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

/** The standard-camera view that covers the same tiles as a railing pose. */
export function preloadTargetForPose(
  pose: FreeCameraPose,
  overrides?: { zoom?: number; pitch?: number; bearing?: number },
): PreloadTarget {
  return {
    center: lookAtGroundPoint(pose),
    zoom: overrides?.zoom ?? approxZoomForAltitude(pose.altitude),
    pitch: overrides?.pitch ?? pose.pitch,
    bearing: overrides?.bearing ?? pose.bearing,
  }
}
