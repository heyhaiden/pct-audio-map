"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import {
  CAMERA_PATH_POINTS,
  PCT_TOTAL_MILES,
  computeRailingPose,
  findProgressFromCoordinates,
  lerpBearing,
  offsetLngLat,
  sampleTrailAtProgress,
  altitudeAndPitchForProgress,
  type CameraPathPoint,
  type FreeCameraPose,
} from "@/lib/railing-camera"

interface TrailScrollOptions {
  map: any
  trailCoordinates: number[][]
  enabled: boolean
  onProgressChange?: (progress: number, coordinates: [number, number]) => void
}

export interface TrailScrollReturn {
  scrollProgress: number
  currentMiles: number
  totalMiles: number
  pauseScrollAnimation: () => void
  resumeScrollAnimation: () => void
  syncScrollToPosition: (coordinates: [number, number]) => void
  setPendingSyncCoordinates: (coordinates: [number, number]) => void
  setBlocked: (blocked: boolean) => void
  getCameraPath: () => CameraPathPoint[] | null
  getRailingPoseAtCoordinates: (coordinates: [number, number]) => FreeCameraPose | null
  getProgressFromCoordinates: (coordinates: [number, number]) => number
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

  const cameraStateRef = useRef({
    lng: -116.467,
    lat: 32.5897,
    bearing: -5,
    pitch: 0,
    altitude: 80000,
  })
  const hasInitializedFromMap = useRef(false)
  const previousFrameTimeRef = useRef<number | null>(null)

  useEffect(() => {
    cameraPathRef.current = cameraPath
  }, [cameraPath])

  const getCameraPath = useCallback(() => cameraPathRef.current, [])

  const getProgressFromCoordinates = useCallback((coordinates: [number, number]): number => {
    const path = cameraPathRef.current
    if (!path || path.length === 0) return 0
    return findProgressFromCoordinates(path, coordinates)
  }, [])

  const getRailingPoseAtCoordinates = useCallback(
    (coordinates: [number, number]): FreeCameraPose | null => {
      const path = cameraPathRef.current
      if (!path || path.length === 0) return null
      const progress = findProgressFromCoordinates(path, coordinates)
      return computeRailingPose(path, progress)
    },
    [],
  )

  const syncScrollToPosition = useCallback((coordinates: [number, number]) => {
    if (typeof window === "undefined") return
    const path = cameraPathRef.current
    if (!path) return

    const progress = findProgressFromCoordinates(path, coordinates)
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const targetScroll = progress * scrollHeight

    setScrollProgress(progress)
    setCurrentMiles(progress * PCT_TOTAL_MILES)

    const railing = computeRailingPose(path, progress)
    cameraStateRef.current.lng = railing.lng
    cameraStateRef.current.lat = railing.lat
    cameraStateRef.current.bearing = railing.bearing
    cameraStateRef.current.pitch = railing.pitch
    cameraStateRef.current.altitude = railing.altitude

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
      } catch {
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

        const points: CameraPathPoint[] = []

        for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
          const distance = (i / CAMERA_PATH_POINTS) * totalLength
          const point = window.turf.along(line, distance, { units: "kilometers" })
          const coords = point.geometry.coordinates

          const bearingLookAheadKilometers = 16
          const nextDistance = Math.min(distance + bearingLookAheadKilometers, totalLength)
          const nextPoint = window.turf.along(line, nextDistance, { units: "kilometers" })
          const bearing = window.turf.bearing(point, nextPoint)

          points.push({
            lng: coords[0],
            lat: coords[1],
            bearing: bearing,
            smoothedBearing: bearing,
          })
        }

        const windowSize = 8
        for (let i = 0; i < points.length; i++) {
          let sumX = 0
          let sumY = 0
          let count = 0

          for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
            const rad = (points[j].bearing * Math.PI) / 180
            sumX += Math.cos(rad)
            sumY += Math.sin(rad)
            count++
          }

          const avgBearing = (Math.atan2(sumY / count, sumX / count) * 180) / Math.PI
          points[i].smoothedBearing = (avgBearing + 360) % 360
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
    let lastUiPublishMs = 0
    let lastPublishedMiles = -1

    const updateCamera = (frameTime: number) => {
      const currentMap = mapRef.current

      if (!currentMap || !window.mapboxgl) {
        animationFrame = requestAnimationFrame(updateCamera)
        return
      }

      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollTop = window.scrollY
      const rawPhase = scrollHeight > 0 ? Math.max(0, Math.min(1, scrollTop / scrollHeight)) : 0
      const miles = rawPhase * PCT_TOTAL_MILES

      const trail = sampleTrailAtProgress(cameraPath, rawPhase)
      const { altitude: targetAltitude, pitch: targetPitch } = altitudeAndPitchForProgress(rawPhase)
      const groundOffsetKm = (targetAltitude * Math.tan((targetPitch * Math.PI) / 180)) / 1000
      const [targetLng, targetLat] = offsetLngLat(
        trail.lng,
        trail.lat,
        groundOffsetKm,
        (trail.bearing + 180) % 360,
      )
      const targetBearing = trail.bearing

      // Keep the free-camera loop at full rate, but don't React-re-render UI every frame
      const now = frameTime
      if (now - lastUiPublishMs > 100 || Math.abs(miles - lastPublishedMiles) >= 0.5) {
        lastUiPublishMs = now
        lastPublishedMiles = miles
        setScrollProgress(rawPhase)
        setCurrentMiles(miles)
        onProgressChangeRef.current?.(rawPhase, [trail.lng, trail.lat])
      }

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
        } catch {
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

      const positionFactor = 1 - Math.exp(-deltaSeconds / 0.16)
      const bearingFactor = 1 - Math.exp(-deltaSeconds / 0.28)
      const state = cameraStateRef.current

      state.lng += (targetLng - state.lng) * positionFactor
      state.lat += (targetLat - state.lat) * positionFactor
      state.bearing = lerpBearing(state.bearing, targetBearing, bearingFactor)
      state.pitch += (targetPitch - state.pitch) * positionFactor
      state.altitude += (targetAltitude - state.altitude) * positionFactor

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
      if (isBlockedRef.current) return

      if (pendingSyncRef.current) {
        syncScrollToPosition(pendingSyncRef.current)
        pendingSyncRef.current = null
        setIsScrollPaused(false)
        return
      }

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
        } catch {
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
    getCameraPath,
    getRailingPoseAtCoordinates,
    getProgressFromCoordinates,
  }
}
