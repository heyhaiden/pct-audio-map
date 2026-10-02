import assert from "node:assert/strict"
import test from "node:test"
import {
  CHAPTER_TABS_MIN_RAIL_HEIGHT,
  CHAPTER_TABS_MIN_RAIL_WIDTH,
  CHAPTER_TABS_MOBILE_MAX_WIDTH,
  chapterTabsIsMobileRail,
  chapterTabsShouldDock,
  isLandscapePhone,
  resolveViewportLayout,
  resolveIntroCameraKind,
  shouldRetargetWaitingOverview,
  shouldUseDesktopChapterOverlay,
  shouldUseLandscapeIntroCamera,
  shouldUseMobileIntroCamera,
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

test("a phone rotated on its side is a landscape dock, not a mobile rail", () => {
  assert.equal(isLandscapePhone(844, 390), true)
  assert.equal(isLandscapePhone(667, 375), true)
  assert.equal(isLandscapePhone(390, 844), false)
  assert.equal(isLandscapePhone(1280, 800), false)
})

test("viewport layout treats landscape phones like short desktop", () => {
  assert.equal(resolveViewportLayout(844, 390), "dock")
  assert.equal(resolveViewportLayout(667, 375), "dock")
  assert.equal(resolveViewportLayout(1280, 600), "dock")
  assert.equal(resolveViewportLayout(390, 844), "mobile-rail")
  assert.equal(resolveViewportLayout(1280, 800), "rail")
})

test("landscape phones use the desktop intro camera, portrait phones do not", () => {
  assert.equal(shouldUseMobileIntroCamera(390, 844), true)
  assert.equal(shouldUseMobileIntroCamera(844, 390), false)
  assert.equal(shouldUseMobileIntroCamera(667, 375), false)
  assert.equal(shouldUseMobileIntroCamera(1280, 800), false)
})

test("landscape phones get a dedicated crane zoom, short desktop does not", () => {
  assert.equal(shouldUseLandscapeIntroCamera(844, 390), true)
  assert.equal(shouldUseLandscapeIntroCamera(667, 375), true)
  assert.equal(shouldUseLandscapeIntroCamera(390, 844), false)
  assert.equal(shouldUseLandscapeIntroCamera(1280, 600), false)
  assert.equal(shouldUseLandscapeIntroCamera(1280, 800), false)
})

test("landscape phones use the compact mobile chapter overlay", () => {
  assert.equal(shouldUseDesktopChapterOverlay(844, 390), false)
  assert.equal(shouldUseDesktopChapterOverlay(667, 375), false)
  assert.equal(shouldUseDesktopChapterOverlay(390, 844), false)
  assert.equal(shouldUseDesktopChapterOverlay(1280, 600), true)
  assert.equal(shouldUseDesktopChapterOverlay(1280, 800), true)
})

test("intro camera kind follows portrait, landscape phone, and desktop", () => {
  assert.equal(resolveIntroCameraKind(390, 844), "portrait")
  assert.equal(resolveIntroCameraKind(844, 390), "landscape")
  assert.equal(resolveIntroCameraKind(1280, 800), "desktop")
})

test("waiting splash retargets the overview when the phone rotates", () => {
  assert.equal(shouldRetargetWaitingOverview("waiting", false, "portrait", "landscape"), true)
  assert.equal(shouldRetargetWaitingOverview("waiting", false, "landscape", "portrait"), true)
  assert.equal(shouldRetargetWaitingOverview("waiting", false, "landscape", "landscape"), false)
  assert.equal(shouldRetargetWaitingOverview("overview", false, "portrait", "landscape"), false)
  assert.equal(shouldRetargetWaitingOverview("waiting", true, "portrait", "landscape"), false)
})
