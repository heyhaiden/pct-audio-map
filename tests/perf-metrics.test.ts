import assert from "node:assert/strict"
import test from "node:test"
import {
  createFirstSoundTracker,
  elapsedMs,
  perfDeviceType,
  resolveClipCacheState,
  resolveMapReadyStart,
} from "../lib/perf-metrics.ts"

test("resolveClipCacheState reports the best cache tier available", () => {
  assert.equal(
    resolveClipCacheState({ decoded: true, compressed: true, inflight: true }),
    "decoded",
  )
  assert.equal(
    resolveClipCacheState({ decoded: false, compressed: true, inflight: true }),
    "compressed",
  )
  assert.equal(
    resolveClipCacheState({ decoded: false, compressed: false, inflight: true }),
    "inflight",
  )
  assert.equal(
    resolveClipCacheState({ decoded: false, compressed: false, inflight: false }),
    "network",
  )
})

test("a document loaded on the homepage clocks map-ready from its time origin", () => {
  assert.deepEqual(
    resolveMapReadyStart({ documentPath: "/", firstMountInDocument: true, mountedAtMs: 180 }),
    { startMs: 0, navigation: "hard" },
  )
})

test("a client-side route change clocks map-ready from the page mount", () => {
  assert.deepEqual(
    resolveMapReadyStart({
      documentPath: "/library",
      firstMountInDocument: true,
      mountedAtMs: 42_000,
    }),
    { startMs: 42_000, navigation: "soft" },
  )
})

test("a second homepage mount in one document is a soft navigation", () => {
  assert.deepEqual(
    resolveMapReadyStart({ documentPath: "/", firstMountInDocument: false, mountedAtMs: 9_000 }),
    { startMs: 9_000, navigation: "soft" },
  )
})

test("an unknown document path falls back to the page mount", () => {
  assert.deepEqual(
    resolveMapReadyStart({ documentPath: null, firstMountInDocument: true, mountedAtMs: 250 }),
    { startMs: 250, navigation: "soft" },
  )
})

test("elapsedMs rounds to whole milliseconds and rejects unusable pairs", () => {
  assert.equal(elapsedMs(100, 350.6), 251)
  assert.equal(elapsedMs(0, 0), 0)
  assert.equal(elapsedMs(500, 499), null)
  assert.equal(elapsedMs(Number.NaN, 10), null)
  assert.equal(elapsedMs(0, Number.POSITIVE_INFINITY), null)
})

test("perfDeviceType maps the coarse-or-narrow query to mobile", () => {
  assert.equal(perfDeviceType(true), "mobile")
  assert.equal(perfDeviceType(false), "desktop")
})

test("first-sound tracker measures tap to playing once", () => {
  const tracker = createFirstSoundTracker<{ markerId: string }>()
  tracker.begin({ clipId: "1-3", tapAtMs: 1_000, meta: { markerId: "campo" } })

  assert.deepEqual(tracker.resolve("1-3", 1_420), {
    firstSoundMs: 420,
    meta: { markerId: "campo" },
  })
  assert.equal(tracker.resolve("1-3", 1_500), null)
})

test("first-sound tracker ignores a playing event for a different clip", () => {
  const tracker = createFirstSoundTracker<{ markerId: string }>()
  tracker.begin({ clipId: "1-3", tapAtMs: 1_000, meta: { markerId: "campo" } })

  assert.equal(tracker.resolve("1-4", 1_200), null)
  assert.deepEqual(tracker.resolve("1-3", 1_300), {
    firstSoundMs: 300,
    meta: { markerId: "campo" },
  })
})

test("a newer tap supersedes the pending one", () => {
  const tracker = createFirstSoundTracker<{ markerId: string }>()
  tracker.begin({ clipId: "1-3", tapAtMs: 1_000, meta: { markerId: "campo" } })
  tracker.begin({ clipId: "1-4", tapAtMs: 1_600, meta: { markerId: "lake-morena" } })

  assert.equal(tracker.resolve("1-3", 1_700), null)
  assert.deepEqual(tracker.resolve("1-4", 1_900), {
    firstSoundMs: 300,
    meta: { markerId: "lake-morena" },
  })
})

test("clear drops the pending tap", () => {
  const tracker = createFirstSoundTracker<{ markerId: string }>()
  tracker.begin({ clipId: "1-3", tapAtMs: 1_000, meta: { markerId: "campo" } })
  tracker.clear()

  assert.equal(tracker.resolve("1-3", 1_200), null)
})
