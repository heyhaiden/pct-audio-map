"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { AudioMarker } from "@/types/map"

interface NodeNavigationControlsProps {
  map: any
  marker: AudioMarker
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
}

export function NodeNavigationControls({
  map,
  marker,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: NodeNavigationControlsProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!map) return

    const updatePosition = () => {
      const point = map.project(marker.coordinates)
      const bounds = map.getContainer().getBoundingClientRect()
      setPosition({ x: bounds.left + point.x, y: bounds.top + point.y })
    }

    updatePosition()
    map.on("move", updatePosition)
    map.on("resize", updatePosition)

    return () => {
      map.off("move", updatePosition)
      map.off("resize", updatePosition)
    }
  }, [map, marker])

  if (!position) return null

  return (
    <div
      className="fixed z-40 pointer-events-none"
      style={{ left: position.x, top: position.y }}
      aria-label={`Navigate recordings from ${marker.name}`}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPrevious}
        aria-label="Previous recording"
        className="pointer-events-auto absolute right-6 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-stone-950/80 text-white shadow-xl backdrop-blur-md transition hover:bg-stone-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b9d] disabled:cursor-not-allowed disabled:opacity-25 md:h-10 md:w-10"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next recording"
        className="pointer-events-auto absolute left-6 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-stone-950/80 text-white shadow-xl backdrop-blur-md transition hover:bg-stone-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b9d] disabled:cursor-not-allowed disabled:opacity-25 md:h-10 md:w-10"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
