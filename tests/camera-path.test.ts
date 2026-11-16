import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import along from "@turf/along"
import bearing from "@turf/bearing"
import length from "@turf/length"
import { lineString } from "@turf/helpers"
import { buildCameraPath, measureLine } from "../lib/camera-path.ts"
import { CAMERA_PATH_POINTS, PCT_TOTAL_MILES } from "../lib/railing-camera.ts"
import { geoFractionForTrailMile } from "../lib/trail-mile-calibration.ts"

const trail = JSON.parse(
  readFileSync(new URL("../public/pct-trail.geojson", import.meta.url), "utf8"),
)
const coordinates: number[][] = (trail.features?.[0]?.geometry ?? trail.geometry).coordinates

/** The Turf-based build this module replaced, kept here as the reference. */
function referencePath(coords: number[][]) {
  const line = lineString(coords)
  const totalLength = length(line, { units: "kilometers" })
  const points = []
  for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
    const distance =
      geoFractionForTrailMile((i / CAMERA_PATH_POINTS) * PCT_TOTAL_MILES) * totalLength
    const point = along(line, distance, { units: "kilometers" })
    const nextPoint = along(line, Math.min(distance + 16, totalLength), { units: "kilometers" })
    points.push({
      lng: point.geometry.coordinates[0],
      lat: point.geometry.coordinates[1],
      bearing: bearing(point, nextPoint),
    })
  }
  return points
}

test("the camera path matches the Turf-built path on the real trail", () => {
  const expected = referencePath(coordinates)
  const actual = buildCameraPath(coordinates)

  assert.equal(actual.length, CAMERA_PATH_POINTS + 1)
  for (let i = 0; i < expected.length; i++) {
    assert.ok(Math.abs(actual[i].lng - expected[i].lng) < 1e-9, `lng at sample ${i}`)
    assert.ok(Math.abs(actual[i].lat - expected[i].lat) < 1e-9, `lat at sample ${i}`)
    assert.ok(Math.abs(actual[i].bearing - expected[i].bearing) < 1e-6, `bearing at sample ${i}`)
  }
})

test("smoothed bearings stay within 0-360 and near the raw bearing on a straight line", () => {
  const straight = Array.from({ length: 50 }, (_, i) => [-120, 33 + i * 0.3])
  const path = buildCameraPath(straight)

  for (const point of path) {
    assert.ok(point.smoothedBearing >= 0 && point.smoothedBearing < 360)
    const offNorth = Math.min(point.smoothedBearing, 360 - point.smoothedBearing)
    assert.ok(offNorth < 1e-6)
  }
})

test("measureLine matches Turf's length and clamps past the end", () => {
  const line = measureLine(coordinates)
  const turfLength = length(lineString(coordinates), { units: "kilometers" })
  assert.ok(Math.abs(line.totalKm - turfLength) < 1e-6)

  const last = coordinates[coordinates.length - 1]
  assert.deepEqual(line.along(line.totalKm + 500), [last[0], last[1]])
  assert.deepEqual(line.along(0), [coordinates[0][0], coordinates[0][1]])
})

test("along lands on a vertex when the distance hits it exactly", () => {
  const coords = [
    [0, 0],
    [0, 1],
    [0, 2],
  ]
  const line = measureLine(coords)
  const [lng, lat] = line.along(line.totalKm / 2)
  assert.ok(Math.abs(lng) < 1e-9)
  assert.ok(Math.abs(lat - 1) < 1e-9)
})

test("a line with fewer than two points yields no path", () => {
  assert.deepEqual(buildCameraPath([]), [])
  assert.deepEqual(buildCameraPath([[-116, 32]]), [])
})

test("building the path on the real trail is fast", () => {
  const started = performance.now()
  buildCameraPath(coordinates)
  assert.ok(performance.now() - started < 100)
})
