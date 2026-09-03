"use client"

import {
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

interface ScrubBarProps {
  /** Playback position as a percentage, 0–100. */
  value: number
  /** Seek to a new percentage — fired on click, drag, and arrow keys. */
  onSeek: (percent: number) => void
  label: string
  className?: string
}

/**
 * Click-or-drag playback scrubber. Pointer capture keeps the drag tracking
 * even when the cursor leaves the bar.
 */
export function ScrubBar({ value, onSeek, label, className = "" }: ScrubBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const seekToClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      if (rect.width <= 0) return
      onSeek(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)))
    },
    [onSeek],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    seekToClientX(event.clientX)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    seekToClientX(event.clientX)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 5

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault()
      onSeek(Math.min(100, value + step))
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault()
      onSeek(Math.max(0, value - step))
    } else if (event.key === "Home") {
      event.preventDefault()
      onSeek(0)
    } else if (event.key === "End") {
      event.preventDefault()
      onSeek(100)
    }
  }

  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={`${Math.round(clamped)} percent`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
      className={`group/scrub relative h-6 cursor-pointer touch-none select-none focus-visible:outline-none ${className}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/[0.14]">
        <div
          className="h-full rounded-full bg-[#ed5a43]"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div
        aria-hidden
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ed5a43] opacity-0 shadow-[0_0_0_3px_rgba(237,90,67,0.22)] transition-opacity duration-150 group-hover/scrub:opacity-100 group-focus/scrub:opacity-100"
        style={{ left: `${clamped}%` }}
      />
    </div>
  )
}
