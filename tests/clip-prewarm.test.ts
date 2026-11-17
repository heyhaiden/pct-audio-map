import assert from "node:assert/strict"
import test from "node:test"
import { clipsToPrewarm, shouldPrewarmClips } from "../lib/clip-prewarm.ts"

const markers = [
  { id: "a", audioUrl: "/audio/a.mp3", chapter: "socal" },
  { id: "b", audioUrl: "/audio/b.mp3", chapter: "socal" },
  { id: "c", audioUrl: "/audio/c.mp3", chapter: "socal" },
  { id: "d", audioUrl: "", chapter: "socal" },
  { id: "e", audioUrl: "/audio/e.mp3", chapter: "washington" },
]
const markerMiles = { a: 1, b: 46, c: 48, d: 50, e: 52 }
const activeChapters = new Set(["socal"])
const pick = (currentMiles: number, extra = {}) =>
  clipsToPrewarm({ markers, markerMiles, activeChapters, currentMiles, ...extra })

test("at the trailhead only the first pin is in range", () => {
  assert.deepEqual(pick(0), ["/audio/a.mp3"])
})

test("picks the two nearest pins, nearest first, ahead or behind", () => {
  assert.deepEqual(pick(47.2), ["/audio/c.mp3", "/audio/b.mp3"])
  assert.deepEqual(pick(60), ["/audio/c.mp3", "/audio/b.mp3"])
})

test("skips pins without audio and pins in chapters that aren't live", () => {
  assert.deepEqual(pick(51, { count: 5 }), ["/audio/c.mp3", "/audio/b.mp3"])
})

test("nothing is picked on a stretch with no pins nearby", () => {
  assert.deepEqual(pick(200), [])
})

test("a pin with no known mile is never picked", () => {
  assert.deepEqual(
    clipsToPrewarm({ markers, markerMiles: {}, activeChapters, currentMiles: 1 }),
    [],
  )
})

test("prewarm is skipped on Save-Data and 2G connections only", () => {
  assert.equal(shouldPrewarmClips(undefined), true)
  assert.equal(shouldPrewarmClips({ effectiveType: "4g" }), true)
  assert.equal(shouldPrewarmClips({ effectiveType: "3g" }), true)
  assert.equal(shouldPrewarmClips({ saveData: true, effectiveType: "4g" }), false)
  assert.equal(shouldPrewarmClips({ effectiveType: "2g" }), false)
  assert.equal(shouldPrewarmClips({ effectiveType: "slow-2g" }), false)
})
