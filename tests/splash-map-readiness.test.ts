import assert from "node:assert/strict"
import test from "node:test"
import {
  AUDIO_MARKER_LAYER_ID,
  AUDIO_MARKER_SOURCE_ID,
  TRAIL_LINE_LAYER_ID,
  TRAIL_SOURCE_ID,
  isOverviewSceneReady,
  shouldUnlockSplash,
  waitForOverviewScene,
} from "../lib/splash-map-readiness.ts"

function createMap(overrides: Record<string, unknown> = {}) {
  const sources = new Set([TRAIL_SOURCE_ID, AUDIO_MARKER_SOURCE_ID])
  const layers = new Set([TRAIL_LINE_LAYER_ID, AUDIO_MARKER_LAYER_ID])
  const jumps: unknown[] = []

  return {
    _removed: false,
    style: {},
    jumps,
    areTilesLoaded: () => true,
    getSource: (id: string) => (sources.has(id) ? {} : undefined),
    getLayer: (id: string) => (layers.has(id) ? {} : undefined),
    queryRenderedFeatures: (_geometry: unknown, options?: { layers?: string[] }) => {
      const layer = options?.layers?.[0]
      if (layer === TRAIL_LINE_LAYER_ID) return [{}]
      return []
    },
    querySourceFeatures: (sourceId: string) =>
      sourceId === AUDIO_MARKER_SOURCE_ID ? [{}] : [],
    once(event: string, cb: () => void) {
      if (event === "idle") queueMicrotask(cb)
    },
    off() {},
    triggerRepaint() {},
    jumpTo(options: unknown) {
      jumps.push(options)
    },
    ...overrides,
  }
}

test("session tile cache does not unlock the splash by itself", () => {
  assert.equal(
    shouldUnlockSplash({ overviewSceneReady: false, trailPrepCached: true }),
    false,
  )
  assert.equal(
    shouldUnlockSplash({ overviewSceneReady: true, trailPrepCached: false }),
    true,
  )
})

test("overview scene is not ready without the trail line", () => {
  const map = createMap({
    getLayer: (id: string) => (id === TRAIL_LINE_LAYER_ID ? undefined : {}),
  })
  assert.equal(isOverviewSceneReady(map), false)
})

test("overview scene is not ready without audio markers", () => {
  const map = createMap({
    getLayer: (id: string) => (id === AUDIO_MARKER_LAYER_ID ? undefined : {}),
  })
  assert.equal(isOverviewSceneReady(map), false)
})

test("overview scene is not ready while viewport tiles are still loading", () => {
  const map = createMap({ areTilesLoaded: () => false })
  assert.equal(isOverviewSceneReady(map), false)
})

test("overview scene is not ready until the trail line has rendered", () => {
  const map = createMap({
    queryRenderedFeatures: () => [],
  })
  assert.equal(isOverviewSceneReady(map), false)
})

test("overview scene is not ready until audio marker data is in the source", () => {
  const map = createMap({
    querySourceFeatures: () => [],
  })
  assert.equal(isOverviewSceneReady(map), false)
})

test("overview scene is ready once tiles, trail, and markers are in the view", () => {
  assert.equal(isOverviewSceneReady(createMap()), true)
})

test("splash warm stays on the aerial overview and never jumps the live camera", async () => {
  const map = createMap()
  const ready = await waitForOverviewScene(map, () => true, { timeoutMs: 200 })
  assert.equal(ready, true)
  assert.deepEqual(map.jumps, [])
})
