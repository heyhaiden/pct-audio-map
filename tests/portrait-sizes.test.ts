import assert from "node:assert/strict"
import test from "node:test"
import { portraitDrawScale, portraitSizes } from "../lib/portrait-sizes.ts"

test("a landscape photo cropped into the 3:4 frame is drawn twice the frame width", () => {
  // Anna's photo: 1024x682.
  assert.ok(Math.abs(portraitDrawScale(1024, 682) - 2.002) < 0.01)
  assert.equal(portraitSizes(1024, 682), "(min-width: 768px) 30.03rem, 35.04rem")
})

test("a 3:4 portrait fills the frame and only the 110% zoom adds width", () => {
  // Haiden's photo: 768x1024.
  assert.ok(Math.abs(portraitDrawScale(768, 1024) - 1.1) < 1e-9)
  assert.equal(portraitSizes(768, 1024), "(min-width: 768px) 16.5rem, 19.25rem")
})

test("bad dimensions fall back to the frame width", () => {
  assert.equal(portraitDrawScale(0, 0), 1)
  assert.equal(portraitDrawScale(Number.NaN, 100), 1)
})
