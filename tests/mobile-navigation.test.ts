import assert from "node:assert/strict"
import test from "node:test"

test("compact chapter labels stay short enough for constrained screens", async () => {
  const navigation = await import("../lib/mobile-navigation.ts").catch(() => null)
  assert.ok(navigation, "expected shared mobile navigation helpers")

  const labels = [
    navigation.getCompactChapterLabel("Southern California"),
    navigation.getCompactChapterLabel("Sierra Nevada"),
    navigation.getCompactChapterLabel("Northern California"),
    navigation.getCompactChapterLabel("Oregon"),
    navigation.getCompactChapterLabel("Washington"),
  ]

  assert.deepEqual(labels, ["SOCAL", "SIERRA", "NORCAL", "OREGON", "WASH"])
  assert.ok(labels.every((label) => label.length <= 6))
})

test("mobile overlays use the same ordered destinations", async () => {
  const navigation = await import("../lib/mobile-navigation.ts").catch(() => null)
  assert.ok(navigation, "expected shared mobile navigation helpers")

  assert.deepEqual(navigation.MOBILE_NAV_ITEMS, [
    { id: "home", href: "/", label: "Home" },
    { id: "library", href: "/library", label: "Audio library" },
    { id: "about", href: "/about", label: "About" },
    { id: "resources", href: "/resources", label: "Resources" },
  ])
})

test("the site menu hides Home only while you are already there", async () => {
  const navigation = await import("../lib/mobile-navigation.ts")

  assert.deepEqual(
    navigation.visibleMobileNavItems("map").map((item) => item.id),
    ["home", "library", "about", "resources"],
  )
  assert.deepEqual(
    navigation.visibleMobileNavItems("site", "home").map((item) => item.id),
    ["library", "about", "resources"],
  )
  assert.deepEqual(
    navigation.visibleMobileNavItems("site", "about").map((item) => item.id),
    ["home", "library", "about", "resources"],
  )
})
