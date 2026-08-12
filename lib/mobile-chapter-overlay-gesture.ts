export const CHAPTER_OVERLAY_SWIPE_DISTANCE = 48
export const CHAPTER_OVERLAY_TAP_SLOP = 8

export function shouldDismissChapterOverlay(startY: number, endY: number) {
  const movement = startY - endY
  return Math.abs(movement) <= CHAPTER_OVERLAY_TAP_SLOP || movement >= CHAPTER_OVERLAY_SWIPE_DISTANCE
}
