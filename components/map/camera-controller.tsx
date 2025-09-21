"use client"

import { useEffect, useState } from "react"
import type mapboxgl from "mapbox-gl"
import { useCameraPath } from "@/hooks/use-camera-path"
import { generateCameraPath } from "@/utils/camera-path"
import type { CameraPosition } from "@/types/map"

interface CameraControllerProps {
  map: mapboxgl.Map | null
  isPlaying: boolean
  onPlayStateChange: (playing: boolean) => void
  segments: Array<{ camera: CameraPosition }>
}

export function CameraController({ map, isPlaying, onPlayStateChange, segments }: CameraControllerProps) {
  const { animateAlongPath, stopAnimation, easingFunctions } = useCameraPath(map)
  const [progress, setProgress] = useState(0)

  // Create cinematic tour of all segments
  const startCinematicTour = () => {
    if (!map || segments.length === 0) return

    const cameraPositions = segments.map((segment) => segment.camera)

    // Generate smooth path between segments
    const smoothPath: CameraPosition[] = []
    for (let i = 0; i < cameraPositions.length - 1; i++) {
      const pathSegment = generateCameraPath(cameraPositions[i], cameraPositions[i + 1], 5)
      smoothPath.push(...pathSegment)
    }

    onPlayStateChange(true)
    setProgress(0)

    animateAlongPath(smoothPath, {
      easing: easingFunctions.easeInOutCubic,
      onProgress: setProgress,
      onComplete: () => {
        onPlayStateChange(false)
        setProgress(0)
      },
    })
  }

  const stopTour = () => {
    stopAnimation()
    onPlayStateChange(false)
    setProgress(0)
  }

  useEffect(() => {
    if (isPlaying) {
      startCinematicTour()
    } else {
      stopTour()
    }
  }, [isPlaying])

  return (
    <div className="absolute bottom-6 left-6 z-10">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPlayStateChange(!isPlaying)}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff6b9d] hover:bg-[#ff5a8a] rounded-lg transition-colors"
          >
            {isPlaying ? (
              <>
                <div className="w-3 h-3 bg-white rounded-sm"></div>
                <span className="text-sm font-medium">Stop Tour</span>
              </>
            ) : (
              <>
                <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent"></div>
                <span className="text-sm font-medium">Cinematic Tour</span>
              </>
            )}
          </button>

          {isPlaying && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ff6b9d] transition-all duration-300 ease-out"
                  style={{ width: `${progress * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-300">{Math.round(progress * 100)}%</span>
            </div>
          )}
        </div>

        {!isPlaying && <p className="text-xs text-gray-400 mt-2">Take a cinematic journey along the entire PCT</p>}
      </div>
    </div>
  )
}
