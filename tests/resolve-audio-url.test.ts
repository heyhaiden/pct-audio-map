import assert from "node:assert/strict"
import test from "node:test"

test("resolveAudioUrl prefixes blob CDN base for relative paths", async () => {
  const previous = process.env.NEXT_PUBLIC_AUDIO_CDN_URL
  process.env.NEXT_PUBLIC_AUDIO_CDN_URL = "https://store.public.blob.vercel-storage.com"

  const { resolveAudioUrl } = await import("../lib/resolve-audio-url.ts")

  assert.equal(
    resolveAudioUrl("/audio/campo.mp3"),
    "https://store.public.blob.vercel-storage.com/audio/campo.mp3",
  )
  assert.equal(
    resolveAudioUrl("audio/campo.mp3"),
    "https://store.public.blob.vercel-storage.com/audio/campo.mp3",
  )

  process.env.NEXT_PUBLIC_AUDIO_CDN_URL = previous
})

test("resolveAudioUrl returns absolute URLs unchanged", async () => {
  const { resolveAudioUrl } = await import("../lib/resolve-audio-url.ts")

  assert.equal(
    resolveAudioUrl("https://cdn.example.com/track.mp3"),
    "https://cdn.example.com/track.mp3",
  )
})

test("resolveAudioUrl falls back to same-origin path when CDN is unset", async () => {
  const previous = process.env.NEXT_PUBLIC_AUDIO_CDN_URL
  delete process.env.NEXT_PUBLIC_AUDIO_CDN_URL

  const { resolveAudioUrl } = await import("../lib/resolve-audio-url.ts")

  assert.equal(resolveAudioUrl("/audio/campo.mp3"), "/audio/campo.mp3")

  process.env.NEXT_PUBLIC_AUDIO_CDN_URL = previous
})
