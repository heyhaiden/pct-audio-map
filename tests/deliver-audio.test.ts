import assert from "node:assert/strict"
import test from "node:test"
import {
  blobPathname,
  deliveryBasename,
  needsTranscode,
  publicAudioUrl,
  sourceBlobPathname,
} from "../scripts/lib/deliver-audio.ts"

test("WAV and other uncompressed sources deliver as mp3", () => {
  assert.equal(needsTranscode("3-1.wav"), true)
  assert.equal(deliveryBasename("3-1.wav"), "3-1.mp3")
  assert.equal(blobPathname("content/audio/3-1.wav"), "audio/3-1.mp3")
  assert.equal(publicAudioUrl("3-1.wav"), "/audio/3-1.mp3")
  assert.equal(sourceBlobPathname("3-1.wav"), "audio/3-1.wav")
})

test("already-compressed files keep their filename", () => {
  assert.equal(needsTranscode("campo.mp3"), false)
  assert.equal(deliveryBasename("campo.mp3"), "campo.mp3")
  assert.equal(publicAudioUrl("campo.mp3"), "/audio/campo.mp3")
  assert.equal(sourceBlobPathname("campo.mp3"), null)
})
