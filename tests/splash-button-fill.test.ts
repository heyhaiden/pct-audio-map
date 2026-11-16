import assert from "node:assert/strict"
import test from "node:test"
import {
  SPLASH_MAX_READY_TO_UNLOCK_MS,
  SPLASH_UNLOCK_SETTLE_MS,
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
