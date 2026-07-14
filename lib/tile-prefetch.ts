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
/** Keep walking the real camera this far while splash still covers. */
export const PRIORITY_WARM_MILES = 400
const LOOKAHEAD_MILES = 100

/** Soft cap so a slow network never blocks Enter forever. */
export const TRAILHEAD_READY_TIMEOUT_MS = 12_000

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

function waitForIdle(map: any, timeoutMs = 550): Promise<void> {
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

/**
 * Approximate DEM zoom from railing altitude so Image() warm matches what GL will request.
 * ~26km cruise → ~z10–11; lower punch-in altitudes → higher zoom.
 */
function demZoomForAltitude(altitudeMeters: number): number {
  if (altitudeMeters > 40000) return 8
  if (altitudeMeters > 25000) return 10
  if (altitudeMeters > 12000) return 11
  return 12
}

/** Warm raster-dem tiles in the browser cache for lookahead points. */
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
 * Runtime path prefetch: walk free-camera along the railing corridor while the
 * splash covers the map (real style + DEM tiles), then keep DEM warm ahead of scroll.
 *
 * Phases while splash is up:
 *  1) 0 → TRAILHEAD_WARM_MILES  → fires onTrailheadWarm (gates Enter)
 *  2) → PRIORITY_WARM_MILES
 *  3) → PREFETCH_END_MILES
 */
export function startPathTilePrefetch(options: {
  map: any
  trailCoordinates: number[][]
  accessToken: string
  /** True while the user cannot see the camera jumps (splash / pre-intro). */
  canMoveCamera: () => boolean
  onTrailheadWarm?: () => void
  /** 0–1 progress through the trailhead warm segment. */
  onTrailheadProgress?: (progress: number) => void
  /**
   * When true (session already warmed trailhead), unlock Enter immediately and
   * only do lightweight DEM Image warm — skip the blocking camera walk for phase 1.
   */
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
  let cameraWarmRunning = false
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

  const warmCameraSegment = async (
    fromMiles: number,
    toMiles: number,
    sampleCount: number,
    reportProgress = false,
  ) => {
    const camPath = ensurePath()
    if (!camPath || cancelled || !canMoveCamera()) return

    cameraWarmRunning = true
    const poses = posesAlongMiles(camPath, fromMiles, toMiles, sampleCount)
    // Also kick DEM Image cache in parallel — style tiles come from the camera walk
    prefetchTerrainImages(poses, accessToken)

    for (let i = 0; i < poses.length; i++) {
      if (cancelled || !canMoveCamera()) break
      applyFreeCameraPose(map, poses[i])
      await waitForIdle(map, 550)
      if (reportProgress && !trailheadNotified) {
        onTrailheadProgress?.((i + 1) / poses.length)
      }
    }
    cameraWarmRunning = false
    warmedThroughMiles = Math.max(warmedThroughMiles, toMiles)
  }

  const runInitialWarm = async () => {
    // Session cache hit: unlock Enter immediately; browser HTTP cache already has tiles.
    // Still nudge DEM images and optionally continue deeper warm while splash is up.
    if (trailheadAlreadyCached) {
      notifyTrailhead()
      warmedThroughMiles = TRAILHEAD_WARM_MILES
      const camPath = ensurePath()
      if (camPath) {
        prefetchTerrainImages(posesAlongMiles(camPath, 0, TRAILHEAD_WARM_MILES, 16), accessToken)
      }
      if (!cancelled && canMoveCamera()) {
        await warmCameraSegment(TRAILHEAD_WARM_MILES, PRIORITY_WARM_MILES, 48)
      }
      if (!cancelled && canMoveCamera()) {
        await warmCameraSegment(PRIORITY_WARM_MILES, PREFETCH_END_MILES, 60)
      }
      return
    }

    // Soft timeout: never leave Enter gated forever
    const readyTimer = setTimeout(() => {
      if (!cancelled) notifyTrailhead()
    }, TRAILHEAD_READY_TIMEOUT_MS)

    onTrailheadProgress?.(0.02)
    await new Promise((r) => setTimeout(r, 120))
    if (cancelled) {
      clearTimeout(readyTimer)
      return
    }

    const camPath = ensurePath()
    if (!camPath) {
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled || !ensurePath()) {
        clearTimeout(readyTimer)
        notifyTrailhead()
        return
      }
    }

    // Phase 1 — trailhead corridor (gates Begin Journey)
    await warmCameraSegment(0, TRAILHEAD_WARM_MILES, 28, true)
    clearTimeout(readyTimer)
    if (!cancelled) notifyTrailhead()

    // Phase 2 — priority SoCal → Sierra approach
    if (!cancelled && canMoveCamera()) {
      await warmCameraSegment(TRAILHEAD_WARM_MILES, PRIORITY_WARM_MILES, 48)
    }

    // Phase 3 — rest of published corridor while splash still covers
    if (!cancelled && canMoveCamera()) {
      await warmCameraSegment(PRIORITY_WARM_MILES, PREFETCH_END_MILES, 60)
    }
  }

  void runInitialWarm()

  const warmAhead = (currentMiles: number) => {
    if (cancelled) return
    const target = Math.min(PREFETCH_END_MILES, currentMiles + LOOKAHEAD_MILES)
    if (target <= warmedThroughMiles + 5) return

    const camPath = ensurePath()
    if (!camPath) return

    const poses = posesAlongMiles(camPath, warmedThroughMiles, target, 24)
    prefetchTerrainImages(poses, accessToken)

    if (canMoveCamera() && !cameraWarmRunning) {
      void warmCameraSegment(warmedThroughMiles, target, 24)
    } else {
      warmedThroughMiles = Math.max(warmedThroughMiles, target)
    }
  }

  return {
    cancel: () => {
      cancelled = true
    },
    warmAhead,
  }
}
