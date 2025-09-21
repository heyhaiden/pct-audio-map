"use client"

import { useCallback, useRef } from "react"
import type { CameraPosition } from "@/types/map"

interface CameraPathOptions {
  easing?: (t: number) => number
  onComplete?: () => void
  onProgress?: (progress: number) => void
}

export function useCameraPath(map: any) {
  const animationRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)

  // Custom easing functions for cinematic camera movements
  const easingFunctions = {
    // Smooth acceleration and deceleration
    easeInOutCubic: (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    },
    // Gentle start, strong finish
    easeOutQuart: (t: number): number => {
      return 1 - Math.pow(1 - t, 4)
    },
    // Cinematic ease with slight overshoot
    easeOutBack: (t: number): number => {
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    },
  }

  const interpolateCamera = useCallback(
    (start: CameraPosition, end: CameraPosition, progress: number): CameraPosition => {
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t

      // Interpolate longitude with consideration for crossing 180/-180
      let lngDiff = end.center[0] - start.center[0]
      if (Math.abs(lngDiff) > 180) {
        lngDiff = lngDiff > 0 ? lngDiff - 360 : lngDiff + 360
      }

      return {
        center: [start.center[0] + lngDiff * progress, lerp(start.center[1], end.center[1], progress)],
        zoom: lerp(start.zoom, end.zoom, progress),
        pitch: lerp(start.pitch, end.pitch, progress),
        bearing: lerp(start.bearing, end.bearing, progress),
        duration: end.duration,
      }
    },
    [],
  )

  const animateToPosition = useCallback(
    (targetPosition: CameraPosition, options: CameraPathOptions = {}) => {
      if (!map || isAnimatingRef.current) return

      const { easing = easingFunctions.easeInOutCubic, onComplete, onProgress } = options

      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      isAnimatingRef.current = true

      // Get current camera position
      const startPosition: CameraPosition = {
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        duration: targetPosition.duration,
      }

      const startTime = performance.now()
      const duration = targetPosition.duration

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const rawProgress = Math.min(elapsed / duration, 1)
        const easedProgress = easing(rawProgress)

        // Interpolate camera position
        const currentPosition = interpolateCamera(startPosition, targetPosition, easedProgress)

        // Apply camera position
        map.jumpTo({
          center: currentPosition.center as [number, number],
          zoom: currentPosition.zoom,
          pitch: currentPosition.pitch,
          bearing: currentPosition.bearing,
        })

        // Call progress callback
        onProgress?.(easedProgress)

        if (rawProgress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          isAnimatingRef.current = false
          animationRef.current = null
          onComplete?.()
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    },
    [map, interpolateCamera],
  )

  const animateAlongPath = useCallback(
    (positions: CameraPosition[], options: CameraPathOptions = {}) => {
      if (!map || positions.length === 0) return

      let currentIndex = 0

      const animateNext = () => {
        if (currentIndex >= positions.length) {
          options.onComplete?.()
          return
        }

        const position = positions[currentIndex]
        animateToPosition(position, {
          ...options,
          onComplete: () => {
            currentIndex++
            // Small delay between segments for cinematic effect
            setTimeout(animateNext, 500)
          },
          onProgress: (progress) => {
            const totalProgress = (currentIndex + progress) / positions.length
            options.onProgress?.(totalProgress)
          },
        })
      }

      animateNext()
    },
    [map, animateToPosition],
  )

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
      isAnimatingRef.current = false
    }
  }, [])

  return {
    animateToPosition,
    animateAlongPath,
    stopAnimation,
    isAnimating: isAnimatingRef.current,
    easingFunctions,
  }
}
