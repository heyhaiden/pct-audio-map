import assert from "node:assert/strict"
import test from "node:test"
import {
  applyTouchDelta,
  shouldStartInertia,
  stepInertiaVelocity,
} from "../lib/inverted-touch-scroll.ts"

test("finger down advances the trail", () => {
  const result = applyTouchDelta({ deltaY: 24, deltaMs: 16 })
  assert.equal(result.scrollDelta, 24)
  assert.ok(result.velocity > 0)
})

test("finger up scrolls back", () => {
  const result = applyTouchDelta({ deltaY: -18, deltaMs: 16 })
  assert.equal(result.scrollDelta, -18)
  assert.ok(result.velocity < 0)
})

test("inertia starts for both forward and reverse velocity", () => {
  assert.equal(shouldStartInertia(0.08), true)
  assert.equal(shouldStartInertia(-0.08), true)
  assert.equal(shouldStartInertia(0.01), false)
})

test("inertia decays toward zero", () => {
  let v = 1
  for (let i = 0; i < 200; i++) {
    v = stepInertiaVelocity(v)
    if (v === 0) break
  }
  assert.equal(v, 0)
})
