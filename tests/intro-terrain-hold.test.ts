import assert from "node:assert/strict"
import test from "node:test"
import { holdForLandingTerrain, preloadSourceForCamera } from "../lib/intro-terrain-hold.ts"

const timed = async <T>(p: Promise<T>) => {
  const t0 = Date.now()
  const value = await p
  return { value, ms: Date.now() - t0 }
}

test("tiles that load quickly still hold for the minimum", async () => {
  const hold = holdForLandingTerrain({ preload: (done) => done(), minMs: 60, maxMs: 1000 })
  const { value, ms } = await timed(hold.promise)
  assert.equal(value, "loaded")
  assert.ok(ms >= 55, `held ${ms} ms`)
})

test("the flight waits for tiles that finish after the minimum", async () => {
  const hold = holdForLandingTerrain({
    preload: (done) => setTimeout(done, 120),
    minMs: 20,
    maxMs: 1000,
  })
  const { value, ms } = await timed(hold.promise)
  assert.equal(value, "loaded")
  assert.ok(ms >= 115 && ms < 400, `held ${ms} ms`)
})

test("tiles that never finish are cut off at the cap", async () => {
  const hold = holdForLandingTerrain({ preload: () => {}, minMs: 10, maxMs: 80 })
  const { value, ms } = await timed(hold.promise)
  assert.equal(value, "timeout")
  assert.ok(ms >= 75 && ms < 400, `held ${ms} ms`)
})

test("without a preload hook the hold is just the minimum", async () => {
  const hold = holdForLandingTerrain({ preload: null, minMs: 30, maxMs: 1000 })
  const { value, ms } = await timed(hold.promise)
  assert.equal(value, "unsupported")
  assert.ok(ms < 400, `held ${ms} ms`)
})

test("a preload that throws falls through to the cap instead of stranding the intro", async () => {
  const hold = holdForLandingTerrain({
    preload: () => {
      throw new Error("no transform yet")
    },
    minMs: 10,
    maxMs: 60,
  })
  assert.equal(await hold.promise, "timeout")
})

test("the caption shows only when the hold runs long", async () => {
  let slowFast = 0
  await holdForLandingTerrain({
    preload: (done) => done(),
    minMs: 10,
    maxMs: 1000,
    slowAfterMs: 80,
    onSlow: () => slowFast++,
  }).promise
  await new Promise((r) => setTimeout(r, 100))
  assert.equal(slowFast, 0)

  let slowLong = 0
  await holdForLandingTerrain({
    preload: (done) => setTimeout(done, 120),
    minMs: 10,
    maxMs: 1000,
    slowAfterMs: 40,
    onSlow: () => slowLong++,
  }).promise
  assert.equal(slowLong, 1)
})

test("cancel resolves the hold right away", async () => {
  const hold = holdForLandingTerrain({ preload: () => {}, minMs: 10, maxMs: 5000 })
  hold.cancel()
  assert.equal(await hold.promise, "cancelled")
})

test("preloadSourceForCamera returns null on a map without the internals it needs", () => {
  const camera = { center: [-116.47, 32.59] as [number, number], zoom: 10.8, pitch: 60, bearing: 0 }
  assert.equal(preloadSourceForCamera(null, "dem", camera, () => null), null)
  assert.equal(preloadSourceForCamera({ style: { getSourceCaches: () => [] } }, "dem", camera, () => null), null)
  assert.equal(
    preloadSourceForCamera({ style: { getSourceCaches: () => [{}] }, transform: { clone: () => ({}) } }, "dem", camera, () => null),
    null,
  )
})

test("preloadSourceForCamera aims a cloned transform and waits for every cache", () => {
  const live = { zoom: 4, center: "overview", bearing: 0, pitch: 0 }
  const seen: Record<string, unknown>[] = []
  const callbacks: (() => void)[] = []
  const cache = {
    _preloadTiles: (tr: Record<string, unknown>, cb: () => void) => {
      seen.push({ ...tr })
      callbacks.push(cb)
    },
  }
  const map = {
    style: { getSourceCaches: (id: string) => (id === "dem" ? [cache, cache] : []) },
    transform: { ...live, clone: () => ({ ...live }) },
  }
  const camera = { center: [-116.47, 32.59] as [number, number], zoom: 10.8, pitch: 60, bearing: 12 }
  const preload = preloadSourceForCamera(map, "dem", camera, (lng, lat) => ({ lng, lat }))
  assert.ok(preload)

  let done = 0
  preload(() => done++)
  assert.deepEqual(seen[0], { zoom: 10.8, center: { lng: -116.47, lat: 32.59 }, bearing: 12, pitch: 60 })
  assert.equal(map.transform.zoom, 4, "the live camera never moves")
  callbacks[0]()
  assert.equal(done, 0)
  callbacks[1]()
  assert.equal(done, 1)
})
