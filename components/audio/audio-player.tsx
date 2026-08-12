"use client"

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
          className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Close audio player"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {dateOnly}
              </span>
            )}
            {marker.elevation && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
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
