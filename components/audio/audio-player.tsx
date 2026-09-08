"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AudioMarkerCardBody, audioMarkerStatusClass } from "@/components/audio/audio-marker-card"
import { shouldDismissAudioCard } from "@/lib/audio-player-dismiss"
import type { AudioMarker } from "@/types/map"

interface AudioPlayerProps {
  marker: AudioMarker | null
  onClose: () => void
  isLoading: boolean
  isPlaying: boolean
  error: string | null
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
}

/**
 * Enter and exit run at the same length and easing, so the card settles in and
 * withdraws with one cadence instead of popping.
 */
const CARD_TRANSITION_MS = 520

// Bare caret — no button chrome, so the arrows read as navigation, not controls.
const arrowClass =
  "grid h-10 w-8 shrink-0 place-items-center bg-transparent text-[#8b8271] transition-[color,transform] duration-200 hover:text-[#ed5a43] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] active:scale-90 disabled:cursor-default disabled:opacity-20 disabled:hover:text-[#8b8271] motion-reduce:transition-none"

export function AudioPlayer({
  marker,
  onClose,
  isLoading,
  isPlaying,
  error,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: AudioPlayerProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Hold the last marker through the exit so the card can animate out rather
  // than vanish the instant the selection clears.
  const [shown, setShown] = useState<AudioMarker | null>(marker)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (marker) {
      setShown(marker)
      // One frame at the start offset, so the transition actually runs.
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }

    setVisible(false)
    const timer = window.setTimeout(() => setShown(null), CARD_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [marker])

  useEffect(() => {
    if (!marker) return

    const onPointerDown = (event: PointerEvent) => {
      if (!shouldDismissAudioCard(event.target, cardRef.current)) return
      event.preventDefault()
      event.stopPropagation()
      onCloseRef.current()
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    return () => document.removeEventListener("pointerdown", onPointerDown, true)
  }, [marker])

  if (!shown) return null


  // Error and loading live in the footer so the body copy never reflows.
  let status: ReactNode
  if (error) {
    status = (
      <span className={`${audioMarkerStatusClass} text-red-300`}>
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Audio unavailable
      </span>
    )
  } else if (isLoading) {
    status = (
      <span className={`${audioMarkerStatusClass} text-[#9b8e7a]`}>
        <span className="pct-pulse-dot h-1.5 w-1.5 rounded-full bg-[#ed5a43]" />
        Loading soundscape
      </span>
    )
  } else if (isPlaying) {
    status = (
      <span className={`${audioMarkerStatusClass} text-[#c0b7a6]`}>
        <span className="pct-pulse-dot h-1.5 w-1.5 rounded-full bg-[#ed5a43]" />
        Listening
      </span>
    )
  } else if (!shown.audioUrl) {
    status = <span className={`${audioMarkerStatusClass} text-[#8b8271]`}>Sample not ready</span>
  } else {
    status = <span className={`${audioMarkerStatusClass} text-[#8b8271]`}>Recording</span>
  }

  return (
    <div
      style={{ transitionDuration: `${CARD_TRANSITION_MS}ms` }}
      className={`fixed bottom-4 left-3.5 right-3.5 z-40 transition-[opacity,translate] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:bottom-[34px] md:left-28 md:right-auto md:w-[520px] ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div
        ref={cardRef}
        className="pct-glass-panel relative flex items-center gap-2 p-[15px_12px] md:gap-4 md:p-[18px_18px]"
      >
        <button
          type="button"
          onClick={onPrevious}
          disabled={!hasPrevious}
          aria-label="Previous recording"
          className={arrowClass}
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={1.75} />
        </button>

        <div className="min-w-0 flex-1 text-left">
          <AudioMarkerCardBody marker={shown} variant="map" />

          <div className="mt-4 border-t border-white/15 pt-3">{status}</div>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next recording"
          className={arrowClass}
        >
          <ChevronRight className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
