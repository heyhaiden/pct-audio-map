import assert from "node:assert/strict"
import test from "node:test"
import {
  getChapterTimelineMotionStyle,
  resolveChapterTimelineCollapsed,
  shouldHideChapterTimeline,
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

  assert.equal(style.transform, "translate3d(calc(-100% - 8px), 0, 0)")
  assert.equal(style.opacity, 0)
  assert.equal(style.transitionDuration, "700ms")
  assert.match(style.transitionTimingFunction, /^cubic-bezier\(/)
})
