import assert from "node:assert/strict"
import test from "node:test"
import {
  TOUCH_SCROLL_GAIN,
  applyTouchDelta,
  clearNativeTextSelection,
  shouldCoastAfterRelease,
  shouldPreventTouchStartCallout,
  shouldStartInertia,
  stepInertiaVelocity,
} from "../lib/inverted-touch-scroll.ts"

test("touch gain is 70 percent of the first 6x calibration", () => {
  assert.equal(TOUCH_SCROLL_GAIN, 6)
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
  assert.equal(shouldStartInertia(0.08), true)
  assert.equal(shouldStartInertia(-0.08), true)
  assert.equal(shouldStartInertia(0.01), false)
})

test("a still hold kills leftover swipe velocity instead of coasting", () => {
  assert.equal(shouldCoastAfterRelease(0.8, 20), true)
  assert.equal(shouldCoastAfterRelease(0.8, 120), false)
  assert.equal(shouldCoastAfterRelease(0.01, 20), false)
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

test("inertia decays toward zero", () => {
  let v = 1
  for (let i = 0; i < 200; i++) {
    v = stepInertiaVelocity(v)
    if (v === 0) break
  }
  assert.equal(v, 0)
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
