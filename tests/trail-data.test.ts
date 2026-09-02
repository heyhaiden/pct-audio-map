import assert from "node:assert/strict"
import test from "node:test"

test("concurrent trail requests share one fetch and one parsed object", async () => {
  const trailModule = await import("../lib/trail-data.ts").catch(() => null)
  assert.ok(trailModule, "expected a shared trail-data loader")

  let requests = 0
  const feature = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
  }
  const loadTrailData = trailModule.createTrailDataLoader(async () => {
    requests += 1
    return {
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [feature] }),
    }
  }, feature)

  const [first, second] = await Promise.all([loadTrailData(), loadTrailData()])

  assert.equal(requests, 1)
  assert.equal(first, feature)
  assert.equal(second, feature)
})

test("a stalled trail request resolves to fallback data", async () => {
  const trailModule = await import("../lib/trail-data.ts")
  const fallback = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
  }
  const loadTrailData = trailModule.createTrailDataLoader(
    () => new Promise(() => {}),
    fallback,
    { timeoutMs: 5 },
  )

  const result = await Promise.race([
    loadTrailData(),
    new Promise((resolve) => setTimeout(() => resolve("still pending"), 50)),
  ])

  assert.equal(result, fallback)
})
