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
  const { isPlaying, currentTime, duration, isLoading, error, loadTrack, play, pause } = useAudioPlayer()

  useEffect(() => {
    if (marker) {
      loadTrack(marker.audioUrl)
    }
  }, [marker, loadTrack])

  if (!marker) return null

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
      <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-6 text-white shadow-2xl border border-white/20">
        {/* Header with close button */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-xl text-balance leading-tight">{marker.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors ml-3 flex-shrink-0"
            aria-label="Close audio player"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {marker.description && <p className="text-sm text-gray-300 mb-4 leading-relaxed">{marker.description}</p>}

        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ff6b9d] to-[#ff8fb3] transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          {/* Previous marker button */}
          <button
            onClick={onPreviousMarker}
            disabled={!hasPrevious}
            className="p-2.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous marker"
            title="Previous marker"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Play/Pause button (centered and larger) */}
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
            className="p-2.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next marker"
            title="Next marker"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-white/10">
          <div className="flex items-center gap-4">
            {marker.recordingDate && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {marker.recordingDate}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {marker.elevation.toLocaleString()} ft
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-400 text-center bg-red-500/10 rounded-lg py-2 px-3">{error}</div>
        )}
      </div>
    </div>
  )
}
