"use client"

import { useEffect, useRef } from "react"
import { audioMarkers } from "@/data/audio-markers"
import {
  AUDIO_MARKER_LAYER_ID,
  AUDIO_MARKER_SOURCE_ID,
  chapterCollection,
  markerIconSize,
} from "@/lib/audio-marker-layer"
import type { AudioMarker } from "@/types/map"

interface AudioMarkersProps {
  map: any
  onMarkerClick: (marker: AudioMarker) => void
  /** Same-turn as the tap: start media playback before fetch/decode. */
  onMarkerPrime?: (marker: AudioMarker) => void
  activeMarkerId?: string | null
  /** When false, canvas clicks never open a pin (opening crane / SoCal overlay). */
  enabled?: boolean
}

/**
 * Feeds the marker layer and handles pin clicks.
 *
 * The source and layer themselves are created by `installAudioMarkerLayer()`
 * inside the map's `load` handler in pct-map.tsx, next to the trail layers.
 * This component keeps the full trail pin set on the source — no install
 * retries, no style-loaded polling.
 */
export function AudioMarkers({
  map,
  onMarkerClick,
  onMarkerPrime,
  activeMarkerId = null,
  enabled = true,
}: AudioMarkersProps) {
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick
  const onMarkerPrimeRef = useRef(onMarkerPrime)
  onMarkerPrimeRef.current = onMarkerPrime
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    if (!map || map._removed) return

    const applyMarkerData = () => {
      try {
        map.getSource?.(AUDIO_MARKER_SOURCE_ID)?.setData(chapterCollection())
        map.setLayoutProperty?.(
          AUDIO_MARKER_LAYER_ID,
          "icon-size",
          markerIconSize(activeMarkerId),
        )
      } catch {
        /* map may already be gone */
      }
    }

    applyMarkerData()
    // A style reload rebuilds the layer empty; refill it once that lands.
    map.on("style.load", applyMarkerData)
    return () => map.off?.("style.load", applyMarkerData)
  }, [map, activeMarkerId])

  useEffect(() => {
    if (!map || map._removed) return

    const canvas: HTMLCanvasElement | null = map.getCanvas?.() ?? null
    if (!canvas) return

    const markerAtEvent = (event: MouseEvent | PointerEvent) => {
      if (!enabledRef.current) return null
      if (!map.getLayer?.(AUDIO_MARKER_LAYER_ID)) return null

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

      const id = features[0]?.properties?.id as string | undefined
      if (!id) return null
      return audioMarkers.find((m) => m.id === id) ?? null
    }

    // Pointerdown is the play gesture (Chrome/iOS). Click still opens the card.
    const onCanvasPointerDown = (event: PointerEvent) => {
      const marker = markerAtEvent(event)
      if (marker) onMarkerPrimeRef.current?.(marker)
    }

    const onCanvasClick = (event: MouseEvent) => {
      const marker = markerAtEvent(event)
      if (marker) onMarkerClickRef.current(marker)
    }

    canvas.addEventListener("pointerdown", onCanvasPointerDown)
    canvas.addEventListener("click", onCanvasClick)
    return () => {
      canvas.removeEventListener("pointerdown", onCanvasPointerDown)
      canvas.removeEventListener("click", onCanvasClick)
    }
  }, [map])

  return null
}
