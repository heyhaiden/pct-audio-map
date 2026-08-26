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

  assert.deepEqual(labels, ["SOCAL", "SIER", "NORCA", "ORE", "WASH"])
  assert.ok(labels.every((label) => label.length <= 5))
})

test("mobile overlays use the same ordered destinations", async () => {
  const navigation = await import("../lib/mobile-navigation.ts").catch(() => null)
  assert.ok(navigation, "expected shared mobile navigation helpers")

  assert.deepEqual(navigation.MOBILE_NAV_ITEMS, [
    { id: "home", href: "/", label: "Home" },
    { id: "library", href: "/library", label: "Audio Library" },
    { id: "about", href: "/about", label: "About" },
    { id: "resources", href: "/resources", label: "Resources" },
  ])
})
