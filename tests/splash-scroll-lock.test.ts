import assert from "node:assert/strict"
import test from "node:test"

test("the trail scroll spacer is omitted while the splash screen is up", async () => {
  const splash = await import("../lib/splash-scroll-lock.ts").catch(() => null)
  assert.ok(splash, "expected shared splash scroll-lock helpers")

  assert.equal(splash.shouldRenderTrailScrollSpacer(true), false)
  assert.equal(splash.shouldRenderTrailScrollSpacer(false), true)
})

test("splash lock class is present so CSS can freeze html scrolling", async () => {
  const splash = await import("../lib/splash-scroll-lock.ts")
  assert.equal(splash.SPLASH_SCROLL_LOCK_CLASS, "pct-splash-lock")
})
