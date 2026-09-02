import assert from "node:assert/strict"
import test from "node:test"

test("dismissing a chapter clears its overlay on every breakpoint", async () => {
  const visibility = await import("../lib/chapter-overlay-visibility.ts").catch(() => null)
  assert.ok(visibility, "expected shared chapter overlay visibility")

  assert.equal(visibility.resolveChapterOverlayOpacity(0.8, 2, 2), 0)
  assert.equal(visibility.resolveChapterOverlayOpacity(0.8, 1, 2), 0.8)
  assert.equal(visibility.resolveChapterOverlayOpacity(0.8, null, 2), 0.8)
})
