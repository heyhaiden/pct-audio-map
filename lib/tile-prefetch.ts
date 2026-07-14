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
const LOOKAHEAD_MILES = 80
const TRAILHEAD_WARM_MILES = 120
const SAMPLE_COUNT = 90

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

function waitForIdle(map: any, timeoutMs = 1200): Promise<void> {
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

/** Warm raster-dem tiles in the browser cache for lookahead points. */
function prefetchTerrainImages(poses: FreeCameraPose[], accessToken: string, zoom = 9): void {
  if (!accessToken) return

  for (const pose of poses) {
    const { lng, lat } = pose
    const n = Math.pow(2, zoom)
    const x = Math.floor(((lng + 180) / 360) * n)
    const latRad = (lat * Math.PI) / 180
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
    )
    // Neighbor tiles around the sample for coverage
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
 * splash/intro covers the map, then keep DEM tiles warm ahead of scroll.
 */
export function startPathTilePrefetch(options: {
  map: any
  trailCoordinates: number[][]
  accessToken: string
  /** True while the user cannot see the camera jumps (splash / pre-intro). */
  canMoveCamera: () => boolean
  onTrailheadWarm?: () => void
}): PrefetchController {
  const { map, trailCoordinates, accessToken, canMoveCamera, onTrailheadWarm } = options
  let cancelled = false
  let path: CameraPathPoint[] | null = null
  let warmedThroughMiles = 0
  let cameraWarmRunning = false

  const ensurePath = () => {
    if (!path) path = buildCameraPath(trailCoordinates)
    return path
  }

  const warmCameraSegment = async (fromMiles: number, toMiles: number) => {
    const camPath = ensurePath()
    if (!camPath || cancelled || !canMoveCamera()) return

    cameraWarmRunning = true
    const poses = posesAlongMiles(camPath, fromMiles, toMiles, SAMPLE_COUNT)
    for (const pose of poses) {
      if (cancelled || !canMoveCamera()) break
      applyFreeCameraPose(map, pose)
      await waitForIdle(map, 900)
    }
    cameraWarmRunning = false
    warmedThroughMiles = Math.max(warmedThroughMiles, toMiles)
  }

  const runInitialWarm = async () => {
    // Wait briefly for turf + style readiness
    await new Promise((r) => setTimeout(r, 400))
    if (cancelled) return

    const camPath = ensurePath()
    if (!camPath) {
      // Retry once turf loads
      await new Promise((r) => setTimeout(r, 500))
      if (cancelled || !ensurePath()) return
    }

    await warmCameraSegment(0, TRAILHEAD_WARM_MILES)
    if (!cancelled) onTrailheadWarm?.()

    // Continue warming toward WIP while splash still covers
    if (!cancelled && canMoveCamera()) {
      await warmCameraSegment(TRAILHEAD_WARM_MILES, PREFETCH_END_MILES)
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

    // If splash still hides the map, keep walking the real camera forward
    if (canMoveCamera() && !cameraWarmRunning) {
      void warmCameraSegment(warmedThroughMiles, target)
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
