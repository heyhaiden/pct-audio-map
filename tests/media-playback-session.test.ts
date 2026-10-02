import assert from "node:assert/strict"
import test from "node:test"

test("armMediaPlaybackSession sets playback before any AudioContext would exist", async () => {
  const session = { type: "ambient" }
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, "audioSession")
  Object.defineProperty(globalThis.navigator, "audioSession", {
    configurable: true,
    get: () => session,
  })

  const { armMediaPlaybackSession, mediaPlaybackSessionType, hasPlaybackAudioSession } =
    await import("../lib/media-playback-session.ts")

  assert.equal(hasPlaybackAudioSession(), true)
  const typeAtArm = armMediaPlaybackSession()
  assert.equal(typeAtArm, "playback")
  assert.equal(mediaPlaybackSessionType(), "playback")
  assert.equal(session.type, "playback")

  if (original) Object.defineProperty(globalThis.navigator, "audioSession", original)
  else delete (globalThis.navigator as { audioSession?: unknown }).audioSession
})

test("shouldLockPlaybackWithHtmlAudio follows the phone UA", async () => {
  const { shouldLockPlaybackWithHtmlAudio } = await import("../lib/media-playback-session.ts")

  const originalUa = Object.getOwnPropertyDescriptor(globalThis.navigator, "userAgent")
  Object.defineProperty(globalThis.navigator, "userAgent", {
    configurable: true,
    get: () =>
      "Mozilla/5.0 (Linux; Android 14; Pixel) Chrome/129.0.0.0 Mobile Safari/537.36",
  })
  assert.equal(shouldLockPlaybackWithHtmlAudio(), true)

  Object.defineProperty(globalThis.navigator, "userAgent", {
    configurable: true,
    get: () =>
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.0.0 Mobile/15E148 Safari/604.1",
  })
  assert.equal(shouldLockPlaybackWithHtmlAudio(), true)

  Object.defineProperty(globalThis.navigator, "userAgent", {
    configurable: true,
    get: () =>
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/129.0.0.0 Safari/537.36",
  })
  assert.equal(shouldLockPlaybackWithHtmlAudio(), false)

  if (originalUa) Object.defineProperty(globalThis.navigator, "userAgent", originalUa)
})
