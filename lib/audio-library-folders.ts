import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"
import { audioMarkers } from "@/data/audio-markers"
import { pctSegments } from "@/data/pct-segments"
import { getMarkerMile } from "@/lib/marker-miles"
import type { AudioMarker } from "@/types/map"

export type AudioLibraryFolder = {
  id: string
  title: string
  markers: AudioMarker[]
}

/** Group playable recordings by the same mile boundaries shown on the map. */
export function buildAudioLibraryFolders(): AudioLibraryFolder[] {
  return pctSegments.flatMap((chapter, index) => {
    const range = CHAPTER_MILE_RANGES[index]
    if (!range) return []

    const markers = audioMarkers.filter((marker) => {
      const mile = getMarkerMile(marker.id)
      if (mile == null) return marker.chapter === chapter.id
      return mile >= range.start && mile < range.end
    })

    return markers.length ? [{ id: chapter.id, title: chapter.title, markers }] : []
  })
}
