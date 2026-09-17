"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import along from "@turf/along"
import bearing from "@turf/bearing"
import length from "@turf/length"
import { lineString } from "@turf/helpers"
import {
  CAMERA_PATH_POINTS,
  PCT_TOTAL_MILES,
  cameraFollowFactors,
  computeRailingPose,
  findProgressFromCoordinates,
  isMobileRailingViewport,
  lerpBearing,
  offsetLngLat,
  sampleTrailAtProgress,
  altitudeAndPitchForProgress,
  shouldDecimateCameraWrites,
  type CameraPathPoint,
  type FreeCameraPose,
} from "@/lib/railing-camera"
import {
  isResumeTrailPosition,
  resolveResumeFrameProgress,
  resumeProgressFromMiles,
} from "@/lib/map-resume"
import { isTrailCameraSettling } from "@/lib/inverted-touch-scroll"

interface TrailScrollOptions {
  map: any
  trailCoordinates: number[][]
  enabled: boolean
  /** Jump to the railing pose instead of easing from the live GL camera. */
  snapOnEnable?: boolean
  /** Saved mile while Back to Map restores window scroll. */
  resumeMiles?: number
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
  snapOnEnable = false,
  resumeMiles,
  onProgressChange,
}: TrailScrollOptions): TrailScrollReturn {
  const [scrollProgress, setScrollProgress] = useState(() =>
    snapOnEnable && isResumeTrailPosition(resumeMiles)
      ? resumeProgressFromMiles(resumeMiles)
      : 0,
  )
  const [currentMiles, setCurrentMiles] = useState(() =>
    snapOnEnable && isResumeTrailPosition(resumeMiles) ? resumeMiles : 0,
  )
  const [cameraPath, setCameraPath] = useState<CameraPathPoint[] | null>(null)
  const [isScrollPaused, setIsScrollPaused] = useState(false)
  const pendingSyncRef = useRef<[number, number] | null>(null)
  const cameraPathRef = useRef<CameraPathPoint[] | null>(null)
  const isBlockedRef = useRef(false)
  // After a sync/resume, the GL camera may not match cameraStateRef — force one
  // write even if the state already reads as settled.
  const forceCameraWriteRef = useRef(false)

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
  const snapOnEnableRef = useRef(snapOnEnable)
  snapOnEnableRef.current = snapOnEnable
  const resumeLockMilesRef = useRef<number | null>(
    snapOnEnable && isResumeTrailPosition(resumeMiles) ? resumeMiles : null,
  )
  const resumeLockedRef = useRef(resumeLockMilesRef.current != null)

  useEffect(() => {
    if (!snapOnEnable || !isResumeTrailPosition(resumeMiles)) return
    if (resumeLockMilesRef.current == null) {
      resumeLockMilesRef.current = resumeMiles
      resumeLockedRef.current = true
    }
    setCurrentMiles((prev) => (prev < 1 ? resumeMiles : prev))
    setScrollProgress((prev) =>
      prev < 0.001 ? resumeProgressFromMiles(resumeMiles) : prev,
    )
  }, [snapOnEnable, resumeMiles])

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
    forceCameraWriteRef.current = true

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
      try {
        const line = lineString(trailCoordinates)
        const totalLength = length(line, { units: "kilometers" })

        const points: CameraPathPoint[] = []

        for (let i = 0; i <= CAMERA_PATH_POINTS; i++) {
          const distance = (i / CAMERA_PATH_POINTS) * totalLength
          const point = along(line, distance, { units: "kilometers" })
          const coords = point.geometry.coordinates

          const bearingLookAheadKilometers = 16
          const nextDistance = Math.min(distance + bearingLookAheadKilometers, totalLength)
          const nextPoint = along(line, nextDistance, { units: "kilometers" })
          const pointBearing = bearing(point, nextPoint)

          points.push({
            lng: coords[0],
            lat: coords[1],
            bearing: pointBearing,
            smoothedBearing: pointBearing,
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
    let lastScrollTop = typeof window !== "undefined" ? window.scrollY : 0
    let lastScrollChangeMs = 0
    let frameIndex = 0
    let reusableCamera: any = null

    const updateCamera = (frameTime: number) => {
      const currentMap = mapRef.current

      if (!currentMap) {
        animationFrame = requestAnimationFrame(updateCamera)
        return
      }

      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollTop = window.scrollY
      const scrollDelta = Math.abs(scrollTop - lastScrollTop)
      if (scrollDelta > 0.5) {
        lastScrollTop = scrollTop
        lastScrollChangeMs = frameTime
      }
      const isScrolling = frameTime - lastScrollChangeMs < 150

      const rawPhase = scrollHeight > 0 ? Math.max(0, Math.min(1, scrollTop / scrollHeight)) : 0
      const resumeLockMiles = resumeLockMilesRef.current
      const resolved = resolveResumeFrameProgress({
        scrollProgress: rawPhase,
        resumeProgress:
          resumeLockMiles != null ? resumeProgressFromMiles(resumeLockMiles) : null,
        locked: resumeLockedRef.current,
      })
      resumeLockedRef.current = resolved.locked
      const phase = resolved.progress
      const miles = phase * PCT_TOTAL_MILES

      const trail = sampleTrailAtProgress(cameraPath, phase)
      const { altitude: targetAltitude, pitch: targetPitch } = altitudeAndPitchForProgress(phase)
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
        setScrollProgress(phase)
        setCurrentMiles(miles)
        onProgressChangeRef.current?.(phase, [trail.lng, trail.lat])
      }

      if (!hasInitializedFromMap.current && currentMap) {
        if (snapOnEnableRef.current) {
          cameraStateRef.current.lng = targetLng
          cameraStateRef.current.lat = targetLat
          cameraStateRef.current.altitude = targetAltitude
          cameraStateRef.current.pitch = targetPitch
          cameraStateRef.current.bearing = targetBearing
          forceCameraWriteRef.current = true
        } else {
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
        hasInitializedFromMap.current = true
      }

      const previousFrameTime = previousFrameTimeRef.current ?? frameTime
      const deltaSeconds = Math.min((frameTime - previousFrameTime) / 1000, 0.1)
      previousFrameTimeRef.current = frameTime

      const mobile = isMobileRailingViewport()
      const settling = !isScrolling || isTrailCameraSettling(frameTime)
      const { positionFactor, bearingFactor } = cameraFollowFactors(
        deltaSeconds,
        mobile,
        settling,
      )
      const state = cameraStateRef.current

      state.lng += (targetLng - state.lng) * positionFactor
      state.lat += (targetLat - state.lat) * positionFactor
      state.bearing = lerpBearing(state.bearing, targetBearing, bearingFactor)
      state.pitch += (targetPitch - state.pitch) * positionFactor
      state.altitude += (targetAltitude - state.altitude) * positionFactor

      // Once converged with no scroll motion, stop dirtying the map so it can
      // actually go idle — otherwise every frame forces a full terrain repaint.
      const lngErr = Math.abs(targetLng - state.lng)
      const latErr = Math.abs(targetLat - state.lat)
      const bearingErr = Math.abs(((targetBearing - state.bearing + 540) % 360) - 180)
      const pitchErr = Math.abs(targetPitch - state.pitch)
      const altErr = Math.abs(targetAltitude - state.altitude)
      const settled =
        !isScrolling &&
        lngErr < 0.000008 &&
        latErr < 0.000008 &&
        bearingErr < 0.08 &&
        pitchErr < 0.08 &&
        altErr < 3

      frameIndex += 1
      // Desktop can skip a write when a scroll frame ran over budget. Mobile
      // keeps every frame — half-rate free-camera updates read as a jagged trail.
      const decimate = shouldDecimateCameraWrites(isScrolling, deltaSeconds, mobile)
      const shouldWriteCamera =
        forceCameraWriteRef.current || (!settled && (!decimate || frameIndex % 2 === 0))

      if (shouldWriteCamera) {
        forceCameraWriteRef.current = false
        try {
          if (typeof currentMap.setFreeCameraOptions === "function") {
            if (!reusableCamera) {
              reusableCamera = new mapboxgl.FreeCameraOptions()
            }
            reusableCamera.position = mapboxgl.MercatorCoordinate.fromLngLat(
              { lng: state.lng, lat: state.lat },
              state.altitude,
            )
            reusableCamera.setPitchBearing(state.pitch, state.bearing)
            currentMap.setFreeCameraOptions(reusableCamera)
          }
        } catch (error) {
          console.error("[v0] Camera update error:", error)
        }
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
