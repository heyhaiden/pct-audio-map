import assert from "node:assert/strict"
import test from "node:test"
import {
  crossfadeVolumes,
  endingFadeVolume,
  fadeOutVolume,
  rampVolume,
  resolveOutgoingDeck,
} from "../lib/audio-crossfade.ts"

test("crossfadeVolumes is equal-power at the midpoint", () => {
  const { incoming, outgoing } = crossfadeVolumes(0.5, 1, 1)
  assert.ok(Math.abs(incoming - outgoing) < 0.001)
})

test("crossfadeVolumes starts silent incoming and full outgoing", () => {
  const { incoming, outgoing } = crossfadeVolumes(0, 0.7, 0.7)
  assert.equal(incoming, 0)
  assert.equal(outgoing, 0.7)
})

test("crossfadeVolumes ends at full incoming and silent outgoing", () => {
  const { incoming, outgoing } = crossfadeVolumes(1, 0.7, 0.7)
  assert.ok(Math.abs(incoming - 0.7) < 0.001)
  assert.ok(Math.abs(outgoing) < 0.001)
})

test("fadeOutVolume eases to silence at the end", () => {
  assert.ok(Math.abs(fadeOutVolume(1, 0.7)) < 0.001)
  assert.ok(fadeOutVolume(0, 0.7) === 0.7)
})

test("endingFadeVolume stays out of the way until the tail", () => {
  assert.equal(endingFadeVolume(10, 60, 2000), null)
  assert.equal(endingFadeVolume(58, 60, 2000), 1)
  assert.ok(Math.abs(endingFadeVolume(60, 60, 2000) ?? 1) < 0.001)
  const mid = endingFadeVolume(59, 60, 2000) ?? 0
  assert.ok(mid > 0.5 && mid < 1)
})

test("resolvePlaybackDuration prefers a finite element duration", async () => {
  const { resolvePlaybackDuration } = await import("../lib/audio-crossfade.ts")
  assert.equal(resolvePlaybackDuration(14.2, 14), 14.2)
  assert.equal(resolvePlaybackDuration(Number.POSITIVE_INFINITY, 14), 14)
  assert.equal(resolvePlaybackDuration(Number.NaN, 14), 14)
  assert.equal(resolvePlaybackDuration(0, 14), 14)
  assert.equal(resolvePlaybackDuration(Number.POSITIVE_INFINITY, 0), 0)
})

test("rampVolume holds the start and lands on the target", () => {
  assert.equal(rampVolume(0, 0.2, 1), 0.2)
  assert.ok(Math.abs(rampVolume(1, 0.2, 1) - 1) < 0.001)
  assert.ok(rampVolume(0.5, 0, 1) > 0.5)
})

test("resolveOutgoingDeck prefers whichever deck is currently audible", () => {
  const active = {
    src: "https://example.com/a.mp3",
    paused: false,
    volume: 0.6,
  } as HTMLAudioElement
  const other = {
    src: "https://example.com/b.mp3",
    paused: false,
    volume: 0.4,
  } as HTMLAudioElement

  const resolved = resolveOutgoingDeck([other, active], 1, 0.7)
  assert.equal(resolved.index, 0)
  assert.equal(resolved.startVolume, 0.4)
})
