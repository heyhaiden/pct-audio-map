import assert from "node:assert/strict"
import test from "node:test"

test("a soft readiness timeout does not mark tiles as warmed", async () => {
  const readinessModule = await import("../lib/trailhead-readiness.ts").catch(() => null)
  assert.ok(readinessModule, "expected trailhead readiness policy")

  let ready = 0
  let warmed = 0
  const notify = readinessModule.createTrailheadNotifier({
    onReady: () => ready++,
    onWarm: () => warmed++,
  })

  notify(false)

  assert.equal(ready, 1)
  assert.equal(warmed, 0)
})

test("completed tile warming marks the trailhead as warmed", async () => {
  const readinessModule = await import("../lib/trailhead-readiness.ts").catch(() => null)
  assert.ok(readinessModule, "expected trailhead readiness policy")

  let ready = 0
  let warmed = 0
  const notify = readinessModule.createTrailheadNotifier({
    onReady: () => ready++,
    onWarm: () => warmed++,
  })

  notify(true)

  assert.equal(ready, 1)
  assert.equal(warmed, 1)
})

test("warming that finishes after the soft timeout is still cached", async () => {
  const readinessModule = await import("../lib/trailhead-readiness.ts")
  let ready = 0
  let warmed = 0
  const notify = readinessModule.createTrailheadNotifier({
    onReady: () => ready++,
    onWarm: () => warmed++,
  })

  notify(false)
  notify(true)

  assert.equal(ready, 1)
  assert.equal(warmed, 1)
})
