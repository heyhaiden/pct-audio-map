"use client"

import { useEffect, useState, useRef } from "react"

interface TrailScrollOptions {
  map: any
  trailCoordinates: number[][]
  enabled: boolean
  onProgressChange?: (progress: number, coordinates: [number, number]) => void
}

export function useTrailScroll({ map, trailCoordinates, enabled, onProgressChange }: TrailScrollOptions) {
  const [scrollProgress, setScrollProgress] = useState(0)
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

  useEffect(() => {
    if (!map || !enabled || !trailCoordinates.length) return

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrolled = window.scrollY
      const progress = Math.max(0, Math.min(1, scrolled / scrollHeight))

      targetProgress.current = progress
      setScrollProgress(progress)
      lastScrollTime.current = Date.now()

      if (!isAnimating.current) {
        isAnimating.current = true
        animateCamera()
      }
    }

    const calculateSmoothedBearing = (index: number): number => {
      const lookAheadDistance = Math.min(50, Math.floor(trailCoordinates.length * 0.02))
      const currentIndex = Math.floor(index)
      const futureIndex = Math.min(currentIndex + lookAheadDistance, trailCoordinates.length - 1)

      if (currentIndex >= trailCoordinates.length - 1) return 0

      const current = trailCoordinates[currentIndex]
      const future = trailCoordinates[futureIndex]

      const deltaLng = future[0] - current[0]
      const deltaLat = future[1] - current[1]

      let bearing = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI

      bearing = Math.max(-45, Math.min(45, bearing))

      return bearing
    }

    const animateCamera = () => {
      const ease = 0.25
      currentProgress.current += (targetProgress.current - currentProgress.current) * ease

      const index = currentProgress.current * (trailCoordinates.length - 1)
      const lowerIndex = Math.floor(index)
      const upperIndex = Math.ceil(index)
      const fraction = index - lowerIndex

      if (lowerIndex >= 0 && upperIndex < trailCoordinates.length) {
        const lowerCoord = trailCoordinates[lowerIndex]
        const upperCoord = trailCoordinates[upperIndex]

        const targetLng = lowerCoord[0] + (upperCoord[0] - lowerCoord[0]) * fraction
        const targetLat = lowerCoord[1] + (upperCoord[1] - lowerCoord[1]) * fraction

        onProgressChange?.(currentProgress.current, [targetLng, targetLat])

        if (!isInitialized.current) {
          smoothedLng.current = targetLng
          smoothedLat.current = targetLat
          isInitialized.current = true
        }

        coordinateHistory.current.push([targetLng, targetLat])
        if (coordinateHistory.current.length > 4) {
          coordinateHistory.current.shift()
        }

        const avgLng =
          coordinateHistory.current.reduce((sum, coord) => sum + coord[0], 0) / coordinateHistory.current.length
        const avgLat =
          coordinateHistory.current.reduce((sum, coord) => sum + coord[1], 0) / coordinateHistory.current.length

        const positionSmoothing = 0.12
        smoothedLng.current += (avgLng - smoothedLng.current) * positionSmoothing
        smoothedLat.current += (avgLat - smoothedLat.current) * positionSmoothing

        const targetBearing = calculateSmoothedBearing(index)
        currentBearing.current += (targetBearing - currentBearing.current) * 0.15

        map.easeTo({
          center: [smoothedLng.current, smoothedLat.current],
          zoom: 13.5,
          pitch: 70,
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
      }
    }
  }, [map, trailCoordinates, enabled, onProgressChange])

  return { scrollProgress }
}
