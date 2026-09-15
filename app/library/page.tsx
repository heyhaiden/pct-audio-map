"use client"

import { useState, useRef, useEffect } from "react"
import { Mountain, ChevronDown } from "lucide-react"
import { audioMarkers } from "@/data/audio-markers"
import { LibraryRecordingCard } from "@/components/audio/library-recording-card"
import { SitePage } from "@/components/navigation/site-page"
import { buildAudioLibraryFolders } from "@/lib/audio-library-folders"
import { resolveAudioUrl } from "@/lib/resolve-audio-url"

const libraryFolders = buildAudioLibraryFolders()

export default function LibraryPage() {
  const [playingId, setPlayingId] = useState<string | null>(null)
  // Percent played per recording. Kept across pause, track switches, and
  // collapsing a chapter, so returning to a recording resumes where you left it.
  const [progress, setProgress] = useState<Record<string, number>>({})
  const progressRef = useRef(progress)
  progressRef.current = progress
  const [durations, setDurations] = useState<Record<string, number>>({})
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
      const audio = new Audio(resolveAudioUrl(audioUrl))
      audioRef.current = audio

      // Resume from the remembered position once we know the duration.
      audio.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setDurations((prev) => ({ ...prev, [markerId]: audio.duration }))
        }
        const resumeAt = progressRef.current[markerId] ?? 0
        if (resumeAt > 0 && resumeAt < 100 && audio.duration) {
          audio.currentTime = (resumeAt / 100) * audio.duration
        }
      })

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

  const handleSeek = (markerId: string, percent: number) => {
    setProgress((prev) => ({ ...prev, [markerId]: percent }))

    // Seek live only if this is the recording currently playing.
    const audio = audioRef.current
    if (playingId === markerId && audio?.duration) {
      audio.currentTime = (percent / 100) * audio.duration
    }
  }

  return (
    <SitePage current="library">
        <main className="pct-stagger mx-auto max-w-4xl px-6 py-12 md:py-20">
          <section className="mb-12 text-center md:mb-16">
            <h1 className="pct-display mb-4 text-[36px] font-normal text-[#f6f1e4] md:text-[48px]">
              Audio <span className="pct-wordmark font-wordmark uppercase text-[#ed5a43]">Library</span>
            </h1>
            <p className="pct-display mx-auto max-w-xl text-prose font-light leading-[1.65] text-[#b4aa9b]">
              Browse and listen to all {audioMarkers.filter((marker) => marker.audioUrl).length} field recordings from the Pacific Crest Trail.
            </p>
          </section>

          {/* Audio listings by chapter */}
          <div className="space-y-4">
            {libraryFolders.map(({ id, title, markers }) => {
              const isExpanded = !!expandedChapters[id]

              return (
                <section
                  key={id}
                  className="pct-glass-panel overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleChapter(id)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.035]"
                  >
                    <Mountain className="h-5 w-5 flex-shrink-0 text-[#ed5a43]" />
                    <h2 className="pct-display min-w-0 flex-1 text-xl font-medium text-[#ede8dc]">
                      {title}
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

                  {isExpanded ? (
                    <div className="space-y-3 px-4 pb-4">
                      {markers.map((marker) => (
                        <LibraryRecordingCard
                          key={marker.id}
                          marker={marker}
                          isPlaying={playingId === marker.id}
                          progress={progress[marker.id] || 0}
                          durationSeconds={durations[marker.id] || 0}
                          onPlayPause={() => handlePlayPause(marker.id, marker.audioUrl)}
                          onSeek={(percent) => handleSeek(marker.id, percent)}
                          onDuration={(seconds) =>
                            setDurations((prev) =>
                              prev[marker.id] ? prev : { ...prev, [marker.id]: seconds },
                            )
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        </main>

        <footer className="mt-12 border-t border-[#ed5a43]/10 py-8">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="font-mono text-micro uppercase tracking-[0.14em] text-[#6b6455]">
              Offbeat: Soundscapes of the PCT · Field recordings collected 2025
            </p>
          </div>
        </footer>
    </SitePage>
  )
}
