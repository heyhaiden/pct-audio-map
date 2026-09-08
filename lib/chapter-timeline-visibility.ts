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

export function getChapterTimelineMotionStyle(hidden: boolean, peekHandle = false) {
  // The handle sits on the connected tab's right edge — not the column's, which
  // is as wide as its widest tab — so a tuck travels exactly that far to land
  // the handle on the viewport edge. Same variable the handle's `left` uses.
  const peekOffset = "calc(var(--pct-handle-offset) * -1)"

  return {
    // CSS `translate` (not `transform`) — Tailwind v4 owns `transform` and
    // ignores inline transform on this node.
    translate: hidden ? (peekHandle ? peekOffset : "calc(-100% - 8px)") : "0%",
    // Peek keeps opacity so the attached handle stays visible at the edge.
    opacity: hidden && !peekHandle ? 0 : 1,
    // Same length both ways — the rail withdraws at the cadence it returns at.
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

/** The peek handle is gone while a recording card owns the bottom of the view. */
export function shouldShowChapterDrawerHandle(hasSelectedAudioMarker: boolean) {
  return !hasSelectedAudioMarker
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
