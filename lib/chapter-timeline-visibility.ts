const CHAPTER_TIMELINE_EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)"

/** Auto-collapse while an audio node owns the view, the exit camera is mid-flight,
 *  or the opening SoCal overlay is still up. */
export function shouldHideChapterTimeline(
  hasSelectedAudioMarker: boolean,
  isExitCameraBusy: boolean,
  openingOverlayPending = false,
) {
  return hasSelectedAudioMarker || isExitCameraBusy || openingOverlayPending
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

/** Duration + easing only. Axis of travel lives on `[data-hidden]` in CSS so
 *  the dock query can flip X ↔ Y without JS. */
export function getChapterTimelineMotionStyle() {
  return {
    transitionDuration: "760ms",
    transitionTimingFunction: CHAPTER_TIMELINE_EASE_OUT,
  }
}

/** Chapter 3 (0-based). Pins the open/close handle above the audio card. */
export const CHAPTER_DRAWER_HANDLE_INDEX = 2

export function getChapterDrawerHandleIndex(chapterCount: number) {
  if (chapterCount <= 0) return 0
  return Math.min(CHAPTER_DRAWER_HANDLE_INDEX, chapterCount - 1)
}

/** The peek handle is gone while a recording card owns the view, or until SoCal is cleared. */
export function shouldShowChapterDrawerHandle(
  hasSelectedAudioMarker: boolean,
  openingOverlayPending = false,
) {
  return !hasSelectedAudioMarker && !openingOverlayPending
}

/**
 * Vertical center of the connected tab, as a percentage of the rail.
 * Tabs are equal-height flex items with the last chapter at the top.
 */
export function getChapterDrawerHandleTopPercent(
  connectedIndex: number,
  chapterCount: number,
) {
  if (chapterCount <= 0) return 50
  const clamped = Math.min(Math.max(connectedIndex, 0), chapterCount - 1)
  const fromTop = chapterCount - 1 - clamped
  return ((fromTop + 0.5) / chapterCount) * 100
}
