"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, MapPin, Mountain, ChevronDown } from "lucide-react"
import { audioMarkers } from "@/data/audio-markers"
import { SitePage } from "@/components/navigation/site-page"

// Chapter display names
const chapterNames: Record<string, string> = {
  "southern-california": "Southern California",
  "sierra-nevada": "Sierra Nevada",
  "northern-california": "Northern California",
  "oregon-cascades": "Oregon",
  "washington-cascades": "Washington",
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
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({})
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

  const toggleChapter = (chapterKey: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterKey]: !prev[chapterKey],
    }))
  }

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
    <SitePage current="library">
        <main className="mx-auto max-w-4xl px-6 py-12 md:py-20">
          <section className="mb-12 text-center md:mb-16">
            <h1 className="pct-display mb-4 text-[36px] font-normal text-[#f6f1e4] md:text-[48px]">
              Audio <span className="text-[#ed5a43]">Library</span>
            </h1>
            <p className="pct-display mx-auto max-w-xl text-[13.5px] font-light leading-[1.65] text-[#b4aa9b]">
              Browse and listen to all {audioMarkers.length} field recordings from the Pacific Crest Trail.
            </p>
          </section>

          {/* Audio listings by chapter */}
          <div className="space-y-4">
            {chapterOrder.map((chapterKey) => {
              const markers = groupedMarkers[chapterKey]
              if (!markers || markers.length === 0) return null

              const isExpanded = !!expandedChapters[chapterKey]

              return (
                <section
                  key={chapterKey}
                  className="pct-glass-panel overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleChapter(chapterKey)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.035]"
                  >
                    <Mountain className="h-5 w-5 flex-shrink-0 text-[#ed5a43]" />
                    <h2 className="pct-display min-w-0 flex-1 text-xl font-medium text-[#ede8dc]">
                      {chapterNames[chapterKey]}
                      <span className="ml-2 text-sm font-normal text-stone-500">
                        ({markers.length} recordings)
                      </span>
                    </h2>
                    <ChevronDown
                      className={`h-5 w-5 flex-shrink-0 text-[#8b8271] transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 px-4 pb-4">
                      {markers.map((marker) => {
                        const isPlaying = playingId === marker.id
                        const currentProgress = progress[marker.id] || 0

                        return (
                          <div
                            key={marker.id}
                            className={`relative overflow-hidden rounded-[6px] border p-4 backdrop-blur-[14px] transition-all duration-300 ${
                              isPlaying
                                ? "border-[#ed5a43]/35 bg-[rgba(15,14,12,0.88)]"
                                : "border-white/10 bg-[rgba(15,14,12,0.62)] hover:border-white/20"
                            }`}
                          >
                            {/* Progress bar background */}
                            <div
                              className="absolute inset-0 bg-[#ed5a43]/10 transition-all duration-200"
                              style={{ width: `${currentProgress}%` }}
                            />

                            <div className="relative flex items-start gap-4">
                              {/* Play button */}
                              <button
                                onClick={() => handlePlayPause(marker.id, marker.audioUrl)}
                                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                                  isPlaying
                                    ? "border-[#ed5a43] bg-[#ed5a43] text-white"
                                    : "border-white/20 bg-[rgba(12,11,9,0.62)] text-[#ada396] hover:border-[#ed5a43]/45 hover:text-[#ed5a43]"
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
                                <h3 className="pct-display text-[18px] font-medium text-[#ede8dc]">
                                  {marker.name}
                                </h3>
                                <p className="pct-display mt-1 text-[12.5px] font-light leading-[1.6] text-[#ada396]">
                                  {marker.description}
                                </p>
                              </div>

                              {/* Metadata */}
                              <div className="hidden sm:flex flex-col items-end text-right">
                                <div className="flex items-center gap-1 text-xs text-stone-500">
                                  <MapPin className="w-3 h-3" />
                                  {marker.elevation.toLocaleString("en-US")} ft
                                </div>
                                <p className="text-xs text-stone-600">{marker.recordingDate}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </main>

        <footer className="mt-12 border-t border-[#ed5a43]/10 py-8">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#6b6455]">
              PCT Soundscapes · Field recordings collected 2025
            </p>
          </div>
        </footer>
    </SitePage>
  )
}
