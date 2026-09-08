import assert from "node:assert/strict"
import test from "node:test"

test("dismissing a chapter clears its overlay on every breakpoint", async () => {
  const visibility = await import("../lib/chapter-overlay-visibility.ts").catch(() => null)
  assert.ok(visibility, "expected shared chapter overlay visibility")

  assert.equal(visibility.resolveChapterOverlayOpacity(0.8, 2, 2), 0)
  assert.equal(visibility.resolveChapterOverlayOpacity(0.8, 1, 2), 0.8)
  assert.equal(visibility.resolveChapterOverlayOpacity(0.8, null, 2), 0.8)
})

test("opening map pins stay locked through the crane shot until SoCal is dismissed", async () => {
  const visibility = await import("../lib/chapter-overlay-visibility.ts")

  assert.equal(
    visibility.areOpeningMapPinsLocked({
      isResuming: false,
      introComplete: false,
      isSoCalOverlayVisible: false,
    }),
    true,
    "crane shot / intro fly",
  )
  assert.equal(
    visibility.areOpeningMapPinsLocked({
      isResuming: false,
      introComplete: true,
      isSoCalOverlayVisible: true,
    }),
    true,
    "SoCal overlay still up",
  )
  assert.equal(
    visibility.areOpeningMapPinsLocked({
      isResuming: false,
      introComplete: true,
      isSoCalOverlayVisible: false,
    }),
    false,
    "SoCal overlay cleared",
  )
  assert.equal(
    visibility.areOpeningMapPinsLocked({
      isResuming: true,
      introComplete: false,
      isSoCalOverlayVisible: false,
    }),
    false,
    "resume skips the opening gate",
  )
})
