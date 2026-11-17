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

test("scroll progress reaches React state at most once per publish interval", async () => {
  const { TRAIL_UI_PUBLISH_INTERVAL_MS, shouldPublishTrailUi } = await import(
    "../lib/railing-camera.ts"
  )
  assert.equal(TRAIL_UI_PUBLISH_INTERVAL_MS, 100)
  // First frame always publishes.
  assert.equal(shouldPublishTrailUi(5_000, 0), true)
  assert.equal(shouldPublishTrailUi(5_016, 5_000), false)
  assert.equal(shouldPublishTrailUi(5_100, 5_000), false)
  assert.equal(shouldPublishTrailUi(5_101, 5_000), true)

  // A 60 Hz loop publishes about 10 times a second however fast the trail moves.
  let last = 0
  let publishes = 0
  for (let frame = 1; frame <= 60; frame++) {
    const now = 10_000 + frame * (1000 / 60)
    if (shouldPublishTrailUi(now, last)) {
      last = now
      publishes += 1
    }
  }
  assert.ok(publishes >= 8 && publishes <= 10, `published ${publishes} times`)
})
