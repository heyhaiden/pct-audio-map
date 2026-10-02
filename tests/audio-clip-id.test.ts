import assert from "node:assert/strict"
import test from "node:test"
import { clipIdFromAudioUrl } from "../lib/audio-clip-id.ts"

test("clipIdFromAudioUrl reads the filename stem", () => {
  assert.equal(clipIdFromAudioUrl("/audio/1-1.mp3"), "1-1")
  assert.equal(clipIdFromAudioUrl("/audio/opus/4-6.opus"), "4-6")
  assert.equal(clipIdFromAudioUrl("audio/3-8.m4a?v=2"), "3-8")
})

test("clipIdFromAudioUrl rejects empty or extensionless paths", () => {
  assert.equal(clipIdFromAudioUrl(""), null)
  assert.equal(clipIdFromAudioUrl("/audio/"), null)
  assert.equal(clipIdFromAudioUrl("https://cdn.example.com/audio/2-2.mp3"), "2-2")
})
