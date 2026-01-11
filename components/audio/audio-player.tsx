"use client"

import { useEffect } from "react"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import type { AudioMarker } from "@/types/map"

interface AudioPlayerProps {
  marker: AudioMarker | null
  onClose: () => void
  onNextMarker: () => void
  onPreviousMarker: () => void
  hasNext: boolean
  hasPrevious: boolean
}

export function AudioPlayer({
  marker,
  onClose,
  onNextMarker,
  onPreviousMarker,
  hasNext,
  hasPrevious,
}: AudioPlayerProps) {
  const { isPlaying, isLoading, error, loadTrack, play, pause } = useAudioPlayer()

  useEffect(() => {
    if (marker) {
      loadTrack(marker.audioUrl)
    }
  }, [marker, loadTrack])

  if (!marker) return null

  const dateOnly = marker.recordingDate?.split(" ")[0] || marker.recordingDate

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
      <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-4 text-white shadow-2xl border border-white/20">
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

        {/* Play controls - centered */}
        <div className="flex items-center justify-center gap-4">
          {/* Previous marker button */}
          <button
            onClick={onPreviousMarker}
            disabled={!hasPrevious}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous marker"
            title="Previous marker"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Play/Pause button */}
          <button
            onClick={isPlaying ? pause : play}
            disabled={isLoading}
            className="p-4 bg-gradient-to-br from-[#ff6b9d] to-[#ff5a8a] hover:from-[#ff5a8a] hover:to-[#ff4979] rounded-full transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next marker button */}
          <button
            onClick={onNextMarker}
            disabled={!hasNext}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next marker"
            title="Next marker"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-white/20">
          <div className="flex items-center justify-between text-xs text-gray-400 px-4">
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
                {marker.elevation.toLocaleString()} ft
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
