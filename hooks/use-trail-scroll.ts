"use client"

import { useEffect, useState, useRef, useCallback } from "react"

interface TrailScrollOptions {
  map: any
  trailCoordinates: number[][]
  enabled: boolean
  onProgressChange?: (progress: number, coordinates: [number, number]) => void
}

interface TrailScrollReturn {
  scrollProgress: number
  currentMiles: number
  totalMiles: number
  pauseScrollAnimation: () => void
  resumeScrollAnimation: () => void
  syncScrollToPosition: (coordinates: [number, number]) => void
  setPendingSyncCoordinates: (coordinates: [number, number]) => void
  setBlocked: (blocked: boolean) => void
}

const PCT_TOTAL_MILES = 2650
const CAMERA_PATH_POINTS = 500

function lerpBearing(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180
  return (a + diff * t + 360) % 360
}

function angularDistance(a: number, b: number): number {
  const diff = ((b - a + 540) % 360) - 180
  return Math.abs(diff)
}

function biasTowardNorth(bearing: number, northBias = 0.3): number {
  // northBias: 0 = no bias, 1 = always north
  // Allow some deviation but pull toward north
  const northBearing = 0
  return lerpBearing(bearing, northBearing, northBias)
}

// Calculate perpendicular offset based on trail direction to keep trail centered
// When trail heads east, offset camera west (and vice versa)
function calculateDirectionalOffset(
  bearing: number,
  altitude: number
): { lngOffset: number; latOffset: number } {
  // Convert bearing to radians
  const bearingRad = (bearing * Math.PI) / 180
  
  // Calculate how much the trail deviates from north (0 or 360)
  // Normalize bearing to -180 to 180 range
  const normalizedBearing = ((bearing + 180) % 360) - 180
  
  // East-west deviation factor: 0 when heading north/south, 1 when heading east/west
  const ewDeviation = Math.abs(Math.sin(bearingRad))
  
  // Offset strength scales with altitude (more offset when zoomed out)
  // and with how much the trail deviates from north
  const baseOffset = 0.015 // Base offset in degrees (~1.5km at equator)
  const altitudeFactor = Math.min(altitude / 50000, 1.5) // Scale with altitude
  const offsetStrength = baseOffset * altitudeFactor * ewDeviation
  
  // Offset perpendicular to trail direction (opposite side of where trail is heading)
  // If heading east (bearing ~90), offset camera west (negative lng)
  // If heading west (bearing ~270/-90), offset camera east (positive lng)
  const lngOffset = -Math.sin(bearingRad) * offsetStrength
  const latOffset = -Math.cos(bearingRad) * offsetStrength * 0.3 // Less lat offset
  
  return { lngOffset, latOffset }
}

export function useTrailScroll({
  map,
  trailCoordinates,
  enabled,
  onProgressChange,
}: TrailScrollOptions): TrailScrollReturn {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentMiles, setCurrentMiles] = useState(0)
  const [cameraPath, setCameraPath] = useState<
    { lng: number; lat: number; bearing: number; smoothedBearing: number }[] | null
  >(null)
  const [isScrollPaused, setIsScrollPaused] = useState(false)
  const pendingSyncRef = useRef<[number, number] | null>(null)
  const cameraPathRef = useRef<{ lng: number; lat: number; bearing: number; smoothedBearing: number }[] | null>(null)
  const isBlockedRef = useRef(false)

  const onProgressChangeRef = useRef(onProgressChange)
  const trailCoordinatesRef = useRef(trailCoordinates)
  const mapRef = useRef(map)

  // Initialize camera state - will be synced from map after intro completes
  const cameraStateRef = useRef({
    lng: -116.467,
    lat: 32.5897,
    bearing: -5,
    pitch: 0,
    altitude: 80000, // Higher starting altitude for zoom 9.55
  })
  const hasInitializedFromMap = useRef(false)

  useEffect(() => {
    cameraPathRef.current = cameraPath
  }, [cameraPath])

  const findProgressFromCoordinates = useCallback((coordinates: [number, number]): number => {
    const path = cameraPathRef.current
    if (!path || path.length === 0) return 0

    const [lng, lat] = coordinates
    let closestIndex = 0
    let closestDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i < path.length; i++) {
      const point = path[i]
      const distance = Math.sqrt(Math.pow(point.lng - lng, 2) + Math.pow(point.lat - lat, 2))
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = i
      }
    }

    return closestIndex / (path.length - 1)
  }, [])

  const syncScrollToPosition = useCallback((coordinates: [number, number]) => {
    if (typeof window === "undefined") return
    const path = cameraPathRef.current
    if (!path) return

    const progress = (() => {
      const [lng, lat] = coordinates
      let closestIndex = 0
      let closestDistance = Number.POSITIVE_INFINITY

      for (let i = 0; i < path.length; i++) {
        const point = path[i]
        const distance = Math.sqrt(Math.pow(point.lng - lng, 2) + Math.pow(point.lat - lat, 2))
        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = i
        }
      }

      return closestIndex / (path.length - 1)
    })()

    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const targetScroll = progress * scrollHeight

    setScrollProgress(progress)
    setCurrentMiles(progress * PCT_TOTAL_MILES)

    const pathIndex = progress * (path.length - 1)
    const lowerIndex = Math.floor(pathIndex)
    const upperIndex = Math.min(Math.ceil(pathIndex), path.length - 1)
    const fraction = pathIndex - lowerIndex

    const lowerPoint = path[lowerIndex]
    const upperPoint = path[upperIndex]

    if (lowerPoint && upperPoint) {
      cameraStateRef.current.lng = lowerPoint.lng + (upperPoint.lng - lowerPoint.lng) * fraction
      cameraStateRef.current.lat = lowerPoint.lat + (upperPoint.lat - lowerPoint.lat) * fraction
      cameraStateRef.current.bearing = lerpBearing(lowerPoint.smoothedBearing, upperPoint.smoothedBearing, fraction)
    }

    window.scrollTo({
      top: targetScroll,
      behavior: "instant",
    })
  }, [])

  const pauseScrollAnimation = useCallback(() => {
    setIsScrollPaused(true)
  }, [])

  const resumeScrollAnimation = useCallback(() => {
    const pending = pendingSyncRef.current
    
    // Sync camera state from actual map position before resuming
    // This prevents jarring jumps when transitioning back to scroll control
    const currentMap = mapRef.current
    if (currentMap) {
      try {
        const camera = currentMap.getFreeCameraOptions()
        if (camera && camera.position) {
          const lngLat = camera.position.toLngLat()
          cameraStateRef.current.lng = lngLat.lng
          cameraStateRef.current.lat = lngLat.lat
          cameraStateRef.current.altitude = camera.position.toAltitude()
          cameraStateRef.current.pitch = currentMap.getPitch()
          cameraStateRef.current.bearing = currentMap.getBearing()
        }
      } catch (e) {
        const center = currentMap.getCenter()
        cameraStateRef.current.lng = center.lng
        cameraStateRef.current.lat = center.lat
        cameraStateRef.current.pitch = currentMap.getPitch()
        cameraStateRef.current.bearing = currentMap.getBearing()
      }
    }
    
    if (pending) {
      syncScrollToPosition(pending)
      pendingSyncRef.current = null
    }
    setIsScrollPaused(false)
  }, [syncScrollToPosition])

  const setPendingSyncCoordinates = useCallback((coordinates: [number, number]) => {
    pendingSyncRef.current = coordinates
  }, [])

  const setBlocked = useCallback((blocked: boolean) => {
    isBlockedRef.current = blocked
  }, [])

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange
  }, [onProgressChange])

  useEffect(() => {
    trailCoordinatesRef.current = trailCoordinates
  }, [trailCoordinates])

  useEffect(() => {
    mapRef.current = map
  }, [map])

  useEffect(() => {
    if (!trailCoordinates || trailCoordinates.length < 2) return

    const buildCameraPath = () => {
      if (typeof window === "undefined" || !window.turf) {
        setTimeout(buildCameraPath, 100)
        return
      }

      try {
        const line = window.turf.lineString(trailCoordinates)
        const totalLength = window.turf.length(line, { units: "kilometers" })

        const points: { lng: number; lat: number; bearing: number; smoothedBearing: number }[] = []

        for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
          const distance = (i / CAMERA_PATH_POINTS) * totalLength
          const point = window.turf.along(line, distance, { units: "kilometers" })
          const coords = point.geometry.coordinates

          // Look further ahead to get smoother bearing (5% of trail instead of 1%)
          const nextDistance = Math.min(distance + totalLength * 0.05, totalLength)
          const nextPoint = window.turf.along(line, nextDistance, { units: "kilometers" })
          const bearing = window.turf.bearing(point, nextPoint)

          points.push({
            lng: coords[0],
            lat: coords[1],
            bearing: bearing,
            smoothedBearing: bearing, // Will be updated in second pass
          })
        }

        const windowSize = 8 // Average over 8 points (~1.6% of trail)
        for (let i = 0; i < points.length; i++) {
          let sumX = 0
          let sumY = 0
          let count = 0

          for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
            // Convert bearing to unit vector and average (handles wrap-around correctly)
            const rad = (points[j].bearing * Math.PI) / 180
            sumX += Math.cos(rad)
            sumY += Math.sin(rad)
            count++
          }

          // Convert averaged vector back to bearing
          const avgBearing = (Math.atan2(sumY / count, sumX / count) * 180) / Math.PI

          // This keeps camera oriented generally northward while allowing some natural movement
          const northBiasStrength = 0.4
          points[i].smoothedBearing = biasTowardNorth(avgBearing, northBiasStrength)
        }

        const maxBearingChangePerPoint = 3 // Max 3 degrees change per point
        for (let i = 1; i < points.length; i++) {
          const prevBearing = points[i - 1].smoothedBearing
          const currentBearing = points[i].smoothedBearing
          const change = ((currentBearing - prevBearing + 540) % 360) - 180

          if (Math.abs(change) > maxBearingChangePerPoint) {
            // Clamp the change
            const clampedChange = Math.sign(change) * maxBearingChangePerPoint
            points[i].smoothedBearing = (prevBearing + clampedChange + 360) % 360
          }
        }

        setCameraPath(points)
      } catch (error) {
        console.error("[v0] Error creating camera path:", error)
      }
    }

    buildCameraPath()
  }, [trailCoordinates])

  useEffect(() => {
    if (!enabled || !cameraPath || cameraPath.length === 0 || isScrollPaused) {
      return
    }

    let animationFrame: number

    const updateCamera = () => {
      const currentMap = mapRef.current

      if (!currentMap || !window.mapboxgl) {
        animationFrame = requestAnimationFrame(updateCamera)
        return
      }

      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollTop = window.scrollY
      const rawPhase = scrollHeight > 0 ? Math.max(0, Math.min(1, scrollTop / scrollHeight)) : 0

      setScrollProgress(rawPhase)
      setCurrentMiles(rawPhase * PCT_TOTAL_MILES)

      const pathIndex = rawPhase * (cameraPath.length - 1)
      const lowerIndex = Math.floor(pathIndex)
      const upperIndex = Math.min(Math.ceil(pathIndex), cameraPath.length - 1)
      const fraction = pathIndex - lowerIndex

      const lowerPoint = cameraPath[lowerIndex]
      const upperPoint = cameraPath[upperIndex]

      const baseLng = lowerPoint.lng + (upperPoint.lng - lowerPoint.lng) * fraction
      const baseLat = lowerPoint.lat + (upperPoint.lat - lowerPoint.lat) * fraction
      const targetBearing = lerpBearing(lowerPoint.smoothedBearing, upperPoint.smoothedBearing, fraction)

      // Start altitude matches intro animation end (zoom ~9.55 = ~50000m altitude)
      // Gradually decrease to end altitude as we progress through trail
      const startAltitude = 50000
      const endAltitude = 15000
      
      // End transition zone - last 50 miles for smoother pullback
      const endTransitionStart = 1 - 50 / PCT_TOTAL_MILES // ~0.981
      
      let targetAltitude: number
      if (rawPhase < endTransitionStart) {
        // Normal altitude decrease during most of the trail
        targetAltitude = startAltitude - (startAltitude - endAltitude) * (rawPhase / endTransitionStart)
      } else {
        // Pull back (increase altitude) in the last 50 miles for cinematic arrival
        const endPhase = (rawPhase - endTransitionStart) / (1 - endTransitionStart)
        const pullbackAltitude = 35000 // Pull back to this altitude at the end
        // Smooth ease-out curve for pullback
        const easedPhase = 1 - Math.pow(1 - endPhase, 2)
        targetAltitude = endAltitude + (pullbackAltitude - endAltitude) * easedPhase
      }

      // Calculate directional offset to keep trail centered when heading east/west
      const { lngOffset, latOffset } = calculateDirectionalOffset(targetBearing, targetAltitude)
      const targetLng = baseLng + lngOffset
      const targetLat = baseLat + latOffset

      const startPitch = 0
      const peakPitch = 60
      let targetPitch: number

      if (rawPhase < endTransitionStart) {
        // Normal pitch increase from 0 to 60 during most of the trail
        targetPitch = startPitch + (peakPitch - startPitch) * Math.min(rawPhase * 2, 1)
      } else {
        // Transition from peak pitch back to 0 in the last 50 miles
        const endPhase = (rawPhase - endTransitionStart) / (1 - endTransitionStart)
        // Smooth ease-out curve for pitch reduction
        const easedPhase = 1 - Math.pow(1 - endPhase, 2)
        targetPitch = peakPitch * (1 - easedPhase)
      }

      // On first frame, sync camera state from current map position to avoid jump
      if (!hasInitializedFromMap.current && currentMap) {
        try {
          const camera = currentMap.getFreeCameraOptions()
          if (camera && camera.position) {
            const lngLat = camera.position.toLngLat()
            cameraStateRef.current.lng = lngLat.lng
            cameraStateRef.current.lat = lngLat.lat
            cameraStateRef.current.altitude = camera.position.toAltitude()
            cameraStateRef.current.pitch = currentMap.getPitch()
            cameraStateRef.current.bearing = currentMap.getBearing()
          }
        } catch (e) {
          // Fallback: use standard getters
          const center = currentMap.getCenter()
          cameraStateRef.current.lng = center.lng
          cameraStateRef.current.lat = center.lat
          cameraStateRef.current.pitch = currentMap.getPitch()
          cameraStateRef.current.bearing = currentMap.getBearing()
        }
        hasInitializedFromMap.current = true
      }

      const lerpFactor = 0.05
      const state = cameraStateRef.current

      state.lng += (targetLng - state.lng) * lerpFactor
      state.lat += (targetLat - state.lat) * lerpFactor
      state.bearing = lerpBearing(state.bearing, targetBearing, lerpFactor * 0.6)
      state.pitch += (targetPitch - state.pitch) * lerpFactor
      state.altitude += (targetAltitude - state.altitude) * lerpFactor

      onProgressChangeRef.current?.(rawPhase, [state.lng, state.lat])

      try {
        if (typeof currentMap.getFreeCameraOptions !== "function") {
          animationFrame = requestAnimationFrame(updateCamera)
          return
        }

        const camera = currentMap.getFreeCameraOptions()

        camera.position = window.mapboxgl.MercatorCoordinate.fromLngLat(
          { lng: state.lng, lat: state.lat },
          state.altitude,
        )

        camera.setPitchBearing(state.pitch, state.bearing)

        currentMap.setFreeCameraOptions(camera)
      } catch (error) {
        console.error("[v0] Camera update error:", error)
      }

      animationFrame = requestAnimationFrame(updateCamera)
    }

    animationFrame = requestAnimationFrame(updateCamera)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [enabled, cameraPath, isScrollPaused])

  useEffect(() => {
    if (!isScrollPaused) return

    const handleUserScroll = () => {
      // If blocked, don't do anything - the animation needs to complete first
      if (isBlockedRef.current) return

      // ALWAYS prioritize pending sync coordinates - this is where we WANT to be
      // Don't use current map position as it may be mid-animation
      if (pendingSyncRef.current) {
        syncScrollToPosition(pendingSyncRef.current)
        pendingSyncRef.current = null
        setIsScrollPaused(false)
        return
      }

      // Only fall back to current map position if no pending coordinates
      const currentMap = mapRef.current
      if (currentMap) {
        try {
          const camera = currentMap.getFreeCameraOptions()
          if (camera && camera.position) {
            const lngLat = camera.position.toLngLat()
            cameraStateRef.current.lng = lngLat.lng
            cameraStateRef.current.lat = lngLat.lat
            cameraStateRef.current.altitude = camera.position.toAltitude()
            cameraStateRef.current.pitch = currentMap.getPitch()
            cameraStateRef.current.bearing = currentMap.getBearing()
          }
        } catch (e) {
          const center = currentMap.getCenter()
          cameraStateRef.current.lng = center.lng
          cameraStateRef.current.lat = center.lat
          cameraStateRef.current.pitch = currentMap.getPitch()
          cameraStateRef.current.bearing = currentMap.getBearing()
        }
        
        const center = currentMap.getCenter()
        if (center) {
          syncScrollToPosition([center.lng, center.lat])
        }
      }
      setIsScrollPaused(false)
    }

    const checkAndResume = (e: Event) => {
      if (isBlockedRef.current || e.defaultPrevented) return
      handleUserScroll()
    }

    window.addEventListener("wheel", checkAndResume, { once: true, passive: true })
    window.addEventListener("touchmove", checkAndResume, { once: true, passive: true })

    return () => {
      window.removeEventListener("wheel", checkAndResume)
      window.removeEventListener("touchmove", checkAndResume)
    }
  }, [isScrollPaused, syncScrollToPosition])

  return {
    scrollProgress,
    currentMiles,
    totalMiles: PCT_TOTAL_MILES,
    pauseScrollAnimation,
    resumeScrollAnimation,
    syncScrollToPosition,
    setPendingSyncCoordinates,
    setBlocked,
  }
}
