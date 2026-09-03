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

test("audio open collapses the drawer", () => {
  assert.equal(resolveChapterTimelineCollapsed(true, false, false), true)
})

test("user can expand the drawer even while audio is selected", () => {
  assert.equal(resolveChapterTimelineCollapsed(true, true, false), false)
})

test("user can collapse the drawer while exploring", () => {
  assert.equal(resolveChapterTimelineCollapsed(false, false, true), true)
})

test("the audio transition eases the rail fully off-canvas", () => {
  const style = getChapterTimelineMotionStyle(true)

  assert.equal(style.translate, "calc(-100% - 8px)")
  assert.equal(style.opacity, 0)
  assert.equal(style.transitionDuration, "760ms")
  assert.match(style.transitionTimingFunction, /^cubic-bezier\(/)
})

test("tucking the rail keeps the handle attached as the tabs slide out", () => {
  const style = getChapterTimelineMotionStyle(true, true)

  assert.equal(style.translate, "calc(var(--pct-handle-offset) * -1)")
  assert.equal(style.opacity, 1)
  assert.equal(style.transitionDuration, "760ms")
})

test("the open rail uses percent translate so the tuck can interpolate", () => {
  assert.equal(getChapterTimelineMotionStyle(false).translate, "0%")
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
