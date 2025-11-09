"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import type mapboxgl from "mapbox-gl"
import * as turf from "@turf/turf"
import { useScrollStory } from "@/hooks/use-scroll-story"
import { useCameraPath } from "@/hooks/use-camera-path"
import type { PCTChapter } from "@/types/map"

interface StorytellingScrollProps {
  map: mapboxgl.Map | null
  chapters: PCTChapter[]
  onChapterChange?: (chapterIndex: number) => void
  setChapterRef?: (index: number) => (element: HTMLElement | null) => void
}

export function StorytellingScroll({ map, chapters, onChapterChange, setChapterRef: externalSetChapterRef }: StorytellingScrollProps) {
  const { animateToPosition, easingFunctions } = useCameraPath(map)
  const lastChapterRef = useRef(-1)
  const initialAerialCompleteRef = useRef(false)
  const [isInitialAerialDone, setIsInitialAerialDone] = useState(false)
  const lastScrollProgressRef = useRef(0)
  const cameraUpdateRef = useRef<number | null>(null)
  const positionHistoryRef = useRef<number[][]>([])
  const smoothingWindow = 60 // Smooth over 60 positions for ultra-smooth movement
  const trailGeometryRef = useRef<any>(null) // Cache loaded trail geometry

  const { currentChapter, scrollProgress, setChapterRef: internalSetChapterRef } = useScrollStory(chapters, {
    threshold: 0.6,
    rootMargin: "-20% 0px -20% 0px",
    onChapterChange: (chapterIndex, progress) => {
      // Only update chapter if it actually changed
      if (chapterIndex !== lastChapterRef.current && map) {
        const chapter = chapters[chapterIndex]
        if (chapter) {
          // Update terrain exaggeration
          if (chapter.terrain) {
            try {
              map.setTerrain({
                source: "mapbox://mapbox.terrain-rgb",
                exaggeration: chapter.terrain.exaggeration,
              })
            } catch (error) {
              console.warn("[StorytellingScroll] Could not update terrain:", error)
            }
          }

          onChapterChange?.(chapterIndex)
          lastChapterRef.current = chapterIndex
        }
      }
    },
  })

  // Smooth position using weighted moving average (from FreeCamera implementation)
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
  }, [])

  // Lazy load trail geometry when needed
  const loadTrailGeometry = useCallback(async () => {
    if (trailGeometryRef.current) return trailGeometryRef.current
    
    try {
      const { pctTrailGeometry } = await import("@/data/pct-segments")
      trailGeometryRef.current = pctTrailGeometry
      return pctTrailGeometry
    } catch (error) {
      console.error("[StorytellingScroll] Failed to load trail geometry:", error)
      return null
    }
  }, [])

  // Update camera position along trail based on scroll progress using traditional camera API
  const updateCameraAlongTrail = useCallback(async (progress: number) => {
    if (!map) return
    
    // Lazy load trail geometry if not already loaded
    const trailGeometry = await loadTrailGeometry()
    if (!trailGeometry?.geometry?.coordinates) return

    try {
      // Validate coordinates - STRICTLY ignore elevation to decouple camera from trail elevation
      const validCoords = trailGeometry.geometry.coordinates
        .map(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            const lng = coord[0]
            const lat = coord[1]
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

      if (validCoords.length === 0) return

      // Calculate distance along trail
      const lineString = turf.lineString(validCoords)
      const totalDistance = turf.length(lineString, { units: 'kilometers' }) * 1000
      if (totalDistance === 0) return

      const clampedProgress = Math.max(0, Math.min(1, progress))
      const distanceAlongTrail = totalDistance * clampedProgress

      // Get point along trail at current distance
      const pointAlongTrail = turf.along(lineString, distanceAlongTrail / 1000, { units: 'kilometers' })
      if (!pointAlongTrail?.geometry?.coordinates) return

      // Extract ONLY lng/lat - ignore any elevation data that might be present
      // This ensures camera is completely decoupled from trail elevation
      const rawCoords = pointAlongTrail.geometry.coordinates
      const coordinates: [number, number] = [
        rawCoords[0] as number,
        rawCoords[1] as number
      ]

      // Smooth the position to avoid jerky movements (from FreeCamera logic)
      // This prevents camera jerking when trail elevation changes
      const smoothedCoords = smoothPosition(coordinates)

      // Calculate look-ahead distance to determine trail direction
      const lookAheadDistanceKm = 5 // Look 5km ahead
      const aheadDistance = Math.min(
        distanceAlongTrail / 1000 + lookAheadDistanceKm,
        totalDistance / 1000
      )
      const pointAhead = turf.along(lineString, aheadDistance, { units: 'kilometers' })
      
      if (!pointAhead?.geometry?.coordinates) return

      const aheadCoords = pointAhead.geometry.coordinates as [number, number]
      
      // Calculate trail bearing from current position to ahead position
      // This tells us the direction the trail is heading
      const trailBearing = turf.bearing(
        turf.point(smoothedCoords),
        turf.point(aheadCoords)
      )

      // Calculate camera position offset (from FreeCamera logic)
      // When trail goes east-west (bearing ~90 or ~-90), offset camera north/south
      // When trail goes north-south (bearing ~0 or ~180), keep camera centered
      let cameraLng = smoothedCoords[0]
      let cameraLat = smoothedCoords[1]
      
      // Normalize bearing to 0-360
      const normalizedBearing = ((trailBearing % 360) + 360) % 360
      
      // Check if trail is going mostly east-west (60-120 degrees or 240-300 degrees)
      const isEastWest = (normalizedBearing >= 60 && normalizedBearing <= 120) || 
                         (normalizedBearing >= 240 && normalizedBearing <= 300)
      
      if (isEastWest) {
        // Trail is going east-west, offset camera north to keep trail visible
        // Offset distance scales with zoom level (approximate altitude)
        const zoom = 10
        // Approximate altitude from zoom: ~8-10km at zoom 10
        const approximateAltitude = 9000
        const offsetDistance = Math.max(10000, approximateAltitude * 0.2) // 10-20km offset
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

      // Always face north (calm, consistent birds-eye view)
      // Fixed zoom/pitch ensures consistent camera altitude regardless of trail elevation
      // These values are completely independent of trail elevation data
      const zoom = 10 // Consistent zoom level (closer view) - fixed altitude
      const pitch = 65 // Consistent pitch angle - fixed angle
      const bearing = 0 // Always face north

      // Use map.jumpTo for smooth transitions
      // Fixed zoom/pitch means camera altitude doesn't change with trail elevation
      // Camera position is based ONLY on 2D lng/lat coordinates, completely ignoring elevation
      map.jumpTo({
        center: [cameraLng, cameraLat], // Only 2D coordinates - no elevation
        zoom: zoom, // Fixed zoom = fixed altitude
        pitch: pitch, // Fixed pitch = fixed viewing angle
        bearing: bearing, // Always north
      })
    } catch (error) {
      console.warn("[StorytellingScroll] Error updating camera along trail:", error)
    }
  }, [map, smoothPosition])

  // Trigger intro animation: original FreeCamera birds-eye view at 150km altitude, then zoom to trailhead
  useEffect(() => {
    if (!map || initialAerialCompleteRef.current) return

    const handleMapLoad = async () => {
      // Wait a moment for map to fully initialize
      setTimeout(async () => {
        // Lazy load trail geometry for intro animation
        const trailGeometry = await loadTrailGeometry()
        if (!trailGeometry?.geometry?.coordinates) return
        
        try {
          // Ensure mapboxgl is available
          if (!window.mapboxgl) {
            console.warn("[StorytellingScroll] mapboxgl not available for intro animation")
            return
          }

          // Extract valid 2D coordinates (ignore elevation)
          const validCoords = trailGeometry.geometry.coordinates
            .map(coord => {
              if (Array.isArray(coord) && coord.length >= 2) {
                const lng = coord[0]
                const lat = coord[1]
                if (typeof lng === 'number' && typeof lat === 'number' && 
                    !isNaN(lng) && !isNaN(lat) &&
                    lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
                  return [lng, lat] as [number, number]
                }
              }
              return null
            })
            .filter((coord): coord is [number, number] => coord !== null)

          if (validCoords.length === 0) return

          const lineString = turf.lineString(validCoords)
          
          // Calculate bounding box of the entire trail
          const bbox = turf.bbox(lineString)
          const centerLng = (bbox[0] + bbox[2]) / 2
          const centerLat = (bbox[1] + bbox[3]) / 2
          
          // Get trail start coordinates (Mexico border) for final zoom target
          const trailStart = validCoords[0]
          const startLng = trailStart[0]
          const startLat = trailStart[1]
          
          // Calculate final camera position at trailhead (same logic as scroll camera)
          let finalCameraLng = startLng
          let finalCameraLat = startLat
          
          // Check if we need to apply offset for east-west trail sections
          const lookAheadDistanceKm = 5
          const pointAhead = turf.along(lineString, lookAheadDistanceKm, { units: 'kilometers' })
          
          if (pointAhead?.geometry?.coordinates) {
            const aheadCoords = pointAhead.geometry.coordinates as [number, number]
            
            const trailBearing = turf.bearing(
              turf.point([startLng, startLat]),
              turf.point(aheadCoords)
            )
            
            const normalizedBearing = ((trailBearing % 360) + 360) % 360
            const isEastWest = (normalizedBearing >= 60 && normalizedBearing <= 120) || 
                               (normalizedBearing >= 240 && normalizedBearing <= 300)
            
            if (isEastWest) {
              const approximateAltitude = 9000
              const offsetDistance = Math.max(10000, approximateAltitude * 0.2)
              const offsetPoint = turf.destination(
                turf.point([startLng, startLat]),
                offsetDistance,
                0, // North
                { units: 'meters' }
              )
              finalCameraLng = offsetPoint.geometry.coordinates[0]
              finalCameraLat = offsetPoint.geometry.coordinates[1]
            }
          }

          // Final camera settings (same as scroll camera)
          const finalZoom = 10
          const pitch = 65
          const bearing = 0

          // Step 1: Set up FreeCamera birds-eye view at 150km altitude (original animation)
          const cameraAltitude = 150000 // 150km for true birds-eye view
          const camera = map.getFreeCameraOptions()
          
          // Position camera at center of trail bounding box, high above
          camera.position = window.mapboxgl.MercatorCoordinate.fromLngLat(
            {
              lng: centerLng,
              lat: centerLat
            },
            cameraAltitude // 150km altitude for birds-eye view
          )
          
          // Look straight down at the trail center
          camera.lookAtPoint({
            lng: centerLng,
            lat: centerLat
          })
          
          map.setFreeCameraOptions(camera)

          // Step 2: After a brief pause, animate to trailhead using traditional camera
          setTimeout(() => {
            // Switch back to traditional camera for the zoom animation
            animateToPosition({
              center: [finalCameraLng, finalCameraLat],
              zoom: finalZoom,
              pitch: pitch,
              bearing: bearing,
              duration: 5000, // 5 second smooth zoom animation
            }, {
              easing: easingFunctions.easeInOutCubic,
              onComplete: () => {
                // After intro animation completes, enable scroll-driven camera
                initialAerialCompleteRef.current = true
                setIsInitialAerialDone(true)
              },
            })
          }, 2000) // Pause 2 seconds to show birds-eye view
        } catch (error) {
          console.warn("[StorytellingScroll] Error in intro animation:", error)
          // Fallback: just go to trailhead
          const trailStart = trailGeometry.geometry.coordinates[0]
          if (trailStart && trailStart.length >= 2) {
            animateToPosition({
              center: [trailStart[0], trailStart[1]],
              zoom: 10,
              pitch: 65,
              bearing: 0,
              duration: 4000,
            }, {
              easing: easingFunctions.easeInOutCubic,
              onComplete: () => {
                initialAerialCompleteRef.current = true
                setIsInitialAerialDone(true)
              },
            })
          }
        }
      }, 500) // Small delay to ensure map is fully ready
    }

    if (map.loaded()) {
      handleMapLoad()
    } else {
      map.once('load', handleMapLoad)
    }

    return () => {
      map.off('load', handleMapLoad)
    }
  }, [map, animateToPosition, easingFunctions, loadTrailGeometry])

  // Update camera position along trail based on scroll progress
  // Only after initial aerial shot is complete
  useEffect(() => {
    if (!isInitialAerialDone || !map) return

    // Cancel any pending camera update
    if (cameraUpdateRef.current) {
      cancelAnimationFrame(cameraUpdateRef.current)
    }

    // Throttle camera updates for smooth flythrough
    cameraUpdateRef.current = requestAnimationFrame(() => {
      // Map scroll progress (0-1) to trail position
      // Increased spacers make it take more scrolling to reach scrollProgress = 1.0
      // This naturally slows down the camera movement
      const trailProgress = Math.max(0, Math.min(1, scrollProgress))
      
      // Only update if progress changed significantly (smooth movement)
      if (Math.abs(trailProgress - lastScrollProgressRef.current) > 0.0005) {
        updateCameraAlongTrail(trailProgress)
        lastScrollProgressRef.current = trailProgress
      }
    })

    return () => {
      if (cameraUpdateRef.current) {
        cancelAnimationFrame(cameraUpdateRef.current)
      }
    }
  }, [scrollProgress, isInitialAerialDone, map, updateCameraAlongTrail])

  return (
    <div className="absolute left-0 top-0 w-full pointer-events-none z-20">
      <div className="relative">
        {/* Spacer to allow initial scroll - increased for slower scrolling */}
        <div className="h-[200vh]" />

        {/* Chapter sections */}
        {chapters.map((chapter, index) => {
          const internalRef = internalSetChapterRef(index)
          const externalRef = externalSetChapterRef ? externalSetChapterRef(index) : null
          
          // Combined ref callback that sets both refs
          const combinedRef = (element: HTMLElement | null) => {
            internalRef(element)
            if (externalRef) externalRef(element)
          }
          
          return (
          <div key={chapter.id} ref={combinedRef} className="min-h-screen flex items-center">
            <div className="w-full max-w-2xl mx-auto px-4 md:px-6 pointer-events-auto">
              <div
                className={`bg-black/80 backdrop-blur-sm rounded-xl p-6 md:p-8 text-white transition-all duration-700 ${
                  currentChapter === index ? "opacity-100 translate-y-0" : "opacity-60 translate-y-4"
                }`}
              >
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <div className="w-6 md:w-8 h-0.5 bg-[#ff6b9d] rounded"></div>
                  <span className="text-xs md:text-sm font-medium text-[#ff6b9d] uppercase tracking-wider">
                    Chapter {index + 1}
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-balance">{chapter.title}</h2>

                <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-4 md:mb-6">{chapter.description}</p>

                {/* Audio markers preview - hidden on mobile */}
                {chapter.audioMarkers.length > 0 && (
                  <div className="border-t border-white/20 pt-4 md:pt-6 hidden md:block">
                    <h4 className="text-sm font-semibold text-[#ff6b9d] mb-3">Featured Sounds</h4>
                    <div className="flex flex-wrap gap-2">
                      {chapter.audioMarkers.map((marker) => (
                        <span
                          key={marker}
                          className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300 capitalize"
                        >
                          {marker.replace("-", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )
        })}

        {/* Final spacer - increased for slower scrolling */}
        <div className="h-[200vh]" />
      </div>
    </div>
  )
}
