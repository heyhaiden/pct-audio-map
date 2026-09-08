export function resolveChapterOverlayOpacity(
  opacity: number,
  dismissedChapter: number | null,
  chapterIndex: number,
): number {
  return dismissedChapter === chapterIndex ? 0 : opacity
}

/** Pins stay inert through the opening crane shot until SoCal is dismissed. */
export function areOpeningMapPinsLocked({
  isResuming,
  introComplete,
  isSoCalOverlayVisible,
}: {
  isResuming: boolean
  introComplete: boolean
  isSoCalOverlayVisible: boolean
}): boolean {
  if (isResuming) return false
  return !introComplete || isSoCalOverlayVisible
}
