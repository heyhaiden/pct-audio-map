"use client"

import { useEffect, useRef } from "react"
import { audioMarkers } from "@/data/audio-markers"
import type { AudioMarker } from "@/types/map"

interface AudioMarkersProps {
  map: any
  currentChapter: string
  onMarkerClick: (marker: AudioMarker) => void
  activeMarkerId?: string | null
}

export function AudioMarkers({ map, currentChapter, onMarkerClick, activeMarkerId }: AudioMarkersProps) {
  const markersRef = useRef<Map<string, any>>(new Map())

  useEffect(() => {
    if (!map || !window.mapboxgl) return

    const addMarkers = () => {
      try {
        // Clear existing markers
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current.clear()

        // Filter markers for current chapter
        const chapterMarkers = audioMarkers.filter((marker) => marker.chapter === currentChapter)

        chapterMarkers.forEach((audioMarker) => {
          const isActive = activeMarkerId === audioMarker.id
          const marker = new window.mapboxgl.Marker({
            color: "#ff6b9d",
            scale: isActive ? 1.2 : 1.0,
          })
            .setLngLat(audioMarker.coordinates)
            .setPopup(
              new window.mapboxgl.Popup({
                offset: 25,
                closeButton: false,
                className: "audio-marker-popup",
              }).setHTML(`
                <div class="text-sm p-2">
                  <div class="font-semibold text-white">${audioMarker.name}</div>
                  <div class="text-gray-300 text-xs mt-1">${audioMarker.elevation.toLocaleString()} ft</div>
                  <div class="text-xs mt-2 text-[#ff6b9d]">Click to play audio</div>
                </div>
              `),
            )
            .addTo(map)

          // Add click handler to the marker element
          const markerElement = marker.getElement()
          markerElement.style.cursor = "pointer"
          markerElement.style.zIndex = isActive ? "1001" : "1000"
          markerElement.style.pointerEvents = "auto"
          markerElement.style.transition = "transform 0.3s ease-in-out"
          markerElement.addEventListener("click", (e) => {
            e.stopPropagation()
            console.log("[v0] Audio marker clicked:", audioMarker.name)
            onMarkerClick(audioMarker)
          })

          markersRef.current.set(audioMarker.id, marker)
        })
      } catch (error) {
        console.error("[v0] Failed to add audio markers:", error)
      }
    }

    addMarkers()

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current.clear()
    }
  }, [map, currentChapter, onMarkerClick, activeMarkerId])

  return null
}
