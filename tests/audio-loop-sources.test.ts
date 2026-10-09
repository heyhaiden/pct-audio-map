import assert from "node:assert/strict"
import test from "node:test"
import { resolveLoopSources } from "../lib/audio-loop-sources.ts"

test("resolveLoopSources prefers same-origin Opus and Blob MP3", () => {
  const sources = resolveLoopSources("/audio/1-1.mp3", {
    blobBase: "https://store.public.blob.vercel-storage.com",
  })
  assert.deepEqual(sources, {
    clipId: "1-1",
    opusUrl: "/audio/opus/1-1.opus",
    mp3Url: "https://store.public.blob.vercel-storage.com/audio/1-1.mp3",
  })
})

test("resolveLoopSources keeps MP3 same-origin when Blob base is missing", () => {
  const sources = resolveLoopSources("/audio/2-2.mp3", {})
  assert.equal(sources?.opusUrl, "/audio/opus/2-2.opus")
  assert.equal(sources?.mp3Url, "/audio/2-2.mp3")
})

test("resolveLoopSources returns null for an unparseable path", () => {
  assert.equal(resolveLoopSources("", {}), null)
})
