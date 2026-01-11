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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
      <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-4 text-white shadow-2xl border border-white/20">
        {/* Header with close button */}
        <div className="flex items-center justify-between gap-3">
          {/* Previous marker button */}
          <button
            onClick={onPreviousMarker}
            disabled={!hasPrevious}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Previous marker"
            title="Previous marker"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Title and play button */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Play/Pause button */}
            <button
              onClick={isPlaying ? pause : play}
              disabled={isLoading}
              className="p-3 bg-gradient-to-br from-[#ff6b9d] to-[#ff5a8a] hover:from-[#ff5a8a] hover:to-[#ff4979] rounded-full transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Title and info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{marker.name}</h3>
              {marker.description && <p className="text-xs text-gray-300 truncate">{marker.description}</p>}
              <p className="text-xs text-gray-400">
                {marker.recordingDate} · {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
          </div>

          {/* Next marker button */}
          <button
            onClick={onNextMarker}
            disabled={!hasNext}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Next marker"
            title="Next marker"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            aria-label="Close audio player"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-2 text-xs text-red-400 text-center bg-red-500/10 rounded-lg py-1.5 px-2">{error}</div>
        )}
      </div>
    </div>
  )
}
