import assert from "node:assert/strict"
import test from "node:test"
import { PCT_TOTAL_MILES } from "../lib/railing-camera.ts"
import {
  CHAPTER_GATE_LANDING_MILES,
  clampMilesAtChapterGate,
  scrollTopForMiles,
} from "../lib/chapter-scroll-gate.ts"

test("a northbound jump stops just inside the next chapter", () => {
  const result = clampMilesAtChapterGate(700, 740)
  assert.equal(result.hitGate, true)
  assert.equal(result.miles, 703 + CHAPTER_GATE_LANDING_MILES)
})

test("motion inside a chapter is not gated", () => {
  const result = clampMilesAtChapterGate(710, 800)
  assert.equal(result.hitGate, false)
  assert.equal(result.miles, 800)
})

test("southbound motion is not gated", () => {
  const result = clampMilesAtChapterGate(800, 690)
  assert.equal(result.hitGate, false)
  assert.equal(result.miles, 690)
})

test("NorCal gate catches a coast from the Sierra", () => {
  const result = clampMilesAtChapterGate(1140, 1220)
  assert.equal(result.hitGate, true)
  assert.equal(result.miles, 1158 + CHAPTER_GATE_LANDING_MILES)
})

test("gate scrollY lands in the next chapter after integer rounding", () => {
  const landing = 703 + CHAPTER_GATE_LANDING_MILES
  for (const max of [50_000, 87_584, 100_000, 200_000]) {
    const top = scrollTopForMiles(landing, max, { atGate: true })
    assert.ok((top / max) * PCT_TOTAL_MILES >= 703, `still in SoCal at max=${max}`)
  }
})
