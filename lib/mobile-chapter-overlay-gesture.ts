/** Max pointer travel (px) still counted as a tap. */
const CHAPTER_OVERLAY_TAP_SLOP = 8

/** Dismiss only on tap — any meaningful drag is ignored. */
export function shouldDismissChapterOverlay(startY: number, endY: number) {
  return Math.abs(startY - endY) <= CHAPTER_OVERLAY_TAP_SLOP
}
