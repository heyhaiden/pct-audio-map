import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildCameraPath } from "../lib/camera-path.ts"
import { introLandingCamera, zoomForCameraHeight } from "../lib/intro-landing.ts"
import {
  computeRailingPose,
  configureRailingCameraForViewport,
  offsetLngLat,
} from "../lib/railing-camera.ts"

const trail = JSON.parse(
  readFileSync(new URL("../public/pct-trail.geojson", import.meta.url), "utf8"),
)
const coordinates: number[][] = (trail.features?.[0]?.geometry ?? trail.geometry).coordinates
const path = buildCameraPath(coordinates)
const near = (actual: number, expected: number, tolerance: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${what}: ${actual} vs ${expected}`)

test("halving the camera's height above the ground is one zoom level closer", () => {
  const base = { lat: 32.59, viewportHeightPx: 900 }
  const high = zoomForCameraHeight({ ...base, heightAboveGroundMeters: 40_000 })
  const low = zoomForCameraHeight({ ...base, heightAboveGroundMeters: 20_000 })
  near(low - high, 1, 1e-9, "zoom step")
})

test("a taller viewport reads as a higher zoom from the same height", () => {
  const base = { lat: 32.59, heightAboveGroundMeters: 48_000 }
  const short = zoomForCameraHeight({ ...base, viewportHeightPx: 900 })
  const tall = zoomForCameraHeight({ ...base, viewportHeightPx: 1800 })
  near(tall - short, 1, 1e-9, "zoom step")
})

test("the formula reproduces the zoom the lab trace recorded at mile 0", () => {
  // Overnight trace, 1440x900 desktop: after the intro the scroll camera
  // settled at zoom 10.85 over the trailhead, 50,000 m up, terrain
  // exaggerated 1.8x. Campo sits near 885 m, so the drawn ground is ~1,590 m.
  const zoom = zoomForCameraHeight({
    heightAboveGroundMeters: 50_000 - 885 * 1.8,
    lat: 32.5897,
    viewportHeightPx: 900,
  })
  near(zoom, 10.85, 0.01, "mile-0 zoom")
})

test("a top-down pose lands over the same point, at the pose's own heading", () => {
  configureRailingCameraForViewport(false)
  const pose = computeRailingPose(path, 0)
  const landing = introLandingCamera(pose, { viewportHeightPx: 900, groundElevationMeters: 0 })
  assert.ok(landing)

  assert.equal(pose.pitch, 0)
  near(landing.center[0], pose.lng, 1e-9, "lng")
  near(landing.center[1], pose.lat, 1e-9, "lat")
  assert.equal(landing.pitch, 0)
  assert.equal(landing.bearing, pose.bearing)
  near(
    landing.zoom,
    zoomForCameraHeight({ heightAboveGroundMeters: pose.altitude, lat: pose.lat, viewportHeightPx: 900 }),
    1e-9,
    "zoom",
  )
})

test("the intro lands further in than today's fixed trailhead camera", () => {
  configureRailingCameraForViewport(false)
  const desktop = introLandingCamera(computeRailingPose(path, 0), {
    viewportHeightPx: 900,
    groundElevationMeters: 885 * 1.8,
  })
  assert.ok(desktop)
  // Today's TRAILHEAD_CAMERA lands at 9.55, then the scroll camera eases to ~10.85.
  near(desktop.zoom, 10.85, 0.01, "desktop landing zoom")

  configureRailingCameraForViewport(true)
  const phone = introLandingCamera(computeRailingPose(path, 0), {
    viewportHeightPx: 844,
    groundElevationMeters: 885 * 1.8,
  })
  assert.ok(phone)
  // Phones cruise higher (65,000 m), so they land further out than desktop.
  assert.ok(phone.zoom < desktop.zoom)
  configureRailingCameraForViewport(false)
})

test("a pitched pose lands on the ground point it looks at, using the slant distance", () => {
  const pose = { lng: -120, lat: 40, altitude: 26_000, pitch: 60, bearing: 30 }
  const landing = introLandingCamera(pose, { viewportHeightPx: 900, groundElevationMeters: 1_000 })
  assert.ok(landing)
  const groundKm = ((26_000 - 1_000) * Math.tan(Math.PI / 3)) / 1000
  const [lng, lat] = offsetLngLat(-120, 40, groundKm, 30)

  near(landing.center[0], lng, 1e-9, "lng")
  near(landing.center[1], lat, 1e-9, "lat")
  assert.equal(landing.pitch, 60)
  assert.equal(landing.bearing, 30)
  near(
    landing.zoom,
    zoomForCameraHeight({ heightAboveGroundMeters: 25_000 / Math.cos(Math.PI / 3), lat, viewportHeightPx: 900 }),
    1e-9,
    "zoom",
  )
})

test("unusable inputs give no landing, so the caller keeps the fixed camera", () => {
  const pose = { lng: -116.467, lat: 32.59, altitude: 50_000, pitch: 0, bearing: 1.5 }
  assert.equal(introLandingCamera(pose, { viewportHeightPx: 0, groundElevationMeters: 0 }), null)
  assert.equal(introLandingCamera(pose, { viewportHeightPx: 900, groundElevationMeters: 60_000 }), null)
  assert.equal(introLandingCamera({ ...pose, altitude: Number.NaN }, { viewportHeightPx: 900, groundElevationMeters: 0 }), null)
})
