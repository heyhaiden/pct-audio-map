import assert from "node:assert/strict"
import test from "node:test"
import {
  CHAPTER_TABS_MIN_RAIL_HEIGHT,
  CHAPTER_TABS_MIN_RAIL_WIDTH,
  CHAPTER_TABS_MOBILE_MAX_WIDTH,
  chapterTabsIsMobileRail,
  chapterTabsShouldDock,
} from "../lib/chapter-tab-layout.ts"

test("rail breakpoints match the design system", () => {
  assert.equal(CHAPTER_TABS_MOBILE_MAX_WIDTH, 767)
  assert.equal(CHAPTER_TABS_MIN_RAIL_WIDTH, 768)
  assert.equal(CHAPTER_TABS_MIN_RAIL_HEIGHT, 640)
})

test("phone portrait stays on the mobile rail (does not dock)", () => {
  assert.equal(chapterTabsShouldDock(390, 844), false)
  assert.equal(chapterTabsIsMobileRail(390, 844), true)
})

test("phone landscape docks because height is short", () => {
  assert.equal(chapterTabsShouldDock(844, 390), true)
  assert.equal(chapterTabsIsMobileRail(844, 390), false)
})

test("comfortable desktop stays on the left rail", () => {
  assert.equal(chapterTabsShouldDock(1280, 800), false)
  assert.equal(chapterTabsIsMobileRail(1280, 800), false)
})

test("short desktop window docks", () => {
  assert.equal(chapterTabsShouldDock(1280, 600), true)
})

test("exact rail height minimum stays on the rail", () => {
  assert.equal(chapterTabsShouldDock(1280, 640), false)
})

test("narrow width alone does not dock when height is enough", () => {
  assert.equal(chapterTabsShouldDock(390, 800), false)
  assert.equal(chapterTabsIsMobileRail(390, 800), true)
})
