import {
  CAMERA_PATH_POINTS,
  PCT_TOTAL_MILES,
  computeRailingPose,
  type CameraPathPoint,
  type FreeCameraPose,
} from "@/lib/railing-camera"
import { applyFreeCameraPose } from "@/lib/node-camera"

declare global {
  interface Window {
    turf: any
    mapboxgl: any
  }
}

/** Warm style + terrain out to early Oregon; content ends there for now. */
export const PREFETCH_END_MILES = 1700
/** Gate "Begin Journey" once this corridor is warm. */
export const TRAILHEAD_WARM_MILES = 120
/** Background Image() warm target while splash is up (no camera walking). */
export const PRIORITY_WARM_MILES = 400
const LOOKAHEAD_MILES = 100

/** Soft cap so a slow network never blocks Enter forever. */
export const TRAILHEAD_READY_TIMEOUT_MS = 12_000

/** Keep trailhead camera samples low — each pose forces a full GL idle cycle. */
const TRAILHEAD_CAMERA_SAMPLES = 10
const IMAGE_WARM_SAMPLES = 24

function buildCameraPath(trailCoordinates: number[][]): CameraPathPoint[] | null {
  if (typeof window === "undefined" || !window.turf || trailCoordinates.length < 2) return null

  try {
    const line = window.turf.lineString(trailCoordinates)
    const totalLength = window.turf.length(line, { units: "kilometers" })
    const points: CameraPathPoint[] = []

    for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
      const distance = (i / CAMERA_PATH_POINTS) * totalLength
      const point = window.turf.along(line, distance, { units: "kilometers" })
      const coords = point.geometry.coordinates
      const nextDistance = Math.min(distance + 16, totalLength)
      const nextPoint = window.turf.along(line, nextDistance, { units: "kilometers" })
      const bearing = window.turf.bearing(point, nextPoint)

      points.push({
        lng: coords[0],
        lat: coords[1],
        bearing,
        smoothedBearing: bearing,
      })
    }

    const windowSize = 8
    for (let i = 0; i < points.length; i++) {
      let sumX = 0
      let sumY = 0
      let count = 0
      for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
        const rad = (points[j].bearing * Math.PI) / 180
        sumX += Math.cos(rad)
        sumY += Math.sin(rad)
        count++
      }
      points[i].smoothedBearing = (((Math.atan2(sumY / count, sumX / count) * 180) / Math.PI) + 360) % 360
    }

    return points
  } catch {
    return null
  }
}

function posesAlongMiles(
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

function waitForIdle(map: any, timeoutMs = 450): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const timer = setTimeout(done, timeoutMs)
    map.once("idle", () => {
      clearTimeout(timer)
      done()
    })
    map.triggerRepaint()
  })
}

function demZoomForAltitude(altitudeMeters: number): number {
  if (altitudeMeters > 40000) return 8
  if (altitudeMeters > 25000) return 10
  if (altitudeMeters > 12000) return 11
  return 12
}

/** Warm raster-dem tiles in the browser cache — does not move the camera. */
function prefetchTerrainImages(poses: FreeCameraPose[], accessToken: string): void {
  if (!accessToken) return

  for (const pose of poses) {
    const zoom = demZoomForAltitude(pose.altitude)
    const { lng, lat } = pose
    const n = Math.pow(2, zoom)
    const x = Math.floor(((lng + 180) / 360) * n)
    const latRad = (lat * Math.PI) / 180
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
    )
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const img = new Image()
        img.referrerPolicy = "no-referrer"
        img.src = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${x + dx}/${y + dy}.pngraw?access_token=${accessToken}`
      }
    }
  }
}

export type PrefetchController = {
  cancel: () => void
  warmAhead: (currentMiles: number) => void
}

/**
 * Trailhead warm: short free-camera walk (style + DEM) for the first ~120 mi only.
 * Beyond that: Image() DEM only — never walk the camera up the corridor (that caused
 * first-load GPU thrash and the mid-trail flash when splash dismissed).
 */
export function startPathTilePrefetch(options: {
  map: any
  trailCoordinates: number[][]
  accessToken: string
  canMoveCamera: () => boolean
  onTrailheadWarm?: () => void
  onTrailheadProgress?: (progress: number) => void
  trailheadAlreadyCached?: boolean
}): PrefetchController {
  const {
    map,
    trailCoordinates,
    accessToken,
    canMoveCamera,
    onTrailheadWarm,
    onTrailheadProgress,
    trailheadAlreadyCached = false,
  } = options
  let cancelled = false
  let path: CameraPathPoint[] | null = null
  let warmedThroughMiles = 0
  let trailheadNotified = false

  const ensurePath = () => {
    if (!path) path = buildCameraPath(trailCoordinates)
    return path
  }

  const notifyTrailhead = () => {
    if (trailheadNotified) return
    trailheadNotified = true
    onTrailheadProgress?.(1)
    onTrailheadWarm?.()
  }

  /** Lightweight DEM Image warm — safe anytime, no camera motion. */
  const warmImages = (fromMiles: number, toMiles: number, samples: number) => {
    const camPath = ensurePath()
    if (!camPath) return
    prefetchTerrainImages(posesAlongMiles(camPath, fromMiles, toMiles, samples), accessToken)
    warmedThroughMiles = Math.max(warmedThroughMiles, toMiles)
  }

  const warmTrailheadCamera = async () => {
    const camPath = ensurePath()
    if (!camPath || cancelled || !canMoveCamera()) return

    const poses = posesAlongMiles(camPath, 0, TRAILHEAD_WARM_MILES, TRAILHEAD_CAMERA_SAMPLES)
    prefetchTerrainImages(poses, accessToken)

    for (let i = 0; i < poses.length; i++) {
      if (cancelled || !canMoveCamera()) break
      applyFreeCameraPose(map, poses[i])
      await waitForIdle(map, 400)
      if (!trailheadNotified) {
        onTrailheadProgress?.((i + 1) / poses.length)
      }
    }
    warmedThroughMiles = Math.max(warmedThroughMiles, TRAILHEAD_WARM_MILES)
  }

  const runInitialWarm = async () => {
    if (trailheadAlreadyCached) {
      notifyTrailhead()
      warmedThroughMiles = TRAILHEAD_WARM_MILES
      warmImages(0, PRIORITY_WARM_MILES, IMAGE_WARM_SAMPLES)
      warmImages(PRIORITY_WARM_MILES, PREFETCH_END_MILES, IMAGE_WARM_SAMPLES)
      return
    }

    const readyTimer = setTimeout(() => {
      if (!cancelled) notifyTrailhead()
    }, TRAILHEAD_READY_TIMEOUT_MS)

    onTrailheadProgress?.(0.02)
    await new Promise((r) => setTimeout(r, 80))
    if (cancelled) {
      clearTimeout(readyTimer)
      return
    }

    if (!ensurePath()) {
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled || !ensurePath()) {
        clearTimeout(readyTimer)
        notifyTrailhead()
        return
      }
    }

    // Phase 1 only — short camera walk at railing height for SoCal trailhead tiles
    await warmTrailheadCamera()
    clearTimeout(readyTimer)
    if (!cancelled) notifyTrailhead()

    // Phases 2–3: Image cache only (no camera) so splash dismiss never reveals mid-Oregon
    if (!cancelled) {
      warmImages(TRAILHEAD_WARM_MILES, PRIORITY_WARM_MILES, IMAGE_WARM_SAMPLES)
      warmImages(PRIORITY_WARM_MILES, PREFETCH_END_MILES, IMAGE_WARM_SAMPLES)
    }
  }

  void runInitialWarm()

  const warmAhead = (currentMiles: number) => {
    if (cancelled) return
    const target = Math.min(PREFETCH_END_MILES, currentMiles + LOOKAHEAD_MILES)
    if (target <= warmedThroughMiles + 5) return
    warmImages(warmedThroughMiles, target, 16)
  }

  return {
    cancel: () => {
      cancelled = true
    },
    warmAhead,
  }
}
