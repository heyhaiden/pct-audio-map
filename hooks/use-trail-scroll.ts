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
  const pendingSyncRef = useRef<[number, number] | null>(null)
  const cameraPathRef = useRef<{ lng: number; lat: number; bearing: number }[] | null>(null)

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
      cameraStateRef.current.bearing = lerpBearing(lowerPoint.bearing, upperPoint.bearing, fraction)
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
    if (pending) {
      syncScrollToPosition(pending)
      pendingSyncRef.current = null
    }
    setIsScrollPaused(false)
  }, [syncScrollToPosition])

  const setPendingSyncCoordinates = useCallback((coordinates: [number, number]) => {
    pendingSyncRef.current = coordinates
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

      const targetLng = lowerPoint.lng + (upperPoint.lng - lowerPoint.lng) * fraction
      const targetLat = lowerPoint.lat + (upperPoint.lat - lowerPoint.lat) * fraction
      const targetBearing = lerpBearing(lowerPoint.bearing, upperPoint.bearing, fraction)

      const startAltitude = 100000
      const endAltitude = 20000
      const targetAltitude = startAltitude - (startAltitude - endAltitude) * rawPhase

      const startPitch = 0
      const peakPitch = 60
      let targetPitch: number

      if (rawPhase < 0.9) {
        // Normal pitch increase from 0 to 60 during first 90%
        targetPitch = startPitch + (peakPitch - startPitch) * Math.min(rawPhase * 2, 1)
      } else {
        // Transition from current pitch back to 0 in the last 10%
        const endPhase = (rawPhase - 0.9) / 0.1 // 0 to 1 over last 10%
        targetPitch = peakPitch * (1 - endPhase)
      }

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
    if (!isScrollPaused) return

    const handleUserScroll = () => {
      if (pendingSyncRef.current) {
        syncScrollToPosition(pendingSyncRef.current)
        pendingSyncRef.current = null
      } else if (mapRef.current) {
        const center = mapRef.current.getCenter()
        if (center) {
          syncScrollToPosition([center.lng, center.lat])
        }
      }
      setIsScrollPaused(false)
    }

    window.addEventListener("wheel", handleUserScroll, { once: true, passive: true })
    window.addEventListener("touchmove", handleUserScroll, { once: true, passive: true })

    return () => {
      window.removeEventListener("wheel", handleUserScroll)
      window.removeEventListener("touchmove", handleUserScroll)
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
  }
}
