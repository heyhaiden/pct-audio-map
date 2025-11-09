"use client"

import { useCallback, useRef, useEffect } from "react"
import * as turf from "@turf/turf"
import type { LineString } from "geojson"

interface FreeCameraPathOptions {
  map: any
  trailGeometry: LineString
  cameraAltitude?: number // Altitude in meters
  smoothingWindow?: number // Number of previous positions to average for smoothing
}

export function useFreeCameraPath({ 
  map, 
  trailGeometry, 
  cameraAltitude = 150000, // Default to 150km for true birds-eye view
  smoothingWindow = 60 
}: FreeCameraPathOptions) {
  const animationRef = useRef<number | null>(null)
  const isActiveRef = useRef(false)
  const lastPositionRef = useRef<number[]>([])
  const positionHistoryRef = useRef<number[][]>([])
  const trailDistanceRef = useRef<number>(0)

  // Calculate total trail distance once
  useEffect(() => {
    if (trailGeometry && trailGeometry.coordinates.length > 0) {
      const lineString = turf.lineString(trailGeometry.coordinates.map(coord => [coord[0], coord[1]]))
      trailDistanceRef.current = turf.length(lineString, { units: 'kilometers' }) * 1000 // Convert to meters
    }
  }, [trailGeometry])

  // Smooth position using weighted moving average (more weight on recent positions)
  // This keeps camera more centered while still smoothing out jerky movements
  const smoothPosition = useCallback((position: number[]): number[] => {
    positionHistoryRef.current.push(position)
    if (positionHistoryRef.current.length > smoothingWindow) {
      positionHistoryRef.current.shift()
    }

    // Use weighted average - more recent positions have more weight
    // This keeps camera more responsive and centered while still smoothing
    const weights = positionHistoryRef.current.map((_, index) => {
      // Linear weighting: most recent = weight 1, oldest = weight 0.3
      const normalizedIndex = index / (positionHistoryRef.current.length - 1)
      return 0.3 + (1 - 0.3) * (1 - normalizedIndex)
    })
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    const weightedSum = positionHistoryRef.current.reduce(
      (acc, pos, index) => [
        acc[0] + pos[0] * weights[index],
        acc[1] + pos[1] * weights[index]
      ],
      [0, 0]
    )
    
    return [weightedSum[0] / totalWeight, weightedSum[1] / totalWeight]
  }, [smoothingWindow])

  // Update camera position along trail based on progress (0-1)
  const updateCameraPosition = useCallback((progress: number) => {
    if (!map || !trailGeometry || !trailGeometry.coordinates || trailGeometry.coordinates.length === 0) {
      return
    }

    try {
      // Validate coordinates - filter out invalid entries and STRICTLY ignore elevation
      // This ensures camera is completely decoupled from trail elevation
      const validCoords = trailGeometry.coordinates
        .map(coord => {
          // Handle both [lng, lat] and [lng, lat, elevation] formats
          // IMPORTANT: Always extract only [lng, lat] - ignore elevation completely
          if (Array.isArray(coord) && coord.length >= 2) {
            const lng = coord[0]
            const lat = coord[1]
            // Validate that lng/lat are numbers
            if (typeof lng === 'number' && typeof lat === 'number' && 
                !isNaN(lng) && !isNaN(lat) &&
                lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
              // Return ONLY 2D coordinates - elevation is completely ignored
              return [lng, lat] as [number, number]
            }
          }
          return null
        })
        .filter((coord): coord is [number, number] => coord !== null)

      if (validCoords.length === 0) {
        console.warn("[FreeCamera] No valid coordinates in trail geometry")
        return
      }

      // Clamp progress between 0 and 1
      const clampedProgress = Math.max(0, Math.min(1, progress))
      
      // Calculate distance along trail
      const lineString = turf.lineString(validCoords)
      const totalDistance = turf.length(lineString, { units: 'kilometers' }) * 1000
      
      if (totalDistance === 0) {
        console.warn("[FreeCamera] Trail has zero length")
        return
      }
      
      const distanceAlongTrail = totalDistance * clampedProgress

      // Get point along trail at current distance
      const pointAlongTrail = turf.along(lineString, distanceAlongTrail / 1000, { units: 'kilometers' })
      
      if (!pointAlongTrail || !pointAlongTrail.geometry || !pointAlongTrail.geometry.coordinates) {
        console.warn("[FreeCamera] Failed to get point along trail")
        return
      }
      
      // Extract ONLY lng/lat - ignore any elevation data that might be present
      const rawCoords = pointAlongTrail.geometry.coordinates
      const coordinates: [number, number] = [
        rawCoords[0] as number,
        rawCoords[1] as number
      ]

      // Smooth the position to avoid jerky movements
      const smoothedCoords = smoothPosition(coordinates)

      // Calculate look-ahead distance to determine trail direction
      const lookAheadDistanceKm = Math.max(5, cameraAltitude * 0.0005) // 5-40km ahead
      const aheadDistance = Math.min(
        distanceAlongTrail / 1000 + lookAheadDistanceKm,
        totalDistance / 1000
      )
      
      const pointAhead = turf.along(lineString, aheadDistance, { units: 'kilometers' })
      
      if (!pointAhead || !pointAhead.geometry || !pointAhead.geometry.coordinates) {
        console.warn("[FreeCamera] Failed to get point ahead on trail")
        return
      }
      
      const aheadCoords = pointAhead.geometry.coordinates as [number, number]
      
      // Calculate bearing from current position to ahead position
      // This tells us the direction the trail is heading
      const bearing = turf.bearing(
        turf.point(smoothedCoords),
        turf.point(aheadCoords)
      )
      
      // Calculate camera position offset
      // When trail goes east-west (bearing ~90 or ~-90), offset camera north/south
      // When trail goes north-south (bearing ~0 or ~180), keep camera centered
      let cameraLng = smoothedCoords[0]
      let cameraLat = smoothedCoords[1]
      
      // Normalize bearing to 0-360
      const normalizedBearing = ((bearing % 360) + 360) % 360
      
      // Check if trail is going mostly east-west (60-120 degrees or 240-300 degrees)
      const isEastWest = (normalizedBearing >= 60 && normalizedBearing <= 120) || 
                         (normalizedBearing >= 240 && normalizedBearing <= 300)
      
      if (isEastWest) {
        // Trail is going east-west, offset camera north to keep trail visible
        // Offset distance scales with altitude for better view
        const offsetDistance = Math.max(10000, cameraAltitude * 0.2) // 10-30km offset for high altitude
        const offsetPoint = turf.destination(
          turf.point(smoothedCoords),
          offsetDistance,
          0, // North
          { units: 'meters' }
        )
        cameraLng = offsetPoint.geometry.coordinates[0]
        cameraLat = offsetPoint.geometry.coordinates[1]
      }
      // Otherwise, keep camera centered on trail (north-south sections)

      // Get FreeCamera options
      const camera = map.getFreeCameraOptions()

      // Ensure mapboxgl is available
      if (!window.mapboxgl) {
        console.warn("[FreeCamera] mapboxgl not available")
        return
      }

      // Set camera position at FIXED absolute altitude (above sea level)
      // This altitude is completely independent of terrain elevation
      // Using a very high altitude (150km) ensures it's well above any terrain variation
      camera.position = window.mapboxgl.MercatorCoordinate.fromLngLat(
        {
          lng: cameraLng,
          lat: cameraLat
        },
        cameraAltitude // Fixed absolute altitude in meters above sea level
      )
      
      // Ensure camera orientation is fixed and not affected by terrain
      // The lookAtPoint will maintain consistent viewing angle regardless of terrain below

      // Always look north (calm, consistent birds-eye view)
      const lookAheadDistance = Math.max(10000, cameraAltitude * 0.6)
      const northPoint = turf.destination(
        turf.point([cameraLng, cameraLat]),
        lookAheadDistance,
        0, // 0 degrees = north
        { units: 'meters' }
      )

      camera.lookAtPoint({
        lng: northPoint.geometry.coordinates[0],
        lat: northPoint.geometry.coordinates[1]
      })

      // Apply camera settings
      map.setFreeCameraOptions(camera)
      
      lastPositionRef.current = smoothedCoords
    } catch (error) {
      console.warn("[FreeCamera] Error updating camera position:", error)
    }
  }, [map, trailGeometry, cameraAltitude, smoothPosition])

  // Start smooth camera following
  const startFollowing = useCallback(() => {
    if (!map || isActiveRef.current) return
    isActiveRef.current = true
    positionHistoryRef.current = []
  }, [map])

  // Stop camera following
  const stopFollowing = useCallback(() => {
    isActiveRef.current = false
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopFollowing()
    }
  }, [stopFollowing])

  return {
    updateCameraPosition,
    startFollowing,
    stopFollowing,
    isActive: isActiveRef.current,
  }
}
