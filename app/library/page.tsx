"use client"

import { useState, useRef, useEffect } from "react"
import { audioMarkers } from "@/data/audio-markers"
import { LibraryChapter } from "@/components/audio/library-chapter"
import { SitePage } from "@/components/navigation/site-page"
import { endingFadeVolume, rampVolume } from "@/lib/audio-crossfade"
import { buildAudioLibraryFolders } from "@/lib/audio-library-folders"
import { resolveAudioUrl } from "@/lib/resolve-audio-url"

const PLAYBACK_FADE_MS = 360
const END_FADE_MS = 2000

const libraryFolders = buildAudioLibraryFolders()

export default function LibraryPage() {
  const [playingId, setPlayingId] = useState<string | null>(null)
  // Percent played per recording. Kept across pause, track switches, and
  // collapsing a chapter, so returning to a recording resumes where you left it.
  const [progress, setProgress] = useState<Record<string, number>>({})
  const progressRef = useRef(progress)
  progressRef.current = progress
  const [durations, setDurations] = useState<Record<string, number>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadingOutId = useRef<string | null>(null)
  const rampCancels = useRef(new Map<HTMLAudioElement, () => void>())
  const endFadeFrame = useRef(0)

  const cancelEndFade = () => {
    if (!endFadeFrame.current) return
    cancelAnimationFrame(endFadeFrame.current)
    endFadeFrame.current = 0
  }

  const ramp = (audio: HTMLAudioElement, to: number, onDone?: () => void) => {
    rampCancels.current.get(audio)?.()
    const from = audio.volume
    const started = performance.now()
    let frame = 0
    let cancelled = false
    const step = (now: number) => {
      if (cancelled) return
      const progress = Math.min(1, (now - started) / PLAYBACK_FADE_MS)
      audio.volume = rampVolume(progress, from, to)
      if (progress < 1) {
        frame = requestAnimationFrame(step)
        return
      }
      rampCancels.current.delete(audio)
      onDone?.()
    }
    frame = requestAnimationFrame(step)
    const cancel = () => {
      cancelled = true
      cancelAnimationFrame(frame)
      rampCancels.current.delete(audio)
    }
    rampCancels.current.set(audio, cancel)
  }

  useEffect(() => {
    const cancels = rampCancels.current
    return () => {
      if (endFadeFrame.current) cancelAnimationFrame(endFadeFrame.current)
      for (const cancel of cancels.values()) cancel()
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const handlePlayPause = (markerId: string, audioUrl: string) => {
    const current = audioRef.current

    if (playingId === markerId && current) {
      if (fadingOutId.current === markerId) {
        fadingOutId.current = null
        void current.play()
        ramp(current, 1)
        return
      }

      fadingOutId.current = markerId
      cancelEndFade()
      ramp(current, 0, () => {
        current.pause()
        if (audioRef.current === current && fadingOutId.current === markerId) {
          fadingOutId.current = null
          setPlayingId(null)
        }
      })
      return
    }

    cancelEndFade()
    fadingOutId.current = null
    if (current) {
      const outgoing = current
      ramp(outgoing, 0, () => {
        outgoing.pause()
      })
    }

    const audio = new Audio(resolveAudioUrl(audioUrl))
    audio.volume = 0
    audioRef.current = audio

    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurations((prev) => ({ ...prev, [markerId]: audio.duration }))
      }
      const resumeAt = progressRef.current[markerId] ?? 0
      if (resumeAt > 0 && resumeAt < 100 && audio.duration) {
        audio.currentTime = (resumeAt / 100) * audio.duration
      }
    })

    let fadingTail = false

    const syncEndFade = () => {
      endFadeFrame.current = 0
      if (audioRef.current !== audio || audio.paused || !audio.duration) return
      if (fadingOutId.current === markerId || rampCancels.current.has(audio)) return

      const tail = endingFadeVolume(audio.currentTime, audio.duration, END_FADE_MS)
      if (tail === null) {
        if (fadingTail) audio.volume = 1
        fadingTail = false
        return
      }

      fadingTail = true
      audio.volume = tail
      if (audio.duration - audio.currentTime > 0.016) {
        endFadeFrame.current = requestAnimationFrame(syncEndFade)
      }
    }

    const scheduleEndFade = () => {
      if (audioRef.current !== audio || !audio.duration) return
      if (fadingOutId.current === markerId || rampCancels.current.has(audio)) return
      if (endingFadeVolume(audio.currentTime, audio.duration, END_FADE_MS) === null) {
        if (fadingTail && !audio.paused) audio.volume = 1
        fadingTail = false
        return
      }
      if (!endFadeFrame.current) endFadeFrame.current = requestAnimationFrame(syncEndFade)
    }

    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        setProgress((prev) => ({
          ...prev,
          [markerId]: (audio.currentTime / audio.duration) * 100,
        }))
      }
      scheduleEndFade()
    })

    audio.addEventListener("seeked", scheduleEndFade)

    audio.addEventListener("ended", () => {
      cancelEndFade()
      setPlayingId(null)
      setProgress((prev) => ({ ...prev, [markerId]: 0 }))
    })

    audio.play().then(() => {
      if (audioRef.current !== audio || fadingOutId.current === markerId) return
      ramp(audio, 1)
    }).catch(() => {
      setPlayingId(null)
    })
    setPlayingId(markerId)
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
          <div className="space-y-8">
            {libraryFolders.map(({ id, title, markers }) => (
              <LibraryChapter
                key={id}
                title={title}
                markers={markers}
                playingId={playingId}
                progress={progress}
                durations={durations}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
              />
            ))}
          </div>
        </main>

        <footer className="mt-12 border-t border-[#ed5a43]/10 py-8">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="font-mono text-micro uppercase tracking-[0.14em] text-[#6b6455]">
              Offbeat: Soundscapes of the PCT
            </p>
          </div>
        </footer>
    </SitePage>
  )
}
