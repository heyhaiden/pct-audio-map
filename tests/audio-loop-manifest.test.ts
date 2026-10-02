import assert from "node:assert/strict"
import test from "node:test"
import {
  loopWindow,
  normalizeManifest,
} from "../lib/audio-loop-manifest.ts"

test("normalizeManifest reads sample counts and ignores gainDb", () => {
  const manifest = normalizeManifest({
    clips: {
      "1-1": { sampleCount: 48000, gainDb: -1 },
      "1-4": { samples: 96000, aacPadding: 1024, mp3Delay: 576, mp3Padding: 384 },
    },
  })
  assert.equal(manifest["1-1"]?.sampleCount, 48000)
  assert.equal(manifest["1-1"]?.gainDb, undefined)
  assert.equal(manifest["1-4"]?.mp3Delay, 576)
  assert.equal(manifest["1-4"]?.mp3Padding, 384)
})

test("loopWindow for Opus uses the full buffer", () => {
  assert.deepEqual(loopWindow({ sampleCount: 48000 }, "opus", 48000), {
    start: 0,
    end: 1,
  })
})

test("loopWindow for MP3 skips delay and padding", () => {
  const window = loopWindow(
    { sampleCount: 48000, mp3Delay: 576, mp3Padding: 384 },
    "mp3",
    48000,
  )
  assert.equal(window.start, 576 / 48000)
  assert.equal(window.end, (48000 - 384) / 48000)
})
