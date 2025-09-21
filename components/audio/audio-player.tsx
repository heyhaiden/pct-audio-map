"use client"

import { useEffect } from "react"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import type { AudioMarker } from "@/types/map"

interface AudioPlayerProps {
  marker: AudioMarker | null
  onClose: () => void
}

export function AudioPlayer({ marker, onClose }: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, volume, isLoading, error, loadTrack, play, pause, seek, setVolume } =
    useAudioPlayer()

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
      <div className="bg-black/90 backdrop-blur-sm rounded-xl p-6 text-white shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-balance">{marker.name}</h3>
            <p className="text-sm text-gray-400 mt-1">Elevation: {marker.elevation.toLocaleString()} ft</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close audio player"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div
            className="w-full h-2 bg-white/20 rounded-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const percentage = x / rect.width
              seek(percentage * duration)
            }}
          >
            <div
              className="h-full bg-[#ff6b9d] rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => seek(Math.max(0, currentTime - 10))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Rewind 10 seconds"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
              />
            </svg>
          </button>

          <button
            onClick={isPlaying ? pause : play}
            disabled={isLoading}
            className="p-3 bg-[#ff6b9d] hover:bg-[#ff5a8a] rounded-full transition-colors disabled:opacity-50"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => seek(Math.min(duration, currentTime + 10))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Forward 10 seconds"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
              />
            </svg>
          </button>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          <div
            className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const percentage = x / rect.width
              setVolume(percentage)
            }}
          >
            <div
              className="h-full bg-white rounded-full transition-all duration-150"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-8">{Math.round(volume * 100)}</span>
        </div>

        {error && <div className="mt-3 text-sm text-red-400 text-center">{error}</div>}
      </div>
    </div>
  )
}
