import { audioMarkers } from "@/data/audio-markers"

/** Chapters past the WIP cutoff — no pins yet. */
const HIDDEN_CHAPTERS = new Set(["washington-cascades"])

export const AUDIO_MARKER_SOURCE_ID = "pct-audio-markers"
export const AUDIO_MARKER_LAYER_ID = "pct-audio-markers-pin"
export const AUDIO_MARKER_IMAGE_ID = "pct-audio-pin"

/** Classic Mapbox-style teardrop pin as an ImageData for symbol layers. */
export function createPinImage(size = 64): { width: number; height: number; data: Uint8Array } {
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
  ctx.fillStyle = "#ed5a43"
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

/** Pins along the whole trail. Washington stays empty until that chapter has recordings. */
export function chapterCollection(_chapter?: string) {
  const features = audioMarkers
    .filter((marker) => !HIDDEN_CHAPTERS.has(marker.chapter) && marker.coordinates?.length === 2)
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

/**
 * Create the marker image, source and layer.
 *
 * Called from the map's own `load` handler alongside the trail layers — not
 * from a React effect. The effect version had to wait for `isStyleLoaded()`,
 * which the tile prefetcher keeps false almost continuously (a preloadOnly
 * jumpTo every 120ms), so the install silently never happened and no pins
 * appeared. Here the style is guaranteed ready and there is nothing to poll.
 *
 * Idempotent, so it can be replayed on `style.load` (a style reload drops every
 * image, source and layer we added).
 */
export function installAudioMarkerLayer(map: any, initialChapter = "southern-california"): void {
  if (!map || map._removed) return

  if (!map.hasImage?.(AUDIO_MARKER_IMAGE_ID)) {
    map.addImage(AUDIO_MARKER_IMAGE_ID, createPinImage(64), { pixelRatio: 2 })
  }

  if (!map.getSource(AUDIO_MARKER_SOURCE_ID)) {
    // Seeded with the opening chapter rather than empty, so the trailhead warm
    // has real pins to place before the splash lifts. AudioMarkers swaps in the
    // live chapter as soon as it mounts.
    map.addSource(AUDIO_MARKER_SOURCE_ID, {
      type: "geojson",
      data: chapterCollection(initialChapter),
      // Deliberately left at the default maxzoom. Capping it low (tried 4) makes
      // symbols place against a coarse tile with no usable DEM under it, so
      // their terrain elevation resolves to ~0: the pins sink to sea level,
      // end up inside the mountain, and render translucent where the slope
      // occludes them. Symbols need real per-zoom tiles to sit on the ground.
    })
  }

  if (!map.getLayer(AUDIO_MARKER_LAYER_ID)) {
    map.addLayer({
      id: AUDIO_MARKER_LAYER_ID,
      type: "symbol",
      source: AUDIO_MARKER_SOURCE_ID,
      layout: {
        "icon-image": AUDIO_MARKER_IMAGE_ID,
        "icon-size": 0.9,
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-pitch-alignment": "viewport",
        "icon-rotation-alignment": "viewport",
      },
      paint: {
        "icon-opacity": 1,
        // Self-lit, so scene lighting can't dim the pins as the camera moves.
        "icon-emissive-strength": 1,
      },
    })
  }
}
