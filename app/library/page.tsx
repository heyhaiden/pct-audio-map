"use client"

import { useState, useRef, useEffect } from "react"
import { audioMarkers } from "@/data/audio-markers"
import { LibraryChapter } from "@/components/audio/library-chapter"
import { SitePage } from "@/components/navigation/site-page"
import {
  endingFadeVolume,
  rampVolume,
  resolvePlaybackDuration,
} from "@/lib/audio-crossfade"
import { buildAudioLibraryFolders } from "@/lib/audio-library-folders"
import {
  createLibraryAudioOutput,
  type LibraryAudioOutput,
} from "@/lib/library-audio-output"
import { resolveLibraryAudioUrl } from "@/lib/resolve-audio-url"

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
  const outputRef = useRef<LibraryAudioOutput | null>(null)
  const fadingOutId = useRef<string | null>(null)
  const rampCancels = useRef(new Map<HTMLAudioElement, () => void>())
  const endFadeFrame = useRef(0)
  const playbackClockRef = useRef<(() => void) | null>(null)

  const cancelEndFade = () => {
    if (!endFadeFrame.current) return
    cancelAnimationFrame(endFadeFrame.current)
    endFadeFrame.current = 0
  }

  const ramp = (output: LibraryAudioOutput, to: number, onDone?: () => void) => {
    const audio = output.element
    rampCancels.current.get(audio)?.()
    const from = output.getVolume()
    const started = performance.now()
    let frame = 0
    let cancelled = false
    const step = (now: number) => {
      if (cancelled) return
      const progress = Math.min(1, (now - started) / PLAYBACK_FADE_MS)
      output.setVolume(rampVolume(progress, from, to))
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
      outputRef.current?.dispose()
      outputRef.current = null
      audioRef.current = null
    }
  }, [])

  const attachLibraryAudio = (
    markerId: string,
    audioUrl: string,
    format: "opus" | "mp3",
  ) => {
    const knownDuration =
      audioMarkers.find((marker) => marker.id === markerId)?.durationSeconds ?? 0
    const output = createLibraryAudioOutput(resolveLibraryAudioUrl(audioUrl, format))
    const audio = output.element
    output.arm()
    outputRef.current = output
    audioRef.current = audio

    const playbackDuration = () => resolvePlaybackDuration(audio.duration, knownDuration)

    audio.addEventListener("loadedmetadata", () => {
      const duration = playbackDuration()
      if (duration > 0) {
        setDurations((prev) => ({ ...prev, [markerId]: duration }))
      }
      const resumeAt = progressRef.current[markerId] ?? 0
      if (resumeAt > 0 && resumeAt < 100 && duration > 0) {
        audio.currentTime = (resumeAt / 100) * duration
      }
    })

    const syncPlayback = () => {
      endFadeFrame.current = 0
      if (audioRef.current !== audio || audio.paused) return

      const duration = playbackDuration()
      if (duration > 0) {
        setProgress((prev) => ({
          ...prev,
          [markerId]: (audio.currentTime / duration) * 100,
        }))

        if (fadingOutId.current !== markerId && !rampCancels.current.has(audio)) {
          const tail = endingFadeVolume(audio.currentTime, duration, END_FADE_MS)
          if (tail !== null) output.setVolume(tail)
        }
      }

      endFadeFrame.current = requestAnimationFrame(syncPlayback)
    }
    playbackClockRef.current = syncPlayback

    audio.addEventListener("ended", () => {
      cancelEndFade()
      setPlayingId(null)
      setProgress((prev) => ({ ...prev, [markerId]: 0 }))
    })

    const fallbackOrFail = () => {
      if (audioRef.current !== audio) return
      if (format === "opus") {
        output.dispose()
        attachLibraryAudio(markerId, audioUrl, "mp3")
        return
      }
      setPlayingId(null)
    }

    audio.addEventListener("error", fallbackOrFail, { once: true })

    audio
      .play()
      .then(() => {
        if (audioRef.current !== audio || fadingOutId.current === markerId) return
        ramp(output, 1)
        if (!endFadeFrame.current) endFadeFrame.current = requestAnimationFrame(syncPlayback)
      })
      .catch(fallbackOrFail)
  }

  const handlePlayPause = (markerId: string, audioUrl: string) => {
    if (!audioUrl) return
    const current = audioRef.current
    const currentOutput = outputRef.current

    if (playingId === markerId && current && currentOutput) {
      if (fadingOutId.current === markerId) {
        fadingOutId.current = null
        void current.play().then(() => {
          if (!endFadeFrame.current) playbackClockRef.current?.()
        })
        ramp(currentOutput, 1)
        return
      }

      fadingOutId.current = markerId
      cancelEndFade()
      ramp(currentOutput, 0, () => {
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
    if (current && currentOutput) {
      const outgoing = current
      const outgoingOutput = currentOutput
      ramp(outgoingOutput, 0, () => {
        outgoing.pause()
        if (outputRef.current !== outgoingOutput) outgoingOutput.dispose()
      })
    }

    attachLibraryAudio(markerId, audioUrl, "opus")
    setPlayingId(markerId)
  }

  const handleSeek = (markerId: string, percent: number) => {
    setProgress((prev) => ({ ...prev, [markerId]: percent }))

    const audio = audioRef.current
    const knownDuration =
      durations[markerId] ||
      audioMarkers.find((marker) => marker.id === markerId)?.durationSeconds ||
      0
    const duration = audio ? resolvePlaybackDuration(audio.duration, knownDuration) : 0
    if (playingId === markerId && audio && duration > 0) {
      audio.currentTime = (percent / 100) * duration
    }
  }

  return (
    <SitePage current="library">
        <main className="pct-stagger mx-auto max-w-4xl py-12 md:px-6 md:py-20">
          <section className="mb-12 px-6 text-center md:mb-16 md:px-0">
            <h1 className="pct-display mb-4 text-[36px] font-normal text-[#f6f1e4] md:text-[48px]">
              Audio <span className="pct-wordmark font-wordmark uppercase text-[#ed5a43]">Library</span>
            </h1>
            <p className="pct-display mx-auto max-w-xl text-prose font-light leading-[1.65] text-[#b4aa9b]">
              Browse and listen to all {audioMarkers.filter((marker) => marker.audioUrl).length} field recordings from the Pacific Crest Trail.
            </p>
          </section>

          {/* Audio listings by chapter */}
          <div className="space-y-8 px-3 md:px-0">
            {libraryFolders.map(({ id, title, markers }) => (
              <LibraryChapter
                key={id}
                chapterId={id}
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
