import assert from "node:assert/strict"
import test from "node:test"
import { shouldDismissChapterOverlay } from "../lib/mobile-chapter-overlay-gesture.ts"

test("tapping anywhere on the chapter overlay dismisses it", () => {
  assert.equal(shouldDismissChapterOverlay(240, 240), true)
})

test("swiping up dismisses the chapter overlay", () => {
  assert.equal(shouldDismissChapterOverlay(240, 192), true)
})

test("an incomplete drag does not accidentally dismiss the overlay", () => {
  assert.equal(shouldDismissChapterOverlay(240, 220), false)
})
