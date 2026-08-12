"use client"

import { CalendarDays, MapPin, X } from "lucide-react"
import type { AudioMarker } from "@/types/map"

interface AudioPlayerProps {
  marker: AudioMarker | null
  onClose: () => void
  isLoading: boolean
  error: string | null
}

export function AudioPlayer({ marker, onClose, isLoading, error }: AudioPlayerProps) {
  if (!marker) return null

  const dateOnly = marker.recordingDate?.split(" ")[0] || marker.recordingDate

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
      <div className="relative bg-black/70 backdrop-blur-xl rounded-2xl p-4 text-white shadow-2xl border border-white/20">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b9d]"
          aria-label="Close audio player"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-left mb-4 pr-8">
          <h3 className="font-semibold text-base">{marker.name}</h3>
          {marker.description && <p className="text-sm text-gray-300 mt-1 line-clamp-2">{marker.description}</p>}
        </div>

        <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-stone-300">
          <span className={`h-2 w-2 rounded-full ${error ? "bg-red-400" : "bg-[#ff6b9d]"}`} />
          <span>{isLoading ? "Loading soundscape" : error ? "Audio unavailable" : "Listening"}</span>
        </div>

        <div className="mt-4 pt-3 border-t border-white/20">
          <div className="flex items-center justify-between text-xs text-gray-400">
            {dateOnly && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {dateOnly}
              </span>
            )}
            {marker.elevation && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {marker.elevation.toLocaleString("en-US")} ft
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 text-xs text-red-400 text-center bg-red-500/10 rounded-lg py-1.5 px-2">{error}</div>
        )}
      </div>
    </div>
  )
}
