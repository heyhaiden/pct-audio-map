import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import along from "@turf/along"
import bearing from "@turf/bearing"
import length from "@turf/length"
import { lineString } from "@turf/helpers"
import { buildCameraPath } from "../lib/camera-path.ts"
import { getMapPrefetchPolicy } from "../lib/map-runtime-policy.ts"
import {
  PREFETCH_END_MILES,
  posesAlongMiles,
  prefetchCameraPath,
  preloadTargetForPose,
} from "../lib/prefetch-poses.ts"
import {
  CAMERA_PATH_POINTS,
  PCT_TOTAL_MILES,
  configureRailingCameraForViewport,
  type CameraPathPoint,
} from "../lib/railing-camera.ts"
import { geoFractionForTrailMile } from "../lib/trail-mile-calibration.ts"

const trail = JSON.parse(
  readFileSync(new URL("../public/pct-trail.geojson", import.meta.url), "utf8"),
)
const coordinates: number[][] = (trail.features?.[0]?.geometry ?? trail.geometry).coordinates

/**
 * The Turf build `lib/tile-prefetch.ts` carried as its own fallback before it
 * switched to `lib/camera-path.ts`, kept here verbatim as the reference.
 */
function turfPrefetchPath(trailCoordinates: number[][]): CameraPathPoint[] {
  const line = lineString(trailCoordinates)
  const totalLength = length(line, { units: "kilometers" })
  const points: CameraPathPoint[] = []

  for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
    const distance =
      geoFractionForTrailMile((i / CAMERA_PATH_POINTS) * PCT_TOTAL_MILES) * totalLength
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
}

/** Every sweep `startPathTilePrefetch` asks for, for one device profile. */
function prefetchSweeps(reducedGpu: boolean): Array<[from: number, to: number, count: number]> {
  const policy = getMapPrefetchPolicy(reducedGpu)
  const detailSpacing = reducedGpu ? 40 : 20
  const detail = (from: number, to: number): [number, number, number] => [
    from,
    to,
    Math.max(2, Math.round((to - from) / detailSpacing)),
  ]
  const sweeps: Array<[number, number, number]> = [
    [0, 120, policy.trailheadSamples],
    [0, PREFETCH_END_MILES, Math.max(2, Math.round(PREFETCH_END_MILES / 55))],
    detail(0, 400),
    detail(120, 400),
    detail(400, PREFETCH_END_MILES),
  ]
  for (let mile = 0; mile < PREFETCH_END_MILES; mile += 90) {
    sweeps.push([mile, mile + policy.windowAheadMiles, policy.windowSamples])
  }
  return sweeps
}

const bearingGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

for (const reducedGpu of [false, true]) {
  const profile = reducedGpu ? "phone" : "desktop"

  test(`prefetch poses match the Turf-built path on the real trail (${profile})`, () => {
    configureRailingCameraForViewport(reducedGpu)
    const expectedPath = turfPrefetchPath(coordinates)
    const actualPath = prefetchCameraPath(coordinates)
    assert.ok(actualPath)

    let compared = 0
    for (const [from, to, count] of prefetchSweeps(reducedGpu)) {
      const expected = posesAlongMiles(expectedPath, from, to, count)
      const actual = posesAlongMiles(actualPath, from, to, count)
      assert.equal(actual.length, expected.length)
      assert.ok(actual.length > 0, `sweep ${from}-${to} produced poses`)

      for (let i = 0; i < expected.length; i++) {
        const where = `${profile} sweep ${from}-${to}, pose ${i}`
        // 1e-7 degrees is about a centimetre on the ground.
        assert.ok(Math.abs(actual[i].lng - expected[i].lng) < 1e-7, `lng, ${where}`)
        assert.ok(Math.abs(actual[i].lat - expected[i].lat) < 1e-7, `lat, ${where}`)
        assert.ok(bearingGap(actual[i].bearing, expected[i].bearing) < 1e-6, `bearing, ${where}`)
        assert.equal(actual[i].altitude, expected[i].altitude, `altitude, ${where}`)
        assert.equal(actual[i].pitch, expected[i].pitch, `pitch, ${where}`)

        const expectedTarget = preloadTargetForPose(expected[i])
        const actualTarget = preloadTargetForPose(actual[i])
        assert.ok(Math.abs(actualTarget.center[0] - expectedTarget.center[0]) < 1e-7, `center lng, ${where}`)
        assert.ok(Math.abs(actualTarget.center[1] - expectedTarget.center[1]) < 1e-7, `center lat, ${where}`)
        assert.equal(actualTarget.zoom, expectedTarget.zoom, `zoom, ${where}`)
        compared++
      }
    }
    assert.ok(compared > 100)
    configureRailingCameraForViewport(false)
  })
}

test("the fallback path is the scroll rail's own path", () => {
  assert.deepEqual(prefetchCameraPath(coordinates), buildCameraPath(coordinates))
})

test("the fallback yields no path for a line it cannot sample", () => {
  assert.equal(prefetchCameraPath([]), null)
  assert.equal(prefetchCameraPath([[-116, 32]]), null)
  // A malformed vertex must not throw out of a background warm.
  assert.equal(prefetchCameraPath([[-116, 32], undefined as unknown as number[]]), null)
})

test("poses stop at the content edge and an empty range yields none", () => {
  const path = buildCameraPath(coordinates)
  const past = posesAlongMiles(path, PREFETCH_END_MILES - 30, PREFETCH_END_MILES + 500, 4)
  const edge = posesAlongMiles(path, PREFETCH_END_MILES, PREFETCH_END_MILES, 1)
  assert.equal(past.length, 4)
  assert.deepEqual(
    past[3],
    posesAlongMiles(path, PREFETCH_END_MILES - 30, PREFETCH_END_MILES, 4)[3],
  )
  assert.deepEqual(edge, [])
  assert.deepEqual(posesAlongMiles(path, PREFETCH_END_MILES + 10, PREFETCH_END_MILES + 50, 3), [])
})

test("the preload target looks at the ground point ahead of the camera", () => {
  configureRailingCameraForViewport(false)
  const path = buildCameraPath(coordinates)
  // Mile 400 is past the opening transition: cruise altitude, 60 degree pitch.
  const [pose] = posesAlongMiles(path, 400, 401, 2)
  const target = preloadTargetForPose(pose)
  const sample = path[Math.round((400 / PCT_TOTAL_MILES) * CAMERA_PATH_POINTS)]

  assert.ok(Math.abs(target.center[0] - sample.lng) < 0.05)
  assert.ok(Math.abs(target.center[1] - sample.lat) < 0.05)
  assert.equal(target.zoom, 10)
  assert.equal(target.pitch, pose.pitch)
  assert.equal(target.bearing, pose.bearing)
})
