"use client"

import { Pause, Play } from "lucide-react"
import { AudioMarkerCardBody } from "@/components/audio/audio-marker-card"
import { ScrubBar } from "@/components/audio/scrub-bar"
import { formatTimecode } from "@/lib/format-timecode"
import type { AudioMarker } from "@/types/map"

interface LibraryRecordingCardProps {
  marker: AudioMarker
  isPlaying: boolean
  progress: number
  durationSeconds?: number
  onPlayPause: () => void
  onSeek: (percent: number) => void
}

/**
 * One recording card. The chapter above it is only a heading, so this card is
 * the single frame.
 */
export function LibraryRecordingCard({
  marker,
  isPlaying,
  progress,
  durationSeconds = 0,
  onPlayPause,
  onSeek,
}: LibraryRecordingCardProps) {
  const knownDuration = durationSeconds > 0 ? durationSeconds : marker.durationSeconds ?? 0

  const currentSeconds =
    knownDuration > 0 ? (Math.max(0, Math.min(100, progress)) / 100) * knownDuration : 0
  const ready = Boolean(marker.audioUrl)

  return (
    <article className="pct-glass-panel p-4 md:p-5">
      <div className="text-left">
        <AudioMarkerCardBody marker={marker} showMetaRule={false} />
        {ready ? (
          <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-0 md:gap-x-4">
            <button
              type="button"
              onClick={onPlayPause}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? `Pause ${marker.name}` : `Play ${marker.name}`}
              className={`row-start-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-[color,background-color,border-color,transform] duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] active:scale-95 motion-reduce:transition-none md:h-11 md:w-11 ${
                isPlaying
                  ? "border-[#ed5a43] bg-[#ed5a43] text-white"
                  : "border-white/20 bg-[rgba(12,11,9,0.62)] text-[#ada396] hover:border-[#ed5a43]/45 hover:text-[#ed5a43]"
              }`}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>

            <ScrubBar
              value={progress}
              onSeek={onSeek}
              label={`Seek ${marker.name}`}
              className="row-start-1 min-w-0"
            />
            <div className="col-start-2 -mt-1.5 flex items-center justify-between font-mono text-micro tabular-nums tracking-[0.08em] text-[#8b8271]">
              <span>{formatTimecode(currentSeconds)}</span>
              <span>{formatTimecode(knownDuration)}</span>
            </div>
          </div>
        ) : (
          <p className="mt-5 font-mono text-micro uppercase tracking-[0.18em] text-[#8b8271]">
            Waiting on audio
          </p>
        )}
      </div>
    </article>
  )
}
