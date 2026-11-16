import assert from "node:assert/strict"
import test from "node:test"
import { createTrailLoopEngine } from "../lib/trail-loop-engine.ts"

function installFakeAudio() {
  const log = { constructed: 0, resumed: 0 }
  class FakeAudioContext {
    state: AudioContextState = "suspended"
    currentTime = 0
    destination = {}
    constructor() {
      log.constructed += 1
    }
    createGain() {
      return { gain: { setValueAtTime() {}, value: 1 }, connect() {}, disconnect() {} }
    }
    resume() {
      log.resumed += 1
      this.state = "running"
      return Promise.resolve()
    }
    suspend() {
      this.state = "suspended"
      return Promise.resolve()
    }
    close() {
      return Promise.resolve()
    }
  }
  const globals = globalThis as unknown as { window?: unknown }
  const previous = globals.window
  globals.window = { AudioContext: FakeAudioContext }
  return {
    log,
    restore: () => {
      globals.window = previous
    },
  }
}

test("warm builds the audio graph once and leaves it suspended", async () => {
  const fake = installFakeAudio()
  try {
    const engine = createTrailLoopEngine()
    assert.equal(engine.contextState(), null)

    engine.warm()
    engine.warm()
    assert.equal(fake.log.constructed, 1)
    assert.equal(fake.log.resumed, 0)
    assert.equal(engine.contextState(), "suspended")

    // The tap reuses the warmed context and only resumes it.
    await engine.unlock()
    assert.equal(fake.log.constructed, 1)
    assert.equal(fake.log.resumed, 1)
    assert.equal(engine.contextState(), "running")
  } finally {
    fake.restore()
  }
})

test("unlock without a prior warm still builds and starts the graph", async () => {
  const fake = installFakeAudio()
  try {
    const engine = createTrailLoopEngine()
    await engine.unlock()
    assert.equal(fake.log.constructed, 1)
    assert.equal(fake.log.resumed, 1)
    assert.equal(engine.contextState(), "running")
  } finally {
    fake.restore()
  }
})

test("warm is a no-op where Web Audio is missing", () => {
  const globals = globalThis as unknown as { window?: unknown }
  const previous = globals.window
  globals.window = {}
  try {
    const engine = createTrailLoopEngine()
    assert.doesNotThrow(() => engine.warm())
    assert.equal(engine.contextState(), null)
  } finally {
    globals.window = previous
  }
})
