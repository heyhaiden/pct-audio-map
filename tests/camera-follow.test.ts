import assert from "node:assert/strict"
import test from "node:test"
import {
  cameraFollowFactors,
  shouldDecimateCameraWrites,
} from "../lib/railing-camera.ts"

const FRAME = 1 / 60

test("mobile follow blends less per frame so the rail eases instead of snapping", () => {
  const desktop = cameraFollowFactors(FRAME, false)
  const mobile = cameraFollowFactors(FRAME, true)
  assert.ok(mobile.positionFactor < desktop.positionFactor)
  assert.ok(mobile.bearingFactor < desktop.bearingFactor)
})

test("settle blends faster than tracking so the tail does not linger", () => {
  const tracking = cameraFollowFactors(FRAME, true, false)
  const settling = cameraFollowFactors(FRAME, true, true)
  assert.ok(settling.positionFactor > tracking.positionFactor)
  assert.ok(settling.bearingFactor > tracking.bearingFactor)
})

test("mobile never skips camera writes during scroll", () => {
  assert.equal(shouldDecimateCameraWrites(true, 0.03, true), false)
  assert.equal(shouldDecimateCameraWrites(true, 0.03, false), true)
  assert.equal(shouldDecimateCameraWrites(false, 0.03, false), false)
})
