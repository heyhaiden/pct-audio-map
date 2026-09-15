import assert from "node:assert/strict"
import test from "node:test"
import {
  crossfadeVolumes,
  fadeOutVolume,
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
