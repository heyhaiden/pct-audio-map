"use client"

import { useEffect, useRef } from "react"
import { audioMarkers } from "@/data/audio-markers"
import type { AudioMarker } from "@/types/map"

/** Chapters past the WIP cutoff — no pins yet. */
const HIDDEN_CHAPTERS = new Set(["oregon-cascades", "washington-cascades"])

const SOURCE_ID = "pct-audio-markers"
const LAYER_ID = "pct-audio-markers-pin"
const IMAGE_ID = "pct-audio-pin"

interface AudioMarkersProps {
  map: any
  currentChapter: string
  onMarkerClick: (marker: AudioMarker) => void
}

/** Classic Mapbox-style teardrop pin as an ImageData for symbol layers. */
function createPinImage(size = 64): { width: number; height: number; data: Uint8Array } {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  const cx = size / 2
  const r = size * 0.28
  const tipY = size * 0.92
  const headCy = size * 0.38

  ctx.clearRect(0, 0, size, size)

  ctx.beginPath()
  ctx.ellipse(cx, tipY - 2, size * 0.14, size * 0.05, 0, 0, Math.PI * 2)
  ctx.fillStyle = "rgba(0,0,0,0.28)"
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, headCy, r, Math.PI * 0.85, Math.PI * 0.15, false)
  ctx.quadraticCurveTo(cx + r * 0.15, headCy + r * 1.35, cx, tipY)
  ctx.quadraticCurveTo(
    cx - r * 0.15,
    headCy + r * 1.35,
    cx - r * Math.cos(Math.PI * 0.15),
    headCy + r * Math.sin(Math.PI * 0.15),
  )
  ctx.closePath()
  ctx.fillStyle = "#ff6b9d"
  ctx.fill()
  ctx.lineWidth = size * 0.05
  ctx.strokeStyle = "#ffffff"
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, headCy, r * 0.38, 0, Math.PI * 2)
  ctx.fillStyle = "#ffffff"
  ctx.fill()

  const imageData = ctx.getImageData(0, 0, size, size)
  return {
    width: size,
    height: size,
    data: new Uint8Array(imageData.data.buffer),
  }
}

function chapterCollection(chapter: string) {
  const features = HIDDEN_CHAPTERS.has(chapter)
    ? []
    : audioMarkers
        .filter((marker) => marker.chapter === chapter)
        .map((marker) => ({
          type: "Feature" as const,
          properties: {
            id: marker.id,
            name: marker.name,
            elevation: marker.elevation,
          },
          geometry: {
            type: "Point" as const,
            coordinates: marker.coordinates,
          },
        }))

  return { type: "FeatureCollection" as const, features }
}

export function AudioMarkers({ map, currentChapter, onMarkerClick }: AudioMarkersProps) {
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  useEffect(() => {
    if (!map || map._removed || !window.mapboxgl) return

    let cancelled = false
    let retryId: ReturnType<typeof setTimeout> | null = null
    let canvas: HTMLCanvasElement | null = null

    const teardown = () => {
      try {
        if (canvas) {
          canvas.removeEventListener("click", onCanvasClick)
        }
        if (map.getLayer?.(LAYER_ID)) map.removeLayer(LAYER_ID)
        if (map.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch {
        /* map may already be gone */
      }
    }

    const onCanvasClick = (e: MouseEvent) => {
      if (!canvas || !map.getLayer?.(LAYER_ID)) return
      const rect = canvas.getBoundingClientRect()
      // Slightly padded hit box so pins stay easy to tap without a second layer
      const point = new window.mapboxgl.Point(e.clientX - rect.left, e.clientY - rect.top)
      const features = map.queryRenderedFeatures(
        [
          [point.x - 14, point.y - 14],
          [point.x + 14, point.y + 14],
        ],
        { layers: [LAYER_ID] },
      )
      const id = features[0]?.properties?.id
      if (!id) return
      const marker = audioMarkers.find((m) => m.id === id)
      if (marker) onMarkerClickRef.current(marker)
    }

    const install = (): boolean => {
      if (cancelled || map._removed) return false
      try {
        if (typeof map.isStyleLoaded === "function" && !map.isStyleLoaded()) return false
        canvas = map.getCanvas?.()
        if (!canvas) return false

        if (!map.hasImage?.(IMAGE_ID)) {
          map.addImage(IMAGE_ID, createPinImage(64), { pixelRatio: 2 })
        }

        const data = chapterCollection(currentChapter)

        if (map.getSource(SOURCE_ID)) {
          map.getSource(SOURCE_ID).setData(data)
        } else {
          map.addSource(SOURCE_ID, { type: "geojson", data })
          map.addLayer({
            id: LAYER_ID,
            type: "symbol",
            source: SOURCE_ID,
            layout: {
              "icon-image": IMAGE_ID,
              "icon-size": 0.9,
              "icon-anchor": "bottom",
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-pitch-alignment": "viewport",
              "icon-rotation-alignment": "viewport",
            },
          })
        }

        // Click-only — no per-frame mousemove / popup work
        canvas.removeEventListener("click", onCanvasClick)
        canvas.addEventListener("click", onCanvasClick)
        return true
      } catch (error) {
        console.error("[v0] Failed to install audio marker layers:", error)
        return false
      }
    }

    const tryInstall = (attempt = 0) => {
      if (cancelled) return
      if (install()) return
      if (attempt < 30) {
        retryId = setTimeout(() => tryInstall(attempt + 1), 200)
      }
    }

    tryInstall()

    return () => {
      cancelled = true
      if (retryId) clearTimeout(retryId)
      teardown()
    }
  }, [map, currentChapter])

  return null
}
