import { overlayLandingMilesForChapter } from "@/lib/chapter-scroll-gate"
import type { AudioMarker } from "@/types/map"

export function hasMarkerAudio(marker: Pick<AudioMarker, "audioUrl">) {
  return Boolean(marker.audioUrl)
}

export function adjacentPlayable(
  markers: AudioMarker[],
  activeChapters: Set<string>,
  selectedId: string,
): { previous: AudioMarker | null; next: AudioMarker | null } {
  const selectedIndex = markers.findIndex((marker) => marker.id === selectedId)
  if (selectedIndex === -1) return { previous: null, next: null }

  const isPlayable = (marker: AudioMarker) =>
    activeChapters.has(marker.chapter) && hasMarkerAudio(marker)

  const previous =
    markers
      .slice(0, selectedIndex)
      .reverse()
      .find(isPlayable) ?? null
  const next = markers.slice(selectedIndex + 1).find(isPlayable) ?? null

  return { previous, next }
}

/** Next would skip the upcoming chapter overlay — land on it instead. */
export function chapterGateAfterMarker(
  markers: AudioMarker[],
  activeChapters: Set<string>,
  selectedId: string,
): number | null {
  const selected = markers.find((marker) => marker.id === selectedId)
  if (!selected) return null
  const next = adjacentPlayable(markers, activeChapters, selectedId).next
  if (!next || selected.chapter === next.chapter) return null
  return overlayLandingMilesForChapter(next.chapter)
}

/** Pin Next was heading to — open it after the gated overlay is dismissed. */
export function nodeQueuedAfterChapterGate(
  markers: AudioMarker[],
  activeChapters: Set<string>,
  selectedId: string,
): AudioMarker | null {
  if (chapterGateAfterMarker(markers, activeChapters, selectedId) == null) return null
  return adjacentPlayable(markers, activeChapters, selectedId).next
}

/** Last produced recording: Next leaves the player and opens the content-edge notice. */
export function canAdvanceToWip(
  markers: AudioMarker[],
  activeChapters: Set<string>,
  selectedId: string,
) {
  const selected = markers.find((marker) => marker.id === selectedId)
  if (!selected) return false
  if (!activeChapters.has(selected.chapter) || !hasMarkerAudio(selected)) return false
  return adjacentPlayable(markers, activeChapters, selectedId).next == null
}
