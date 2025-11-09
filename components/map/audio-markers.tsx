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

        // Add ALL markers to map (not filtered by chapter)
        audioMarkers.forEach((audioMarker) => {
          // Create SVG element safely using DOM methods
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('width', '24')
          svg.setAttribute('height', '24')
          svg.setAttribute('viewBox', '0 0 24 24')

          // Background circle
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          circle.setAttribute('cx', '12')
          circle.setAttribute('cy', '12')
          circle.setAttribute('r', '11')
          circle.setAttribute('fill', '#ff6b9d')
          circle.setAttribute('stroke', '#ffffff')
          circle.setAttribute('stroke-width', '1')
          circle.setAttribute('stroke-opacity', '0.75')

          // Speaker icon path
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          path.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z')
          path.setAttribute('fill', '#ffffff')
          path.setAttribute('fill-opacity', '0.75')

          svg.appendChild(circle)
          svg.appendChild(path)

          // Create container element - no opacity
          const el = document.createElement('div')
          el.className = 'audio-marker'
          el.style.width = '24px'
          el.style.height = '24px'
          el.style.cursor = 'pointer'
          el.appendChild(svg)

          // Create the marker with proper options
          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
          })
            .setLngLat(audioMarker.coordinates as [number, number])
            .addTo(map)

          // Add click handler
          el.addEventListener('click', (e) => {
            e.stopPropagation()
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
  }, [map, onMarkerClick])

  return null
}
