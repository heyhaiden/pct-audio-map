import assert from "node:assert/strict"
import test from "node:test"
import { bufferHasEnergy, chooseLoopFormat } from "../lib/audio-format-probe.ts"

test("chooseLoopFormat uses Opus when the probe buffer has energy", () => {
  assert.equal(chooseLoopFormat({ opusHasEnergy: true }), "opus")
})

test("chooseLoopFormat falls back to MP3 when Opus is silent or missing", () => {
  assert.equal(chooseLoopFormat({ opusHasEnergy: false }), "mp3")
  assert.equal(chooseLoopFormat({ opusHasEnergy: null }), "mp3")
})

test("bufferHasEnergy ignores near-zero noise", () => {
  const quiet = new Float32Array(2048)
  const loud = new Float32Array(2048)
  loud[100] = 0.2
  assert.equal(bufferHasEnergy(quiet), false)
  assert.equal(bufferHasEnergy(loud), true)
})
