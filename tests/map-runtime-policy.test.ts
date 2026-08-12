import assert from "node:assert/strict"
import test from "node:test"
import {
  getMapPrefetchPolicy,
  isFatalMapboxError,
  isMapAlive,
} from "../lib/map-runtime-policy.ts"

test("mobile prefetch avoids the route-wide GPU warm", () => {
  assert.deepEqual(getMapPrefetchPolicy(true), {
    warmFullRoute: false,
    trailheadSamples: 4,
    windowAheadMiles: 24,
    windowSamples: 3,
  })
})

test("desktop keeps the larger prefetch window", () => {
  assert.deepEqual(getMapPrefetchPolicy(false), {
    warmFullRoute: true,
    trailheadSamples: 10,
    windowAheadMiles: 45,
    windowSamples: 8,
  })
})

test("a recoverable tile error is not fatal after map load", () => {
  assert.equal(
    isFatalMapboxError(
      {
        error: { message: "Failed to load tile" },
        sourceId: "mapbox-terrain-rgb",
      },
      true,
    ),
    false,
  )
})

test("a source tile 404 is recoverable while the map is starting", () => {
  assert.equal(
    isFatalMapboxError(
      {
        error: { status: 404, message: "Tile not found" },
        sourceId: "mapbox-terrain-rgb",
      },
      false,
    ),
    false,
  )
})

test("authentication and missing-style failures are fatal before map load", () => {
  assert.equal(isFatalMapboxError({ error: { status: 401, message: "Unauthorized" } }, false), true)
  assert.equal(isFatalMapboxError({ error: { status: 404, message: "Style not found" } }, false), true)
})

test("a removed or style-less map is not alive for preload", () => {
  assert.equal(isMapAlive(null), false)
  assert.equal(isMapAlive({ _removed: true, style: {} }), false)
  assert.equal(isMapAlive({ _removed: false }), false)
  assert.equal(isMapAlive({ _removed: false, style: {} }), true)
})
