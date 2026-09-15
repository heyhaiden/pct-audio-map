import assert from "node:assert/strict"
import test from "node:test"
import {
  isResumeTrailPosition,
  resolveResumeFrameProgress,
  resumeProgressFromMiles,
  trailCoordinateAtProgress,
} from "../lib/map-resume.ts"

test("resume is only a mid-trail position", () => {
  assert.equal(isResumeTrailPosition(undefined), false)
  assert.equal(isResumeTrailPosition(0), false)
  assert.equal(isResumeTrailPosition(1), false)
  assert.equal(isResumeTrailPosition(1800), true)
})

test("progress maps miles onto the 0–1 rail", () => {
  assert.equal(resumeProgressFromMiles(0), 0)
  assert.equal(resumeProgressFromMiles(1325), 0.5)
  assert.equal(resumeProgressFromMiles(2650), 1)
})

test("the camera stays on the saved mile until scroll restoration lands", () => {
  const saved = resumeProgressFromMiles(1800)
  const held = resolveResumeFrameProgress({
    scrollProgress: 0,
    resumeProgress: saved,
    locked: true,
  })
  assert.equal(held.locked, true)
  assert.equal(held.progress, saved)

  const landed = resolveResumeFrameProgress({
    scrollProgress: saved,
    resumeProgress: saved,
    locked: true,
  })
  assert.equal(landed.locked, false)
  assert.equal(landed.progress, saved)
})

test("unlocking follows scroll once the lock is released", () => {
  const unlocked = resolveResumeFrameProgress({
    scrollProgress: 0.1,
    resumeProgress: 0.7,
    locked: false,
  })
  assert.equal(unlocked.locked, false)
  assert.equal(unlocked.progress, 0.1)
})

test("trailCoordinateAtProgress picks a vertex along the line", () => {
  const coords = [
    [-116, 32],
    [-118, 36],
    [-121, 45],
  ]
  assert.deepEqual(trailCoordinateAtProgress(coords, 0), [-116, 32])
  assert.deepEqual(trailCoordinateAtProgress(coords, 1), [-121, 45])
  assert.equal(trailCoordinateAtProgress([], 0.5), null)
})
