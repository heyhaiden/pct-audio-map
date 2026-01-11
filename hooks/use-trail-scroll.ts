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
}

const PCT_TOTAL_MILES = 2650
const CAMERA_PATH_POINTS = 500

function lerpBearing(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180
  return (a + diff * t + 360) % 360
}

export function useTrailScroll({
  map,
  trailCoordinates,
  enabled,
  onProgressChange,
}: TrailScrollOptions): TrailScrollReturn {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentMiles, setCurrentMiles] = useState(0)
  const [cameraPath, setCameraPath] = useState<{ lng: number; lat: number; bearing: number }[] | null>(null)
  const [isScrollPaused, setIsScrollPaused] = useState(false)
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const onProgressChangeRef = useRef(onProgressChange)
  const trailCoordinatesRef = useRef(trailCoordinates)
  const mapRef = useRef(map)

  const cameraStateRef = useRef({
    lng: trailCoordinates[0]?.[0] || -116.465,
    lat: trailCoordinates[0]?.[1] || 32.599,
    bearing: 0,
    pitch: 0,
    altitude: 100000,
  })

  const pauseScrollAnimation = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current)
    }
    setIsScrollPaused(true)
    pauseTimeoutRef.current = setTimeout(() => {
      setIsScrollPaused(false)
    }, 3000)
  }, [])

  const resumeScrollAnimation = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current)
    }
    setIsScrollPaused(false)
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
        console.log("[v0] Waiting for turf.js...")
        setTimeout(buildCameraPath, 100)
        return
      }

      try {
        console.log("[v0] Building camera path with", trailCoordinates.length, "coordinates")

        const line = window.turf.lineString(trailCoordinates)
        const totalLength = window.turf.length(line, { units: "kilometers" })
        console.log("[v0] Trail length:", totalLength, "km")

        const points: { lng: number; lat: number; bearing: number }[] = []

        for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
          const distance = (i / CAMERA_PATH_POINTS) * totalLength
          const point = window.turf.along(line, distance, { units: "kilometers" })
          const coords = point.geometry.coordinates

          const nextDistance = Math.min(distance + totalLength * 0.01, totalLength)
          const nextPoint = window.turf.along(line, nextDistance, { units: "kilometers" })
          const bearing = window.turf.bearing(point, nextPoint)

          points.push({
            lng: coords[0],
            lat: coords[1],
            bearing: bearing,
          })
        }

        console.log("[v0] Camera path built with", points.length, "points")
        console.log("[v0] First point:", points[0])
        console.log("[v0] Last point:", points[points.length - 1])

        setCameraPath(points)
      } catch (error) {
        console.error("[v0] Error creating camera path:", error)
      }
    }

    buildCameraPath()
  }, [trailCoordinates])

  useEffect(() => {
    if (!enabled || !cameraPath || cameraPath.length === 0 || isScrollPaused) {
      console.log(
        "[v0] Animation not starting - enabled:",
        enabled,
        "cameraPath:",
        cameraPath?.length || 0,
        "paused:",
        isScrollPaused,
      )
      return
    }

    console.log("[v0] Starting animation loop with camera path of", cameraPath.length, "points")

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

      const targetLng = lowerPoint.lng + (upperPoint.lng - lowerPoint.lng) * fraction
      const targetLat = lowerPoint.lat + (upperPoint.lat - lowerPoint.lat) * fraction
      const targetBearing = lerpBearing(lowerPoint.bearing, upperPoint.bearing, fraction)

      const startAltitude = 100000
      const endAltitude = 20000
      const targetAltitude = startAltitude - (startAltitude - endAltitude) * rawPhase

      const startPitch = 0
      const endPitch = 60
      const targetPitch = startPitch + (endPitch - startPitch) * Math.min(rawPhase * 2, 1)

      const lerpFactor = 0.08
      const state = cameraStateRef.current

      state.lng += (targetLng - state.lng) * lerpFactor
      state.lat += (targetLat - state.lat) * lerpFactor
      state.bearing = lerpBearing(state.bearing, targetBearing, lerpFactor)
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
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current)
      }
    }
  }, [])

  return {
    scrollProgress,
    currentMiles,
    totalMiles: PCT_TOTAL_MILES,
    pauseScrollAnimation,
    resumeScrollAnimation,
  }
}
