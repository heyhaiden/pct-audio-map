import assert from "node:assert/strict"
import test from "node:test"
import {
  TOUCH_SCROLL_GAIN,
  applyTouchDelta,
  TAP_MAX_MS,
  TAP_SLOP_PX,
  clearNativeTextSelection,
  isTapGesture,
  shouldCoastAfterRelease,
  shouldPreventTouchStartCallout,
  shouldStartInertia,
  GLIDE_TIME_CONSTANT_MS,
  MAX_GLIDE_VELOCITY,
  clampGlideVelocity,
  createVelocityTracker,
  glideDistance,
  stepGlideVelocity,
} from "../lib/inverted-touch-scroll.ts"

test("touch gain is 70 percent of the first 6x calibration", () => {
  assert.equal(TOUCH_SCROLL_GAIN, 5.1)
})

test("finger down advances the trail", () => {
  const result = applyTouchDelta({ deltaY: 24, deltaMs: 16 })
  assert.equal(result.scrollDelta, 24 * TOUCH_SCROLL_GAIN)
  assert.equal(result.velocity, (24 * TOUCH_SCROLL_GAIN) / 16)
})

test("finger up scrolls back", () => {
  const result = applyTouchDelta({ deltaY: -18, deltaMs: 16 })
  assert.equal(result.scrollDelta, -18 * TOUCH_SCROLL_GAIN)
  assert.ok(result.velocity < 0)
})

test("inertia starts for both forward and reverse velocity", () => {
  assert.equal(shouldStartInertia(0.8), true)
  assert.equal(shouldStartInertia(-0.8), true)
  assert.equal(shouldStartInertia(0.1), false)
})

test("a still hold kills leftover swipe velocity instead of coasting", () => {
  assert.equal(shouldCoastAfterRelease(0.8, 20), true)
  assert.equal(shouldCoastAfterRelease(0.8, 120), false)
  assert.equal(shouldCoastAfterRelease(0.1, 20), false)
})

test("journey CSS disables native hold-to-select", async () => {
  const { readFileSync } = await import("node:fs")
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")
  assert.match(css, /html:not\(:has\(\.site-page-root\)\) \*/)
  assert.match(css, /user-select:\s*none\s*!important/)
  assert.match(css, /-webkit-touch-callout:\s*none/)
})

test("Chrome hold-to-select is blocked on the map, not on buttons", () => {
  assert.equal(shouldPreventTouchStartCallout({ tagName: "CANVAS" }), true)
  assert.equal(shouldPreventTouchStartCallout({ tagName: "DIV" }), true)
  const button = { tagName: "BUTTON", getAttribute: () => null }
  assert.equal(shouldPreventTouchStartCallout(button), false)
  assert.equal(
    shouldPreventTouchStartCallout({ tagName: "SPAN", parentElement: button, getAttribute: () => null }),
    false,
  )
})

test("a leftover text range is collapsed so Chrome cannot keep the toolbar", () => {
  const selection = {
    rangeCount: 1,
    removeAllRanges() {
      this.rangeCount = 0
    },
  }
  clearNativeTextSelection(selection)
  assert.equal(selection.rangeCount, 0)
})

test("a glide decays to a stop", () => {
  let v = MAX_GLIDE_VELOCITY
  let ms = 0
  while (v !== 0 && ms < 5000) {
    v = stepGlideVelocity(v, 16)
    ms += 16
  }
  assert.equal(v, 0)
  assert.ok(ms < 1000, `stopped after ${ms} ms`)
})

test("a glide covers the same ground at 60 Hz and 120 Hz", () => {
  const run = (frameMs: number) => {
    let v = 5
    let distance = 0
    while (v !== 0) {
      distance += v * frameMs
      v = stepGlideVelocity(v, frameMs)
    }
    return distance
  }
  const at60 = run(1000 / 60)
  const at120 = run(1000 / 120)
  assert.ok(Math.abs(at60 - at120) / at120 < 0.06, `${at60} vs ${at120}`)
})

test("even a hard fling glides a bounded distance", () => {
  assert.equal(clampGlideVelocity(40), MAX_GLIDE_VELOCITY)
  assert.equal(clampGlideVelocity(-40), -MAX_GLIDE_VELOCITY)
  assert.equal(clampGlideVelocity(Number.NaN), 0)
  // About 38 document px per mile on a 390x844 phone.
  const miles = glideDistance(40) / 38
  assert.ok(miles < 40, `max glide ${miles.toFixed(1)} miles`)
  assert.equal(glideDistance(40), MAX_GLIDE_VELOCITY * GLIDE_TIME_CONSTANT_MS)
})

test("release speed comes from the last 100 ms, not one jumpy sample", () => {
  const tracker = createVelocityTracker()
  // Steady 10 px per 16 ms, then one 60 px spike.
  for (let i = 0; i <= 5; i++) tracker.add(10, i * 16)
  tracker.add(60, 6 * 16)
  const smoothed = tracker.velocity(6 * 16)
  assert.ok(smoothed < 60 / 16, `smoothed ${smoothed} is below the spike's 3.75 px/ms`)
  assert.ok(smoothed > 10 / 16, "still counts the spike")
})

test("old samples drop out of the release speed", () => {
  const tracker = createVelocityTracker()
  tracker.add(50, 0)
  tracker.add(50, 16)
  assert.equal(tracker.velocity(500), 0)
  tracker.reset()
  assert.equal(tracker.velocity(0), 0)
})

test("isNativeScrollTarget finds a scrollable ancestor and stops at the root", async () => {
  const { isNativeScrollTarget } = await import("../lib/inverted-touch-scroll.ts")
  type FakeNode = {
    overflowY: string
    scrollHeight: number
    clientHeight: number
    parentElement: FakeNode | null
  }
  const root: FakeNode = { overflowY: "auto", scrollHeight: 9000, clientHeight: 800, parentElement: null }
  const card: FakeNode = { overflowY: "auto", scrollHeight: 600, clientHeight: 300, parentElement: root }
  const text: FakeNode = { overflowY: "visible", scrollHeight: 20, clientHeight: 20, parentElement: card }
  const canvas: FakeNode = { overflowY: "visible", scrollHeight: 800, clientHeight: 800, parentElement: root }
  const fitted: FakeNode = { overflowY: "auto", scrollHeight: 300, clientHeight: 300, parentElement: root }
  const overflowYOf = (node: FakeNode) => node.overflowY

  assert.equal(isNativeScrollTarget(text, root, overflowYOf), true)
  assert.equal(isNativeScrollTarget(canvas, root, overflowYOf), false)
  // Scrollable by style but with nothing to scroll.
  assert.equal(isNativeScrollTarget(fitted, root, overflowYOf), false)
  // The root itself is the journey scroller, never a native target.
  assert.equal(isNativeScrollTarget(root, root, overflowYOf), false)
  assert.equal(isNativeScrollTarget(null, root, overflowYOf), false)
})

// A quick thumb flick used to count as a tap: the old check compared the
// release point with the last move point, which is the same spot. The fake
// click opened any pin under the thumb and locked scrolling.
test("a quick flick is not a tap", () => {
  // Lab right-thumb flick: 140 px down in about 100 ms.
  assert.equal(isTapGesture({ maxTravelPx: 140, durationMs: 100, interruptedGlide: false }), false)
})

test("a still touch is a tap", () => {
  assert.equal(isTapGesture({ maxTravelPx: 2, durationMs: 120, interruptedGlide: false }), true)
})

test("a touch that wanders out and back is not a tap", () => {
  // Ends near where it started, but travelled past the slop on the way.
  assert.equal(isTapGesture({ maxTravelPx: TAP_SLOP_PX + 20, durationMs: 200, interruptedGlide: false }), false)
})

test("a long press is not a tap", () => {
  assert.equal(isTapGesture({ maxTravelPx: 0, durationMs: TAP_MAX_MS, interruptedGlide: false }), false)
})

test("a touch that stops a glide only stops it, like iPhone scrolling", () => {
  assert.equal(isTapGesture({ maxTravelPx: 0, durationMs: 90, interruptedGlide: true }), false)
})
