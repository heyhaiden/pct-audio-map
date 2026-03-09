"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Play, Pause, MapPin, Mountain } from "lucide-react"
import { audioMarkers } from "@/data/audio-markers"

// Chapter display names
const chapterNames: Record<string, string> = {
  "southern-california": "Southern California",
  "sierra-nevada": "Sierra Nevada",
  "northern-california": "Northern California",
  "oregon-cascades": "Oregon Cascades",
  "washington-cascades": "Washington Cascades",
}

// Group markers by chapter
function groupByChapter() {
  const grouped: Record<string, typeof audioMarkers> = {}
  for (const marker of audioMarkers) {
    if (!grouped[marker.chapter]) {
      grouped[marker.chapter] = []
    }
    grouped[marker.chapter].push(marker)
  }
  return grouped
}

export default function LibraryPage() {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const groupedMarkers = groupByChapter()

  // Chapter order
  const chapterOrder = [
    "southern-california",
    "sierra-nevada",
    "northern-california",
    "oregon-cascades",
    "washington-cascades",
  ]

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const handlePlayPause = (markerId: string, audioUrl: string) => {
    if (playingId === markerId) {
      // Pause current
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      // Stop previous
      if (audioRef.current) {
        audioRef.current.pause()
      }

      // Play new
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.addEventListener("timeupdate", () => {
        if (audio.duration) {
          setProgress((prev) => ({
            ...prev,
            [markerId]: (audio.currentTime / audio.duration) * 100,
          }))
        }
      })

      audio.addEventListener("ended", () => {
        setPlayingId(null)
        setProgress((prev) => ({ ...prev, [markerId]: 0 }))
      })

      audio.play().catch(() => {
        // Audio file not found, silently fail
        setPlayingId(null)
      })
      setPlayingId(markerId)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 animate-in fade-in duration-500">
      {/* Background pattern */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q25 30 50 50 T100 50' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 60 Q25 40 50 60 T100 60' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 70 Q25 50 50 70 T100 70' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 bg-stone-950/80 backdrop-blur-md border-b border-stone-800/50 z-50">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Map</span>
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
          {/* Hero section */}
          <section className="text-center mb-12 md:mb-16">
            <h1 className="text-3xl md:text-5xl font-light text-white mb-4">
              Audio <span className="font-semibold text-[#ff6b9d]">Library</span>
            </h1>
            <p className="text-lg text-stone-400 max-w-2xl mx-auto">
              Browse and listen to all {audioMarkers.length} field recordings from the Pacific Crest Trail.
            </p>
          </section>

          {/* Audio listings by chapter */}
          <div className="space-y-12">
            {chapterOrder.map((chapterKey) => {
              const markers = groupedMarkers[chapterKey]
              if (!markers || markers.length === 0) return null

              return (
                <section key={chapterKey}>
                  <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                    <Mountain className="w-5 h-5 text-[#ff6b9d]" />
                    {chapterNames[chapterKey]}
                    <span className="text-sm font-normal text-stone-500">
                      ({markers.length} recordings)
                    </span>
                  </h2>

                  <div className="space-y-3">
                    {markers.map((marker) => {
                      const isPlaying = playingId === marker.id
                      const currentProgress = progress[marker.id] || 0

                      return (
                        <div
                          key={marker.id}
                          className={`relative bg-stone-900/50 border rounded-xl p-4 transition-all duration-300 ${
                            isPlaying
                              ? "border-[#ff6b9d]/50 bg-stone-900/80"
                              : "border-stone-800/50 hover:border-stone-700/50"
                          }`}
                        >
                          {/* Progress bar background */}
                          <div
                            className="absolute inset-0 bg-[#ff6b9d]/10 rounded-xl transition-all duration-200"
                            style={{ width: `${currentProgress}%` }}
                          />

                          <div className="relative flex items-center gap-4">
                            {/* Play button */}
                            <button
                              onClick={() => handlePlayPause(marker.id, marker.audioUrl)}
                              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                isPlaying
                                  ? "bg-[#ff6b9d] text-white"
                                  : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white"
                              }`}
                              aria-label={isPlaying ? "Pause" : "Play"}
                            >
                              {isPlaying ? (
                                <Pause className="w-5 h-5" />
                              ) : (
                                <Play className="w-5 h-5 ml-0.5" />
                              )}
                            </button>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium truncate">
                                {marker.name}
                              </h3>
                              <p className="text-sm text-stone-400 truncate">
                                {marker.description}
                              </p>
                            </div>

                            {/* Metadata */}
                            <div className="hidden sm:flex flex-col items-end text-right">
                              <div className="flex items-center gap-1 text-xs text-stone-500">
                                <MapPin className="w-3 h-3" />
                                {marker.elevation.toLocaleString()} ft
                              </div>
                              <p className="text-xs text-stone-600">{marker.recordingDate}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-stone-800/50 py-8 mt-12">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-xs text-stone-600">
              PCT Soundscapes - Field recordings collected 2025
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
