import type { CameraPosition } from "@/types/map"

// Generate smooth camera path between two positions
export function generateCameraPath(start: CameraPosition, end: CameraPosition, steps = 10): CameraPosition[] {
  const path: CameraPosition[] = []

  for (let i = 0; i <= steps; i++) {
    const t = i / steps

    // Use smooth interpolation for natural camera movement
    const smoothT = t * t * (3 - 2 * t) // Smoothstep function

    // Handle longitude wrapping
    let lngDiff = end.center[0] - start.center[0]
    if (Math.abs(lngDiff) > 180) {
      lngDiff = lngDiff > 0 ? lngDiff - 360 : lngDiff + 360
    }

    const position: CameraPosition = {
      center: [start.center[0] + lngDiff * smoothT, start.center[1] + (end.center[1] - start.center[1]) * smoothT],
      zoom: start.zoom + (end.zoom - start.zoom) * smoothT,
      pitch: start.pitch + (end.pitch - start.pitch) * smoothT,
      bearing: start.bearing + (end.bearing - start.bearing) * smoothT,
      duration: Math.floor(end.duration / steps),
    }

    path.push(position)
  }

  return path
}

// Create cinematic camera movements that follow the trail's natural curves
export function createCinematicPath(waypoints: [number, number][]): CameraPosition[] {
  const cinematicPositions: CameraPosition[] = []

  waypoints.forEach((waypoint, index) => {
    const [lng, lat] = waypoint

    // Calculate dynamic camera angles based on trail direction
    let bearing = 0
    if (index < waypoints.length - 1) {
      const nextWaypoint = waypoints[index + 1]
      const deltaLng = nextWaypoint[0] - lng
      const deltaLat = nextWaypoint[1] - lat
      bearing = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI
    }

    // Vary pitch and zoom for dramatic effect
    const pitch = 45 + Math.sin(index * 0.5) * 25 // Vary between 20-70 degrees
    const zoom = 7 + Math.cos(index * 0.3) * 2 // Vary between 5-9

    cinematicPositions.push({
      center: [lng, lat],
      zoom,
      pitch,
      bearing,
      duration: 3000 + Math.random() * 2000, // Vary duration for pacing
    })
  })

  return cinematicPositions
}

// Calculate optimal camera position to frame a geographic area
export function calculateFramingPosition(bounds: [[number, number], [number, number]], padding = 50): CameraPosition {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds

  const centerLng = (minLng + maxLng) / 2
  const centerLat = (minLat + maxLat) / 2

  // Calculate zoom level to fit bounds
  const lngDiff = maxLng - minLng
  const latDiff = maxLat - minLat
  const maxDiff = Math.max(lngDiff, latDiff)

  // Approximate zoom calculation (simplified)
  const zoom = Math.max(1, Math.min(18, Math.log2(360 / maxDiff) - 1))

  return {
    center: [centerLng, centerLat],
    zoom,
    pitch: 45,
    bearing: 0,
    duration: 2000,
  }
}
