import assert from "node:assert/strict"
import test from "node:test"
import {
  CHAPTER_DRAWER_HANDLE_INDEX,
  getChapterDrawerHandleIndex,
  getChapterDrawerHandleTopPercent,
  getChapterTimelineMotionStyle,
  resolveChapterTimelineCollapsed,
  shouldHideChapterTimeline,
  shouldShowChapterDrawerHandle,
} from "../lib/chapter-timeline-visibility.ts"

test("the chapter rail slides away while an audio marker is selected", () => {
  assert.equal(shouldHideChapterTimeline(true, false), true)
})

test("the chapter rail stays hidden through the exit camera animation", () => {
  assert.equal(shouldHideChapterTimeline(false, true), true)
})

test("the chapter rail returns after audio and the exit animation finish", () => {
  assert.equal(shouldHideChapterTimeline(false, false), false)
})

test("chapter tabs stay hidden until the SoCal overlay is dismissed", () => {
  assert.equal(shouldHideChapterTimeline(false, false, true), true)
  assert.equal(shouldHideChapterTimeline(false, false, false), false)
})

test("audio open collapses the drawer", () => {
  assert.equal(resolveChapterTimelineCollapsed(true, false, false), true)
})

test("user can expand the drawer even while audio is selected", () => {
  assert.equal(resolveChapterTimelineCollapsed(true, true, false), false)
})

test("user can collapse the drawer while exploring", () => {
  assert.equal(resolveChapterTimelineCollapsed(false, false, true), true)
})

test("timeline motion keeps a shared duration and easing", () => {
  const style = getChapterTimelineMotionStyle()

  assert.equal(style.transitionDuration, "760ms")
  assert.match(style.transitionTimingFunction, /^cubic-bezier\(/)
  assert.equal("translate" in style, false)
  assert.equal("opacity" in style, false)
})

test("the drawer handle is pinned to chapter 3, above the audio card", () => {
  assert.equal(CHAPTER_DRAWER_HANDLE_INDEX, 2)
  assert.equal(getChapterDrawerHandleIndex(5), 2)
  assert.equal(getChapterDrawerHandleIndex(2), 1)
})

test("the drawer handle sits on chapter 3 (last chapter at the top)", () => {
  assert.equal(getChapterDrawerHandleTopPercent(2, 5), 50)
})

test("the drawer handle is hidden while the audio card is open", () => {
  assert.equal(shouldShowChapterDrawerHandle(true), false)
  assert.equal(shouldShowChapterDrawerHandle(false), true)
})

test("the drawer handle is hidden until the SoCal overlay is dismissed", () => {
  assert.equal(shouldShowChapterDrawerHandle(false, true), false)
  assert.equal(shouldShowChapterDrawerHandle(false, false), true)
})
