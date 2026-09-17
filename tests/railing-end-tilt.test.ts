import assert from "node:assert/strict"
import test from "node:test"
import {
  CRUISING_ALTITUDE_METERS,
  END_TRANSITION_MILES,
  PCT_TOTAL_MILES,
  PEAK_PITCH,
  altitudeAndPitchForProgress,
  configureRailingCameraForViewport,
  shouldShowNorthernTerminus,
} from "../lib/railing-camera.ts"

/** Miles of trail visible ahead at cruise pitch (flat-earth free-camera offset). */
function cruiseLookAheadMiles() {
  const km = (CRUISING_ALTITUDE_METERS * Math.tan((PEAK_PITCH * Math.PI) / 180)) / 1000
  return km / 1.60934
}

test("end tilt starts after the terminus is already inside the cruise look-ahead", () => {
  assert.ok(
    END_TRANSITION_MILES < cruiseLookAheadMiles(),
    `END_TRANSITION_MILES (${END_TRANSITION_MILES}) must be shorter than cruise look-ahead (~${cruiseLookAheadMiles().toFixed(0)} mi)`,
  )
})

test("pitch stays near peak until late in the end transition so the terminus stays framed", () => {
  configureRailingCameraForViewport(false)
  const start = 1 - END_TRANSITION_MILES / PCT_TOTAL_MILES
  const mid = start + (1 - start) * 0.5
  const late = start + (1 - start) * 0.85

  const atStart = altitudeAndPitchForProgress(start)
  const atMid = altitudeAndPitchForProgress(mid)
  const atLate = altitudeAndPitchForProgress(late)
  const atEnd = altitudeAndPitchForProgress(1)

  assert.ok(Math.abs(atStart.pitch - PEAK_PITCH) < 0.5)
  // Mid-transition still mostly cruising — linear tilt would already be at 30°.
  assert.ok(atMid.pitch > PEAK_PITCH * 0.7)
  assert.ok(atLate.pitch < atMid.pitch)
  assert.ok(atEnd.pitch < 1)
})

test("northern terminus waits until the camera is top-down", () => {
  configureRailingCameraForViewport(false)
  const endStartMiles = PCT_TOTAL_MILES - END_TRANSITION_MILES

  assert.equal(shouldShowNorthernTerminus(endStartMiles), false)
  assert.equal(shouldShowNorthernTerminus(2640), false)
  assert.equal(shouldShowNorthernTerminus(PCT_TOTAL_MILES - 2), false)
  assert.equal(shouldShowNorthernTerminus(PCT_TOTAL_MILES), true)
  assert.equal(shouldShowNorthernTerminus(0), false)
})
