"use client"

import { CalendarDays, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react"
import type { AudioMarker } from "@/types/map"

interface AudioPlayerProps {
  marker: AudioMarker | null
  onClose: () => void
  isLoading: boolean
  error: string | null
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
}

export function AudioPlayer({
  marker,
  onClose,
  isLoading,
  error,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: AudioPlayerProps) {
  if (!marker) return null

  const dateOnly = marker.recordingDate?.split(" ")[0] || marker.recordingDate

  return (
    <div className="fixed bottom-4 left-3.5 right-3.5 z-40 md:bottom-[34px] md:left-16 md:right-auto md:w-[352px]">
      <div className="pct-glass-panel group relative p-[15px_16px] md:p-[20px_21px]">
        <button
          onClick={onClose}
          className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full text-[#ada396] opacity-100 transition-[color,background-color,opacity] hover:bg-white/10 hover:text-[#ede8dc] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
          aria-label="Close audio player"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8 text-left">
          <h3 className="pct-display text-[21px] font-medium leading-[1.14] text-[#ede8dc] md:text-[26px]">
            {marker.name}
          </h3>

          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#9b8e7a]">
            {dateOnly && (
              <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" />
                {dateOnly}
              </span>
            )}
            {marker.elevation && (
              <span className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                {marker.elevation.toLocaleString("en-US")} ft
              </span>
            )}
            </div>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          {marker.description && (
            <p className="pct-display mt-3 text-[12.5px] font-light leading-[1.6] text-[#ada396] md:text-[13.5px]">
              {marker.description}
            </p>
          )}

          {(isLoading || error) && (
            <div className={`pct-kicker mt-3 flex items-center gap-2 ${error ? "text-red-300" : ""}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-red-400" : "bg-[#ed5a43]"}`} />
              {isLoading ? "Loading soundscape" : "Audio unavailable"}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
            <button
              type="button"
              onClick={onPrevious}
              disabled={!hasPrevious}
              aria-label="Previous recording"
              className="pct-glass-control grid h-10 w-10 place-items-center rounded-full transition hover:border-[#ed5a43]/45 hover:text-[#ed5a43] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#8b8271]">
              Recording
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next recording"
              className="pct-glass-control grid h-10 w-10 place-items-center rounded-full transition hover:border-[#ed5a43]/45 hover:text-[#ed5a43] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
