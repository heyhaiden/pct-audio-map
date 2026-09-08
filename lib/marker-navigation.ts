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
