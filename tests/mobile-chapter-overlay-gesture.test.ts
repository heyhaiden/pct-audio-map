import assert from "node:assert/strict"
import test from "node:test"
import { shouldDismissChapterOverlay } from "../lib/mobile-chapter-overlay-gesture.ts"

test("tapping anywhere on the chapter overlay dismisses it", () => {
  assert.equal(shouldDismissChapterOverlay(240, 240), true)
})

test("a tiny pointer jitter still counts as a tap", () => {
  assert.equal(shouldDismissChapterOverlay(240, 245), true)
})

test("swiping does not dismiss the overlay", () => {
  assert.equal(shouldDismissChapterOverlay(240, 192), false)
})

test("an incomplete drag does not accidentally dismiss the overlay", () => {
  assert.equal(shouldDismissChapterOverlay(240, 220), false)
})
