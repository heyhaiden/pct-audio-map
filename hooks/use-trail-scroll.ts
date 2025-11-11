"use client"

import { useEffect, useState, useRef } from "react"

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
}

const PCT_TOTAL_MILES = 2650

function calculateCumulativeDistances(coordinates: number[][]): number[] {
  const distances = [0]
  let totalDistance = 0

  for (let i = 1; i < coordinates.length; i++) {
    const [lng1, lat1] = coordinates[i - 1]
    const [lng2, lat2] = coordinates[i]

    // Haversine formula for geographic distance
    const R = 6371 // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    totalDistance += distance
    distances.push(totalDistance)
  }

  return distances
}

export function useTrailScroll({
  map,
  trailCoordinates,
  enabled,
  onProgressChange,
}: TrailScrollOptions): TrailScrollReturn {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentMiles, setCurrentMiles] = useState(0)
  const animationFrameRef = useRef<number | null>(null)
  const lastScrollTime = useRef(Date.now())
  const targetProgress = useRef(0)
  const currentProgress = useRef(0)
  const isAnimating = useRef(false)
  const currentBearing = useRef(0)
  const smoothedLng = useRef(0)
  const smoothedLat = useRef(0)
  const isInitialized = useRef(false)
  const coordinateHistory = useRef<Array<[number, number]>>([])
  const cumulativeDistances = useRef<number[]>([])
  const onProgressChangeRef = useRef(onProgressChange)

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange
  }, [onProgressChange])

  useEffect(() => {
    if (trailCoordinates.length > 0) {
      cumulativeDistances.current = calculateCumulativeDistances(trailCoordinates)
    }
  }, [trailCoordinates])

  useEffect(() => {
    if (!map || !enabled || !trailCoordinates.length) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      isAnimating.current = false
      return
    }

    const handleScroll = () => {
      if (!enabled) return

      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrolled = window.scrollY
      const progress = Math.max(0, Math.min(1, scrolled / scrollHeight))

      targetProgress.current = progress
      setScrollProgress(progress)
      lastScrollTime.current = Date.now()

      if (!isAnimating.current) {
        isAnimating.current = true
        if ("requestIdleCallback" in window) {
          ;(window as any).requestIdleCallback(
            () => {
              animateCamera()
            },
            { timeout: 16 },
          )
        } else {
          animateCamera()
        }
      }
    }

    const calculateSmoothedBearing = (index: number): number => {
      const lookAheadDistance = Math.min(150, Math.floor(trailCoordinates.length * 0.05))
      const currentIndex = Math.floor(index)
      const futureIndex = Math.min(currentIndex + lookAheadDistance, trailCoordinates.length - 1)

      if (currentIndex >= trailCoordinates.length - 1) return 0

      const current = trailCoordinates[currentIndex]
      const future = trailCoordinates[futureIndex]

      const deltaLng = future[0] - current[0]
      const deltaLat = future[1] - current[1]

      let bearing = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI

      bearing = Math.max(-90, Math.min(90, bearing))

      return bearing
    }

    const animateCamera = () => {
      if (!enabled) {
        isAnimating.current = false
        return
      }

      const ease = 0.18
      const rawDelta = targetProgress.current - currentProgress.current

      const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }

      const normalizedDelta = Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), 1)
      const easedDelta = easeInOutCubic(Math.abs(normalizedDelta)) * Math.sign(normalizedDelta)

      currentProgress.current += easedDelta * ease

      const currentDistanceInMiles = currentProgress.current * PCT_TOTAL_MILES
      setCurrentMiles(currentDistanceInMiles)

      const distances = cumulativeDistances.current
      if (distances.length === 0) return

      const totalDistance = distances[distances.length - 1]
      const targetDistance = currentProgress.current * totalDistance

      let lowerIndex = 0
      for (let i = 0; i < distances.length - 1; i++) {
        if (distances[i] <= targetDistance && targetDistance <= distances[i + 1]) {
          lowerIndex = i
          break
        }
      }

      const upperIndex = Math.min(lowerIndex + 1, trailCoordinates.length - 1)
      const lowerDistance = distances[lowerIndex]
      const upperDistance = distances[upperIndex]
      const segmentDistance = upperDistance - lowerDistance

      const fraction = segmentDistance > 0 ? (targetDistance - lowerDistance) / segmentDistance : 0

      if (lowerIndex >= 0 && upperIndex < trailCoordinates.length) {
        const lowerCoord = trailCoordinates[lowerIndex]
        const upperCoord = trailCoordinates[upperIndex]

        // Interpolate between points for smooth animation
        const targetLng = lowerCoord[0] + (upperCoord[0] - lowerCoord[0]) * fraction
        const targetLat = lowerCoord[1] + (upperCoord[1] - lowerCoord[1]) * fraction

        // Update position cursor with smoothly interpolated coordinates
        onProgressChangeRef.current?.(currentProgress.current, [targetLng, targetLat])

        if (!isInitialized.current) {
          smoothedLng.current = targetLng
          smoothedLat.current = targetLat
          isInitialized.current = true
        }

        coordinateHistory.current.push([targetLng, targetLat])
        if (coordinateHistory.current.length > 2) {
          coordinateHistory.current.shift()
        }

        const avgLng =
          coordinateHistory.current.reduce((sum, coord) => sum + coord[0], 0) / coordinateHistory.current.length
        const avgLat =
          coordinateHistory.current.reduce((sum, coord) => sum + coord[1], 0) / coordinateHistory.current.length

        const positionSmoothing = 0.25 // Increased from 0.1 for quicker stop
        smoothedLng.current += (avgLng - smoothedLng.current) * positionSmoothing
        smoothedLat.current += (avgLat - smoothedLat.current) * positionSmoothing

        const targetBearing = calculateSmoothedBearing(lowerIndex + fraction)
        const bearingSmoothing = 0.2 // Increased from 0.05 for quicker bearing changes
        currentBearing.current += (targetBearing - currentBearing.current) * bearingSmoothing

        map.easeTo({
          center: [smoothedLng.current, smoothedLat.current],
          zoom: 14.5,
          pitch: 75,
          bearing: currentBearing.current,
          duration: 0,
          easing: (t: number) => t,
        })
      }

      if (Math.abs(targetProgress.current - currentProgress.current) > 0.001) {
        animationFrameRef.current = requestAnimationFrame(animateCamera)
      } else {
        isAnimating.current = false
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      isAnimating.current = false
    }
  }, [map, trailCoordinates, enabled])

  return {
    scrollProgress,
    currentMiles,
    totalMiles: PCT_TOTAL_MILES,
  }
}
