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
const OPENING_TRANSITION_MILES = 80
const END_TRANSITION_MILES = 35
const CRUISING_ALTITUDE_METERS = 26000
const INTRO_ALTITUDE_METERS = 50000
const CAMERA_FOLLOW_DISTANCE_MILES = 8

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
  const previousFrameTimeRef = useRef<number | null>(null)

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

          // Use a fixed-distance look-ahead so steering behaves consistently
          // across the full trail instead of scaling with total route length.
          const bearingLookAheadKilometers = 16
          const nextDistance = Math.min(distance + bearingLookAheadKilometers, totalLength)
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

    const updateCamera = (frameTime: number) => {
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

      const trailPathIndex = rawPhase * (cameraPath.length - 1)
      const trailLowerIndex = Math.floor(trailPathIndex)
      const trailUpperIndex = Math.min(Math.ceil(trailPathIndex), cameraPath.length - 1)
      const trailFraction = trailPathIndex - trailLowerIndex
      const trailLowerPoint = cameraPath[trailLowerIndex]
      const trailUpperPoint = cameraPath[trailUpperIndex]

      const trailLng = trailLowerPoint.lng + (trailUpperPoint.lng - trailLowerPoint.lng) * trailFraction
      const trailLat = trailLowerPoint.lat + (trailUpperPoint.lat - trailLowerPoint.lat) * trailFraction
      const targetBearing = lerpBearing(
        trailLowerPoint.smoothedBearing,
        trailUpperPoint.smoothedBearing,
        trailFraction,
      )

      // Keep the camera behind the active trail point. With pitch applied, this
      // reserves the upper portion of the viewport for the upcoming route.
      const followProgress = CAMERA_FOLLOW_DISTANCE_MILES / PCT_TOTAL_MILES
      const cameraPhase = Math.max(0, rawPhase - followProgress)
      const cameraPathIndex = cameraPhase * (cameraPath.length - 1)
      const cameraLowerIndex = Math.floor(cameraPathIndex)
      const cameraUpperIndex = Math.min(Math.ceil(cameraPathIndex), cameraPath.length - 1)
      const cameraFraction = cameraPathIndex - cameraLowerIndex
      const cameraLowerPoint = cameraPath[cameraLowerIndex]
      const cameraUpperPoint = cameraPath[cameraUpperIndex]
      const targetLng = cameraLowerPoint.lng + (cameraUpperPoint.lng - cameraLowerPoint.lng) * cameraFraction
      const targetLat = cameraLowerPoint.lat + (cameraUpperPoint.lat - cameraLowerPoint.lat) * cameraFraction

      const openingPhase = Math.min(1, (rawPhase * PCT_TOTAL_MILES) / OPENING_TRANSITION_MILES)
      const openingEase = 1 - Math.pow(1 - openingPhase, 3)
      const targetAltitude =
        INTRO_ALTITUDE_METERS + (CRUISING_ALTITUDE_METERS - INTRO_ALTITUDE_METERS) * openingEase

      const peakPitch = 60
      const endTransitionStart = 1 - END_TRANSITION_MILES / PCT_TOTAL_MILES
      let targetPitch = peakPitch * openingEase

      if (rawPhase >= endTransitionStart) {
        const endPhase = (rawPhase - endTransitionStart) / (1 - endTransitionStart)
        targetPitch = peakPitch * (1 - endPhase)
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

      const previousFrameTime = previousFrameTimeRef.current ?? frameTime
      const deltaSeconds = Math.min((frameTime - previousFrameTime) / 1000, 0.1)
      previousFrameTimeRef.current = frameTime

      // Exponential smoothing is independent of refresh rate. Position and
      // framing react quickly while bearing remains slightly more deliberate.
      const positionFactor = 1 - Math.exp(-deltaSeconds / 0.16)
      const bearingFactor = 1 - Math.exp(-deltaSeconds / 0.28)
      const state = cameraStateRef.current

      state.lng += (targetLng - state.lng) * positionFactor
      state.lat += (targetLat - state.lat) * positionFactor
      state.bearing = lerpBearing(state.bearing, targetBearing, bearingFactor)
      state.pitch += (targetPitch - state.pitch) * positionFactor
      state.altitude += (targetAltitude - state.altitude) * positionFactor

      onProgressChangeRef.current?.(rawPhase, [trailLng, trailLat])

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

    previousFrameTimeRef.current = null
    animationFrame = requestAnimationFrame(updateCamera)

    return () => {
      previousFrameTimeRef.current = null
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
