import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { audioMarkers } from "../data/audio-markers.ts"
import { clipIdFromAudioUrl } from "../lib/audio-clip-id.ts"
import {
  clipPlaybackGain,
  loopWindow,
  normalizeManifest,
} from "../lib/audio-loop-manifest.ts"

const GAIN_BAKED = ["1-4", "2-2", "3-1", "3-9", "4-4"] as const

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

test("the real Anna manifest covers every marker clip id", () => {
  const raw = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/audio-manifest.json"), "utf8"),
  ) as { clips: Record<string, { samples?: number; gainDb?: number }> }
  const manifest = normalizeManifest(raw)

  const missing = audioMarkers.flatMap((marker) => {
    if (!marker.audioUrl) return []
    const id = clipIdFromAudioUrl(marker.audioUrl)
    if (!id) return [`${marker.id} has no clip id`]
    if (!manifest[id]) return [`${marker.id} (${id})`]
    return []
  })
  assert.deepEqual(missing, [])
  assert.equal(Object.keys(manifest).length, 74)
  assert.ok(manifest["1-33"])

  for (const id of GAIN_BAKED) {
    assert.equal(raw.clips[id]?.gainDb, -1)
    assert.equal(manifest[id]?.gainDb, undefined)
    assert.ok((manifest[id]?.sampleCount ?? 0) > 0)
  }
})

test("playbackGainDb becomes a linear gain, capped at maxGainDb", () => {
  const manifest = normalizeManifest({
    clips: {
      "1-1": { samples: 48000, playbackGainDb: 6, maxGainDb: 15 },
      "1-4": { samples: 48000, playbackGainDb: 8, maxGainDb: 1.5 },
      "3-1": { samples: 48000 },
    },
  })
  assert.ok(Math.abs(clipPlaybackGain(manifest, "1-1") - 10 ** (6 / 20)) < 1e-9)
  assert.ok(Math.abs(clipPlaybackGain(manifest, "1-4") - 10 ** (1.5 / 20)) < 1e-9)
  assert.equal(clipPlaybackGain(manifest, "3-1"), 1)
  assert.equal(clipPlaybackGain(manifest, "missing"), 1)
  assert.equal(clipPlaybackGain(null, "1-1"), 1)
})

test("shipped manifest gives every clip a boost no higher than its ceiling", () => {
  const raw = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../public/audio/manifest.json"), "utf8"))
  const manifest = normalizeManifest(raw)
  for (const [id, clip] of Object.entries(raw.clips as Record<string, { playbackGainDb: number; maxGainDb: number }>)) {
    const appliedDb = 20 * Math.log10(clipPlaybackGain(manifest, id))
    assert.ok(appliedDb <= clip.maxGainDb + 1e-9, `${id} exceeds its ceiling`)
  }
})
