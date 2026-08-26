export function resolveChapterOverlayOpacity(
  opacity: number,
  dismissedChapter: number | null,
  chapterIndex: number,
): number {
  return dismissedChapter === chapterIndex ? 0 : opacity
}
