import assert from "node:assert/strict"
import test from "node:test"
import {
  SPLASH_CREEP_CEILING,
  SPLASH_MAX_READY_TO_UNLOCK_MS,
  SPLASH_UNLOCK_SETTLE_MS,
  splashCreepProgress,
  splashFillDurationMs,
} from "../lib/splash-button-fill.ts"

test("the bar chases load progress at one steady pace", () => {
  assert.equal(splashFillDurationMs({ ready: false, from: 0.1 }), 320)
  assert.equal(splashFillDurationMs({ ready: false, from: 0.9 }), 320)
})

test("a ready sweep from a mostly empty bar takes longer than from a nearly full one", () => {
  const far = splashFillDurationMs({ ready: true, from: 0.3 })
  const near = splashFillDurationMs({ ready: true, from: 0.8 })
  assert.ok(far > near)
  assert.ok(near >= 150, "still long enough to see")
})

test("a ready map never waits more than 400 ms on the button", () => {
  const worst = splashFillDurationMs({ ready: true, from: 0.04 }) + SPLASH_UNLOCK_SETTLE_MS
  assert.equal(worst, SPLASH_MAX_READY_TO_UNLOCK_MS)
  assert.ok(worst <= 400)
})

test("the creep keeps the bar moving through a long map load", () => {
  // Fast 4G desktop lab: Mapbox "load" at about 14.8 s, unlock at about 16.4 s.
  let previous = 0
  for (let ms = 1000; ms <= 16000; ms += 1000) {
    const value = splashCreepProgress(ms)
    assert.ok(value > previous, `still advancing at ${ms} ms`)
    previous = value
  }
  assert.ok(splashCreepProgress(2000) > 0.15, "past the old 18% stall within 2 s")
  assert.ok(splashCreepProgress(15000) > 0.6, "well past a fifth by the time the map loads")
})

test("only a ready map fills the bar", () => {
  assert.ok(splashCreepProgress(10 * 60 * 1000) <= SPLASH_CREEP_CEILING)
  assert.ok(SPLASH_CREEP_CEILING < 1)
  assert.equal(splashCreepProgress(0), 0)
  assert.equal(splashCreepProgress(Number.NaN), 0)
})
