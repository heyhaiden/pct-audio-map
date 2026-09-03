"use client"

import { useEffect, useRef } from "react"
import { audioMarkers } from "@/data/audio-markers"
import { AUDIO_MARKER_LAYER_ID, AUDIO_MARKER_SOURCE_ID, chapterCollection } from "@/lib/audio-marker-layer"
import type { AudioMarker } from "@/types/map"

interface AudioMarkersProps {
  map: any
  currentChapter: string
  onMarkerClick: (marker: AudioMarker) => void
}

/**
 * Feeds the marker layer and handles pin clicks.
 *
 * The source and layer themselves are created by `installAudioMarkerLayer()`
 * inside the map's `load` handler in pct-map.tsx, next to the trail layers.
 * This component only swaps the GeoJSON when the chapter changes — no install
 * retries, no style-loaded polling.
 */
export function AudioMarkers({ map, currentChapter, onMarkerClick }: AudioMarkersProps) {
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  useEffect(() => {
    if (!map || map._removed) return

    const applyChapterData = () => {
      try {
        map.getSource?.(AUDIO_MARKER_SOURCE_ID)?.setData(chapterCollection(currentChapter))
      } catch {
        /* map may already be gone */
      }
    }

    applyChapterData()
    // A style reload rebuilds the layer empty; refill it once that lands.
    map.on("style.load", applyChapterData)
    return () => map.off?.("style.load", applyChapterData)
  }, [map, currentChapter])

  useEffect(() => {
    if (!map || map._removed) return

    const canvas: HTMLCanvasElement | null = map.getCanvas?.() ?? null
    if (!canvas) return

    const onCanvasClick = (event: MouseEvent) => {
      if (!map.getLayer?.(AUDIO_MARKER_LAYER_ID)) return

      const rect = canvas.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      // Padded hit box so pins stay easy to tap without a second layer.
      const features = map.queryRenderedFeatures(
        [
          [px - 14, py - 14],
          [px + 14, py + 14],
        ],
        { layers: [AUDIO_MARKER_LAYER_ID] },
      )

      const id = features[0]?.properties?.id
      if (!id) return
      const marker = audioMarkers.find((m) => m.id === id)
      if (marker) onMarkerClickRef.current(marker)
    }

    canvas.addEventListener("click", onCanvasClick)
    return () => canvas.removeEventListener("click", onCanvasClick)
  }, [map])

  return null
}
