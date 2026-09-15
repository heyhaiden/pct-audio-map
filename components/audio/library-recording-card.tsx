"use client"

import { useEffect, useRef } from "react"
import { Pause, Play } from "lucide-react"
import { AudioMarkerCardBody } from "@/components/audio/audio-marker-card"
import { ScrubBar } from "@/components/audio/scrub-bar"
import { formatTimecode } from "@/lib/format-timecode"
import { resolveAudioUrl } from "@/lib/resolve-audio-url"
import type { AudioMarker } from "@/types/map"

interface LibraryRecordingCardProps {
  marker: AudioMarker
  isPlaying: boolean
  progress: number
  durationSeconds?: number
  onPlayPause: () => void
  onSeek: (percent: number) => void
  onDuration: (seconds: number) => void
}

/**
 * One recording in the library: play control on the left, details on the right,
 * scrubber underneath. The scrub track is the card's only horizontal rule — the
 * meta divider and footer border are both off, since the play button already
 * separates the control from the content.
 */
export function LibraryRecordingCard({
  marker,
  isPlaying,
  progress,
  durationSeconds = 0,
  onPlayPause,
  onSeek,
  onDuration,
}: LibraryRecordingCardProps) {
  const onDurationRef = useRef(onDuration)
  onDurationRef.current = onDuration

  useEffect(() => {
    if (durationSeconds > 0) return
    const audio = new Audio()
    audio.preload = "metadata"
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        onDurationRef.current(audio.duration)
      }
    }
    audio.addEventListener("loadedmetadata", onMeta)
    audio.src = resolveAudioUrl(marker.audioUrl)
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta)
      audio.src = ""
    }
  }, [durationSeconds, marker.audioUrl])

  const currentSeconds =
    durationSeconds > 0 ? (Math.max(0, Math.min(100, progress)) / 100) * durationSeconds : 0

  return (
    <article
      className={`pct-glass-panel p-[15px_16px] transition-shadow md:p-[18px_18px] ${
        isPlaying ? "ring-1 ring-[#ed5a43]/35" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onPlayPause}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? `Pause ${marker.name}` : `Play ${marker.name}`}
          className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-[color,background-color,border-color,transform] duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] active:scale-95 motion-reduce:transition-none ${
            isPlaying
              ? "border-[#ed5a43] bg-[#ed5a43] text-white"
              : "border-white/20 bg-[rgba(12,11,9,0.62)] text-[#ada396] hover:border-[#ed5a43]/45 hover:text-[#ed5a43]"
          }`}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>

        <div className="min-w-0 flex-1 text-left">
          <AudioMarkerCardBody marker={marker} showMetaRule={false} />
          <ScrubBar
            value={progress}
            onSeek={onSeek}
            label={`Seek ${marker.name}`}
            className="mt-3"
          />
          <div className="mt-1.5 flex items-center justify-between font-mono text-micro tabular-nums tracking-[0.08em] text-[#8b8271]">
            <span>{formatTimecode(currentSeconds)}</span>
            <span>{formatTimecode(durationSeconds)}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
