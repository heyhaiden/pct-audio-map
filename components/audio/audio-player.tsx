"use client"

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { AudioMarkerCardBody, audioMarkerStatusClass } from "@/components/audio/audio-marker-card"
import { shouldDismissAudioCard } from "@/lib/audio-player-dismiss"
import type { AudioMarker } from "@/types/map"

interface AudioPlayerProps {
  marker: AudioMarker | null
  onClose: () => void
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
/** Track the arrow-hop camera (2800ms) / audio fade (1100ms), not the open pop. */
const CARD_HEIGHT_MS = 1200

// Bare caret — no button chrome, so the arrows read as navigation, not controls.
const arrowClass =
  "grid h-10 w-8 shrink-0 place-items-center bg-transparent text-[#8b8271] transition-[color,transform] duration-200 hover:text-[#ed5a43] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] active:scale-90 disabled:cursor-default disabled:opacity-20 disabled:hover:text-[#8b8271] motion-reduce:transition-none"

export function AudioPlayer({
  marker,
  onClose,
  isPlaying,
  error,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: AudioPlayerProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const shownIdRef = useRef<string | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Hold the last marker through the exit so the card can animate out rather
  // than vanish the instant the selection clears.
  const [shown, setShown] = useState<AudioMarker | null>(marker)
  const [visible, setVisible] = useState(false)
  const [cardHeight, setCardHeight] = useState<number | null>(null)
  const [easeHeight, setEaseHeight] = useState(false)
  const [swapCopy, setSwapCopy] = useState(false)

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

  useLayoutEffect(() => {
    if (!shown) {
      shownIdRef.current = null
      setSwapCopy(false)
      setEaseHeight(false)
      setCardHeight(null)
      return
    }

    const previousId = shownIdRef.current
    shownIdRef.current = shown.id
    setSwapCopy(previousId != null && previousId !== shown.id)

    const node = measureRef.current
    if (!node) return

    const apply = () => {
      const next = Math.round(node.getBoundingClientRect().height)
      setCardHeight((prev) => (prev === next ? prev : next))
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])

  useEffect(() => {
    if (!shown) return
    const raf = requestAnimationFrame(() => setEaseHeight(true))
    return () => cancelAnimationFrame(raf)
  }, [shown])

  if (!shown) return null


  // Failure stays in the footer so a missing file does not reflow the body.
  let status: ReactNode
  if (error) {
    status = (
      <span className={`${audioMarkerStatusClass} text-red-300`}>
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Audio unavailable
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
    status = <span className={`${audioMarkerStatusClass} text-[#8b8271]`}>Waiting on audio</span>
  } else {
    status = <span className={`${audioMarkerStatusClass} text-[#8b8271]`}>Recording</span>
  }

  return (
    <div
      style={{ transitionDuration: `${CARD_TRANSITION_MS}ms` }}
      className={`pct-map-audio-card fixed bottom-4 left-3.5 right-3.5 z-40 transition-[opacity,translate,left,right,width,bottom,max-width] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:bottom-[34px] md:left-28 md:right-auto md:w-[520px] ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div
        ref={cardRef}
        style={
          {
            "--audio-card-h": cardHeight != null ? `${cardHeight}px` : undefined,
            transitionDuration: easeHeight ? `${CARD_HEIGHT_MS}ms` : undefined,
          } as CSSProperties
        }
        className={`pct-glass-panel group relative overflow-hidden md:min-h-[268px] md:overflow-visible ${
          easeHeight
            ? "transition-[height] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            : ""
        } max-md:h-[var(--audio-card-h,auto)]`}
      >
        {/* Reminds people they can leave the recording and free-scroll. Small and
            always visible on mobile; floats off the corner on desktop hover. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close audio player"
          className="absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full text-[#8b8271]/80 transition-[color,background-color,opacity] hover:text-[#ede8dc] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] md:-right-3 md:-top-3 md:h-8 md:w-8 md:border md:border-[var(--pct-glass-border)] md:bg-[rgba(15,14,12,0.92)] md:text-[#ada396] md:opacity-0 md:backdrop-blur-[14px] md:group-focus-within:opacity-100 md:group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </button>

        <div
          ref={measureRef}
          className="flex min-h-0 flex-col p-[15px_16px] md:min-h-[268px] md:p-[18px]"
        >
          <div
            key={shown.id}
            className={`min-w-0 flex-1 pr-5 text-left md:pr-0 ${swapCopy ? "pct-audio-card-copy" : ""}`}
          >
            <AudioMarkerCardBody marker={shown} variant="map" />
          </div>

        <div className="mt-4 grid grid-cols-[2rem_1fr_2rem] items-center border-t border-white/15 pt-1">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPrevious}
            aria-label="Previous recording"
            className={arrowClass}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={1.75} />
          </button>

          <div className="flex min-h-10 items-center justify-center text-center">
            {status}
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
      </div>
    </div>
  )
}
