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
    if (!map) return

    const addMarkers = async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default

        // Clear existing markers
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []

        // Filter markers for current chapter
        const chapterMarkers = audioMarkers.filter((marker) => marker.chapter === currentChapter)

        // Add markers to map
        chapterMarkers.forEach((audioMarker) => {
          // Create custom marker element
          const markerElement = document.createElement("div")
          markerElement.className = `audio-marker ${audioMarker.featured ? "featured" : ""}`
          markerElement.innerHTML = `
            <div class="marker-pulse ${audioMarker.featured ? "featured" : ""}"></div>
            <div class="marker-icon">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            </div>
          `

          // Add styles
          markerElement.style.cssText = `
            position: relative;
            width: 32px;
            height: 32px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          `

          const pulseElement = markerElement.querySelector(".marker-pulse") as HTMLElement
          if (pulseElement) {
            pulseElement.style.cssText = `
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: ${audioMarker.featured ? "#ff6b9d" : "#ff6b9d80"};
              opacity: 0.3;
              animation: pulse 2s infinite;
            `
          }

          const iconElement = markerElement.querySelector(".marker-icon") as HTMLElement
          if (iconElement) {
            iconElement.style.cssText = `
              position: relative;
              z-index: 1;
              width: 24px;
              height: 24px;
              background: ${audioMarker.featured ? "#ff6b9d" : "#ff6b9d80"};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 2px solid white;
            `
          }

          // Add CSS animation
          if (!document.querySelector("#audio-marker-styles")) {
            const style = document.createElement("style")
            style.id = "audio-marker-styles"
            style.textContent = `
              @keyframes pulse {
                0% { transform: scale(1); opacity: 0.3; }
                50% { transform: scale(1.5); opacity: 0.1; }
                100% { transform: scale(1); opacity: 0.3; }
              }
            `
            document.head.appendChild(style)
          }

          // Create marker
          const marker = new mapboxgl.Marker({ element: markerElement })
            .setLngLat(audioMarker.coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
                <div class="text-sm">
                  <div class="font-semibold">${audioMarker.name}</div>
                  <div class="text-gray-600 text-xs mt-1">${audioMarker.elevation.toLocaleString()} ft</div>
                  <div class="text-xs mt-2 text-blue-600">Click to play audio</div>
                </div>
              `),
            )
            .addTo(map)

          // Add click handler
          markerElement.addEventListener("click", () => {
            onMarkerClick(audioMarker)
          })

          markersRef.current.push(marker)
        })
      } catch (error) {
        console.error("Failed to add audio markers:", error)
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
