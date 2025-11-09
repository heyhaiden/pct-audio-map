"use client"

import { useEffect, useRef } from "react"
import { audioMarkers } from "@/data/audio-markers"
import type { AudioMarker } from "@/types/map"

interface AudioMarkersProps {
  map: any
  currentChapter: string
  onMarkerClick: (marker: AudioMarker) => void
}

export function AudioMarkers({ map, currentChapter, onMarkerClick }: AudioMarkersProps) {
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (!map || !window.mapboxgl) return

    console.log("[v0] Adding audio markers for chapter:", currentChapter)

    const addMarkers = () => {
      try {
        // Clear existing markers
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []

        // Filter markers for current chapter
        const chapterMarkers = audioMarkers.filter((marker) => marker.chapter === currentChapter)
        console.log("[v0] Found audio markers:", chapterMarkers.length)

        chapterMarkers.forEach((audioMarker) => {
          // Create marker using the same approach as waypoint markers
          const marker = new window.mapboxgl.Marker({
            color: audioMarker.featured ? "#ff6b9d" : "#ff6b9dcc",
            scale: audioMarker.featured ? 1.2 : 0.9,
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
          markerElement.addEventListener("click", (e) => {
            e.stopPropagation()
            console.log("[v0] Audio marker clicked:", audioMarker.name)
            onMarkerClick(audioMarker)
          })

          markersRef.current.push(marker)
        })

        console.log("[v0] Audio markers added successfully:", markersRef.current.length)
      } catch (error) {
        console.error("[v0] Failed to add audio markers:", error)
      }
    }

    addMarkers()

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }
  }, [map, currentChapter, onMarkerClick])

  return null
}
