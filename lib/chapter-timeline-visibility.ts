const CHAPTER_TIMELINE_EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)"

/** Auto-collapse while an audio node owns the view (or exit camera is mid-flight). */
export function shouldHideChapterTimeline(
  hasSelectedAudioMarker: boolean,
  isExitCameraBusy: boolean,
) {
  return hasSelectedAudioMarker || isExitCameraBusy
}

/**
 * Final drawer state: user can peek the rail open even while audio is selected,
 * and can tuck it while exploring. Audio open forces collapse unless the user
 * explicitly re-expands.
 */
export function resolveChapterTimelineCollapsed(
  autoHide: boolean,
  userExpanded: boolean,
  userCollapsed: boolean,
) {
  if (userExpanded) return false
  if (autoHide || userCollapsed) return true
  return false
}

export function getChapterTimelineMotionStyle(hidden: boolean) {
  return {
    transform: hidden ? "translate3d(calc(-100% - 8px), 0, 0)" : "translate3d(0, 0, 0)",
    opacity: hidden ? 0 : 1,
    transitionDuration: hidden ? "700ms" : "760ms",
    transitionTimingFunction: CHAPTER_TIMELINE_EASE_OUT,
  }
}
