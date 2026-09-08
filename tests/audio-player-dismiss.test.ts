import assert from "node:assert/strict"
import test from "node:test"

test("a click on the audio card does not dismiss it", async () => {
  const dismiss = await import("../lib/audio-player-dismiss.ts").catch(() => null)
  assert.ok(dismiss, "expected shared audio-player dismiss helper")

  const inside = { id: "inside" }
  const card = { contains: (node: unknown) => node === inside }

  assert.equal(dismiss.isOutsideAudioCard(inside, card), false)
})

test("a click outside the audio card dismisses it like the close button", async () => {
  const dismiss = await import("../lib/audio-player-dismiss.ts")

  const inside = { id: "inside" }
  const outside = { id: "outside" }
  const card = { contains: (node: unknown) => node === inside }

  assert.equal(dismiss.isOutsideAudioCard(outside, card), true)
  assert.equal(dismiss.isOutsideAudioCard(null, card), true)
})

test("mute and hamburger clicks keep the audio card in focused view", async () => {
  const dismiss = await import("../lib/audio-player-dismiss.ts")

  const inside = { id: "inside" }
  const card = { contains: (node: unknown) => node === inside }
  const mute = {
    id: "mute",
    closest: (selector: string) => (selector === "[data-keep-audio-focus]" ? mute : null),
  }
  const hamburger = {
    id: "menu",
    closest: (selector: string) => (selector === "[data-keep-audio-focus]" ? hamburger : null),
  }
  const map = {
    id: "map",
    closest: () => null,
  }

  assert.equal(dismiss.shouldDismissAudioCard(mute, card), false)
  assert.equal(dismiss.shouldDismissAudioCard(hamburger, card), false)
  assert.equal(dismiss.shouldDismissAudioCard(map, card), true)
  assert.equal(dismiss.shouldDismissAudioCard(inside, card), false)
})
