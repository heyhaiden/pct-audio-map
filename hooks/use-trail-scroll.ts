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
const MIN_LOOK_AHEAD_MILES = 6
const MAX_LOOK_AHEAD_MILES = 14
const MAX_CURVATURE_PITCH_REDUCTION = 10

type CameraPathPoint = {
  lng: number
  lat: number
  bearing: number
  smoothedBearing: number
  curvature: number
}

function lerpBearing(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180
  return (a + diff * t + 360) % 360
}

function angularDistance(a: number, b: number): number {
  const diff = ((b - a + 540) % 360) - 180
  return Math.abs(diff)
}

export function useTrailScroll({
  map,
  trailCoordinates,
  enabled,
  onProgressChange,
}: TrailScrollOptions): TrailScrollReturn {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentMiles, setCurrentMiles] = useState(0)
  const [cameraPath, setCameraPath] = useState<CameraPathPoint[] | null>(null)
  const [isScrollPaused, setIsScrollPaused] = useState(false)
  const pendingSyncRef = useRef<[number, number] | null>(null)
  const cameraPathRef = useRef<CameraPathPoint[] | null>(null)
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
    aimLng: -116.467,
    aimLat: 32.5897,
    groundElevation: 0,
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
          const center = currentMap.getCenter()
          cameraStateRef.current.aimLng = center.lng
          cameraStateRef.current.aimLat = center.lat
        }
      } catch (e) {
        const center = currentMap.getCenter()
        cameraStateRef.current.lng = center.lng
        cameraStateRef.current.lat = center.lat
        cameraStateRef.current.pitch = currentMap.getPitch()
        cameraStateRef.current.bearing = currentMap.getBearing()
        cameraStateRef.current.aimLng = center.lng
        cameraStateRef.current.aimLat = center.lat
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

        const points: CameraPathPoint[] = []
        const directionWindowKilometers = 16
        const curvatureWindowKilometers = 10

        for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
          const distance = (i / CAMERA_PATH_POINTS) * totalLength
          const point = window.turf.along(line, distance, { units: "kilometers" })
          const coords = point.geometry.coordinates
          const previousPoint = window.turf.along(
            line,
            Math.max(0, distance - directionWindowKilometers),
            { units: "kilometers" },
          )
          const nextPoint = window.turf.along(
            line,
            Math.min(totalLength, distance + directionWindowKilometers),
            { units: "kilometers" },
          )
          const bearing = window.turf.bearing(previousPoint, nextPoint)

          const curvaturePreviousPoint = window.turf.along(
            line,
            Math.max(0, distance - curvatureWindowKilometers),
            { units: "kilometers" },
          )
          const curvatureNextPoint = window.turf.along(
            line,
            Math.min(totalLength, distance + curvatureWindowKilometers),
            { units: "kilometers" },
          )
          const incomingBearing = window.turf.bearing(curvaturePreviousPoint, point)
          const outgoingBearing = window.turf.bearing(point, curvatureNextPoint)
          const curvature = Math.min(1, angularDistance(incomingBearing, outgoingBearing) / 90)

          points.push({
            lng: coords[0],
            lat: coords[1],
            bearing,
            smoothedBearing: bearing,
            curvature,
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

          // Preserve the actual regional direction. A northward bias can point
          // away from east-west trail sections and move the route off-screen.
          points[i].smoothedBearing = avgBearing
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
      const curvature =
        trailLowerPoint.curvature + (trailUpperPoint.curvature - trailLowerPoint.curvature) * trailFraction

      // Look farther through winding sections so individual switchbacks do not
      // whip the camera around. This target, not a compass bearing, anchors the
      // visible trail inside the viewport.
      const lookAheadMiles =
        MIN_LOOK_AHEAD_MILES + (MAX_LOOK_AHEAD_MILES - MIN_LOOK_AHEAD_MILES) * curvature
      const aimPhase = Math.min(1, rawPhase + lookAheadMiles / PCT_TOTAL_MILES)
      const aimPathIndex = aimPhase * (cameraPath.length - 1)
      const aimLowerIndex = Math.floor(aimPathIndex)
      const aimUpperIndex = Math.min(Math.ceil(aimPathIndex), cameraPath.length - 1)
      const aimFraction = aimPathIndex - aimLowerIndex
      const aimLowerPoint = cameraPath[aimLowerIndex]
      const aimUpperPoint = cameraPath[aimUpperIndex]
      const targetAimLng = aimLowerPoint.lng + (aimUpperPoint.lng - aimLowerPoint.lng) * aimFraction
      const targetAimLat = aimLowerPoint.lat + (aimUpperPoint.lat - aimLowerPoint.lat) * aimFraction

      const openingPhase = Math.min(1, (rawPhase * PCT_TOTAL_MILES) / OPENING_TRANSITION_MILES)
      const openingEase = 1 - Math.pow(1 - openingPhase, 3)
      const targetAltitude =
        INTRO_ALTITUDE_METERS + (CRUISING_ALTITUDE_METERS - INTRO_ALTITUDE_METERS) * openingEase

      const peakPitch = 60
      const endTransitionStart = 1 - END_TRANSITION_MILES / PCT_TOTAL_MILES
      const cruisingPitch = peakPitch - curvature * MAX_CURVATURE_PITCH_REDUCTION
      let targetPitch = cruisingPitch * openingEase

      if (rawPhase >= endTransitionStart) {
        const endPhase = (rawPhase - endTransitionStart) / (1 - endTransitionStart)
        targetPitch = cruisingPitch * (1 - endPhase)
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
            const center = currentMap.getCenter()
            cameraStateRef.current.aimLng = center.lng
            cameraStateRef.current.aimLat = center.lat
            if (typeof currentMap.queryTerrainElevation === "function") {
              const initialElevation = currentMap.queryTerrainElevation(center, { exaggerated: true })
              if (initialElevation != null && Number.isFinite(initialElevation)) {
                cameraStateRef.current.groundElevation = initialElevation
                cameraStateRef.current.altitude = Math.max(
                  1000,
                  cameraStateRef.current.altitude - initialElevation,
                )
              }
            }
          }
        } catch (e) {
          // Fallback: use standard getters
          const center = currentMap.getCenter()
          cameraStateRef.current.lng = center.lng
          cameraStateRef.current.lat = center.lat
          cameraStateRef.current.pitch = currentMap.getPitch()
          cameraStateRef.current.bearing = currentMap.getBearing()
          cameraStateRef.current.aimLng = center.lng
          cameraStateRef.current.aimLat = center.lat
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

      // Smooth one coherent framing model, then derive the camera position from
      // it. Independently smoothing position and aim creates a changing view
      // vector, which caused the jagged movement introduced by adaptive framing.
      state.aimLng += (targetAimLng - state.aimLng) * positionFactor
      state.aimLat += (targetAimLat - state.aimLat) * positionFactor
      state.bearing = lerpBearing(state.bearing, targetBearing, bearingFactor)
      state.pitch += (targetPitch - state.pitch) * positionFactor
      state.altitude += (targetAltitude - state.altitude) * positionFactor

      // The camera flies at a constant height above the ground rather than
      // above sea level. Terrain elevation is smoothed with a long time
      // constant so mountain ranges roll gently underneath instead of
      // punching the camera up and down at every ridge.
      let rawGroundElevation: number | null = null
      try {
        if (typeof currentMap.queryTerrainElevation === "function") {
          rawGroundElevation = currentMap.queryTerrainElevation(
            { lng: state.aimLng, lat: state.aimLat },
            { exaggerated: true },
          )
        }
      } catch {
        rawGroundElevation = null
      }
      if (rawGroundElevation != null && Number.isFinite(rawGroundElevation)) {
        const elevationFactor = 1 - Math.exp(-deltaSeconds / 2.5)
        state.groundElevation += (rawGroundElevation - state.groundElevation) * elevationFactor
      }

      const horizontalDistanceKilometers =
        (state.altitude / 1000) * Math.tan((state.pitch * Math.PI) / 180)
      const cameraPoint = window.turf.destination(
        window.turf.point([state.aimLng, state.aimLat]),
        horizontalDistanceKilometers,
        state.bearing + 180,
        { units: "kilometers" },
      )
      const [cameraLng, cameraLat] = cameraPoint.geometry.coordinates
      state.lng = cameraLng
      state.lat = cameraLat

      onProgressChangeRef.current?.(rawPhase, [trailLng, trailLat])

      try {
        if (typeof currentMap.getFreeCameraOptions !== "function") {
          animationFrame = requestAnimationFrame(updateCamera)
          return
        }

        const camera = currentMap.getFreeCameraOptions()

        camera.position = window.mapboxgl.MercatorCoordinate.fromLngLat(
          { lng: state.lng, lat: state.lat },
          state.groundElevation + state.altitude,
        )

        // Orient with pitch/bearing instead of lookAtPoint(). lookAtPoint aims
        // at sea level, so terrain height between camera and target skewed the
        // framing over mountains. The position above already places the aim
        // point at the correct screen location for this pitch and bearing.
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
