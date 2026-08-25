const CHAPTER_TIMELINE_EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)"

export function shouldHideChapterTimeline(hasSelectedAudioMarker: boolean, isExitCameraBusy: boolean) {
  return hasSelectedAudioMarker || isExitCameraBusy
}

export function getChapterTimelineMotionStyle(hidden: boolean) {
  return {
    transform: hidden ? "translate3d(calc(-100% - 8px), 0, 0)" : "translate3d(0, 0, 0)",
    opacity: hidden ? 0 : 1,
    transitionDuration: hidden ? "700ms" : "760ms",
    transitionTimingFunction: CHAPTER_TIMELINE_EASE_OUT,
  }
}
