"use client"

import { ChevronDown, Mountain } from "lucide-react"
import { LibraryRecordingCard } from "@/components/audio/library-recording-card"
import { slideContentClass, slidePanelClass, useSlidePanel } from "@/hooks/use-slide-panel"
import type { AudioMarker } from "@/types/map"

export function LibraryChapter({
  title,
  markers,
  playingId,
  progress,
  durations,
  onPlayPause,
  onSeek,
}: {
  title: string
  markers: AudioMarker[]
  playingId: string | null
  progress: Record<string, number>
  durations: Record<string, number>
  onPlayPause: (markerId: string, audioUrl: string) => void
  onSeek: (markerId: string, percent: number) => void
}) {
  const { open, toggle, panelRef } = useSlidePanel()

  return (
    <section>
      <div className="py-1 md:px-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full items-center gap-3 rounded-md px-5 py-3 text-left transition-colors hover:bg-white/[0.035] md:px-3 md:py-3.5"
        >
          <Mountain className="h-5 w-5 flex-shrink-0 text-[#ed5a43]" />
          <h2 className="pct-display min-w-0 flex-1 text-lg font-medium text-[#ede8dc] md:text-xl">
            {title}
            <span className="ml-2 hidden text-sm font-normal text-stone-500 md:inline">({markers.length} recordings)</span>
          </h2>
          <ChevronDown
            className={`h-5 w-5 flex-shrink-0 text-[#8b8271] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
      <div aria-hidden className="border-b border-[#8b8271]/30" />

      <div ref={panelRef} aria-hidden={!open} className={slidePanelClass}>
        <div className={slideContentClass(open)}>
          <div className="space-y-3 pt-2 md:space-y-4">
            {markers.map((marker) => (
              <LibraryRecordingCard
                key={marker.id}
                marker={marker}
                isPlaying={playingId === marker.id}
                progress={progress[marker.id] || 0}
                durationSeconds={durations[marker.id] || 0}
                onPlayPause={() => onPlayPause(marker.id, marker.audioUrl)}
                onSeek={(percent) => onSeek(marker.id, percent)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
