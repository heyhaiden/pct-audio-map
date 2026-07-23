import along from "@turf/along"
import bearing from "@turf/bearing"
import length from "@turf/length"
import { lineString } from "@turf/helpers"
import {
  CAMERA_PATH_POINTS,
  PCT_TOTAL_MILES,
  computeRailingPose,
  offsetLngLat,
  type CameraPathPoint,
  type FreeCameraPose,
} from "@/lib/railing-camera"
import { applyFreeCameraPose } from "@/lib/node-camera"

/** Warm style + terrain out to early Oregon; content ends there for now. */
export const PREFETCH_END_MILES = 1700
/** Gate "Begin Journey" once this corridor is warm. */
export const TRAILHEAD_WARM_MILES = 120
/** Background preload target while splash is up (no visible camera walking). */
export const PRIORITY_WARM_MILES = 400

/** Soft cap so a slow network never blocks Enter forever. */
export const TRAILHEAD_READY_TIMEOUT_MS = 12_000

/** Keep trailhead camera samples low — each pose forces a full GL idle cycle. */
const TRAILHEAD_CAMERA_SAMPLES = 10
/** Spread preloadOnly calls out — each one does real decode/GPU-upload work. */
const PRELOAD_STAGGER_MS = 120

/**
 * Base-layer pass: whole corridor at this low zoom so ancestor tiles are always
 * resident/HTTP-cached. Mapbox renders a loaded parent while children stream
 * (findLoadedParent), so guaranteed ancestors turn "white until loaded" into
 * "blurry until sharp" — the property that matters most for perceived quality.
 */
const BASE_ZOOM = 7
const BASE_SAMPLE_SPACING_MILES = 55

/** Detail sweep sampling — dense enough that adjacent frustums overlap. */
const DETAIL_SAMPLE_SPACING_MILES = 20

/**
 * Rolling GL-residency window just ahead of the camera. Kept modest on purpose:
 * per-source tile cache is small (see minTileCacheSize note in pct-map.tsx), so
 * warming far ahead just evicts what the next few frames need.
 */
const WINDOW_AHEAD_MILES = 45
const WINDOW_SAMPLES = 8
/** Re-arm the window after this much travel from the last anchor. */
const WINDOW_RETRIGGER_MILES = 12

function buildCameraPath(trailCoordinates: number[][]): CameraPathPoint[] | null {
  if (typeof window === "undefined" || trailCoordinates.length < 2) return null

  try {
    const line = lineString(trailCoordinates)
    const totalLength = length(line, { units: "kilometers" })
    const points: CameraPathPoint[] = []

    for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
      const distance = (i / CAMERA_PATH_POINTS) * totalLength
      const point = along(line, distance, { units: "kilometers" })
      const coords = point.geometry.coordinates
      const nextDistance = Math.min(distance + 16, totalLength)
      const nextPoint = along(line, nextDistance, { units: "kilometers" })
      const pointBearing = bearing(point, nextPoint)

      points.push({
        lng: coords[0],
        lat: coords[1],
        bearing: pointBearing,
        smoothedBearing: pointBearing,
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Load real tiles for poses the camera hasn't reached yet — via Mapbox's own
 * `preloadOnly` easeTo, not hand-built URLs. `preloadOnly` clones the transform
 * instead of mutating the live one (no visible movement, no moveend/zoomend
 * events) and internally calls `_preloadTiles` across every active source cache
 * — satellite, vector, and the terrain painter's DEM cache alike — so a single
 * call warms everything the real camera will need there, fully decoded and
 * GPU-resident, not just present in some cache we can't literally address
 * (Mapbox's own tile requests carry a session `sku` token with no public API
 * to replicate, which is why hand-built warm URLs could only ever hope for an
 * edge-cache hit, never the real thing).
 *
 * Paced with a small stagger — each call does real decode/upload work, so
 * firing all of them in one tick would just relocate the stall rather than
 * prevent it. Skipped while `canPreload()` is false (e.g. mid intro `flyTo`,
 * since any `easeTo`/`jumpTo` call — `preloadOnly` or not — stops whatever
 * animation is currently in flight).
 */
async function preloadPoses(
  map: any,
  poses: FreeCameraPose[],
  canPreload: () => boolean,
  overrides?: { zoom?: number; pitch?: number; bearing?: number },
): Promise<void> {
  if (!map || typeof map.easeTo !== "function") return

  for (const pose of poses) {
    if (!canPreload()) return
    try {
      map.easeTo({
        center: lookAtGroundPoint(pose),
        zoom: overrides?.zoom ?? approxZoomForAltitude(pose.altitude),
        pitch: overrides?.pitch ?? pose.pitch,
        bearing: overrides?.bearing ?? pose.bearing,
        duration: 0,
        preloadOnly: true,
      })
    } catch {
      // Background warm — never let a bad pose interrupt the pass.
    }
    await sleep(PRELOAD_STAGGER_MS)
  }
}

export type PrefetchController = {
  cancel: () => void
  warmAhead: (currentMiles: number) => void
}

/**
 * Trailhead warm: short free-camera walk (style + DEM) for the first ~120 mi only.
 * Beyond that: background preloadOnly warm — never walk the visible camera up the
 * corridor (that caused first-load GPU thrash and the mid-trail flash when splash
 * dismissed).
 */
export function startPathTilePrefetch(options: {
  map: any
  trailCoordinates: number[][]
  canMoveCamera: () => boolean
  onTrailheadWarm?: () => void
  onTrailheadProgress?: (progress: number) => void
  trailheadAlreadyCached?: boolean
  /** Fewer/slower background preload calls on touch/narrow-viewport devices. */
  reducedGpu?: boolean
  /** True while the intro flyTo is animating — any easeTo/jumpTo would cancel it. */
  isIntroFlying?: () => boolean
}): PrefetchController {
  const {
    map,
    trailCoordinates,
    canMoveCamera,
    onTrailheadWarm,
    onTrailheadProgress,
    trailheadAlreadyCached = false,
    reducedGpu = false,
    isIntroFlying = () => false,
  } = options
  let cancelled = false
  let path: CameraPathPoint[] | null = null
  let trailheadNotified = false
  /** Bumped on every new rolling window — stale in-flight passes see it and stop. */
  let windowGeneration = 0
  let lastWindowAnchor = Number.NEGATIVE_INFINITY

  const canPreload = () => !cancelled && !isIntroFlying()

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

  const detailSamples = (fromMiles: number, toMiles: number) => {
    const spacing = reducedGpu ? DETAIL_SAMPLE_SPACING_MILES * 2 : DETAIL_SAMPLE_SPACING_MILES
    return Math.max(2, Math.round((toMiles - fromMiles) / spacing))
  }

  /**
   * Corridor-wide ancestor warm at BASE_ZOOM, flat pitch. Cheap (~30 calls) and
   * the single biggest lever against white frames: once these are cached, an
   * unloaded area renders as a blurry parent tile instead of blank.
   */
  const warmBaseLayer = async () => {
    const camPath = ensurePath()
    if (!camPath || cancelled) return
    const samples = Math.max(2, Math.round(PREFETCH_END_MILES / BASE_SAMPLE_SPACING_MILES))
    const poses = posesAlongMiles(camPath, 0, PREFETCH_END_MILES, samples)
    await preloadPoses(map, poses, canPreload, { zoom: BASE_ZOOM, pitch: 0, bearing: 0 })
  }

  /** HTTP-cache warm at real railing zoom — network gone by the time you arrive. */
  const warmDetail = async (fromMiles: number, toMiles: number) => {
    const camPath = ensurePath()
    if (!camPath || cancelled) return
    const poses = posesAlongMiles(camPath, fromMiles, toMiles, detailSamples(fromMiles, toMiles))
    await preloadPoses(map, poses, canPreload)
  }

  const warmTrailheadCamera = async () => {
    const camPath = ensurePath()
    if (!camPath || cancelled || !canMoveCamera()) return

    const poses = posesAlongMiles(camPath, 0, TRAILHEAD_WARM_MILES, TRAILHEAD_CAMERA_SAMPLES)

    for (let i = 0; i < poses.length; i++) {
      if (cancelled || !canMoveCamera()) break
      applyFreeCameraPose(map, poses[i])
      await waitForIdle(map, 400)
      if (!trailheadNotified) {
        onTrailheadProgress?.((i + 1) / poses.length)
      }
    }
  }

  const runInitialWarm = async () => {
    if (trailheadAlreadyCached) {
      notifyTrailhead()
      await warmBaseLayer()
      await warmDetail(0, PRIORITY_WARM_MILES)
      await warmDetail(PRIORITY_WARM_MILES, PREFETCH_END_MILES)
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

    // Phases 2–4: background preload only (no visible camera motion) so splash
    // dismiss never reveals mid-Oregon. Base layer first — ancestors beat detail.
    if (!cancelled) {
      await warmBaseLayer()
      await warmDetail(TRAILHEAD_WARM_MILES, PRIORITY_WARM_MILES)
      await warmDetail(PRIORITY_WARM_MILES, PREFETCH_END_MILES)
    }
  }

  void runInitialWarm()

  /**
   * Rolling GL-residency window: re-warm [current, current+45mi] at full railing
   * pose whenever the camera has moved ~12mi past the last anchor. Unlike the
   * one-shot corridor sweeps (whose tiles a ~60-per-source cache evicts long
   * before arrival), this keeps the next minute of scrolling decoded and
   * resident. A new window obsoletes any in-flight one via windowGeneration.
   */
  const warmAhead = (currentMiles: number) => {
    if (cancelled) return
    if (Math.abs(currentMiles - lastWindowAnchor) < WINDOW_RETRIGGER_MILES) return
    const camPath = ensurePath()
    if (!camPath) return
    lastWindowAnchor = currentMiles
    const generation = ++windowGeneration
    const poses = posesAlongMiles(camPath, currentMiles, currentMiles + WINDOW_AHEAD_MILES, WINDOW_SAMPLES)
    void preloadPoses(map, poses, () => canPreload() && generation === windowGeneration)
  }

  return {
    cancel: () => {
      cancelled = true
    },
    warmAhead,
  }
}
