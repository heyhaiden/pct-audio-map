"use client"

import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react"
import { shouldDismissChapterOverlay } from "@/lib/mobile-chapter-overlay-gesture"
import type { PCTChapter } from "@/types/map"

interface MobileChapterOverlayProps {
  chapter: PCTChapter
  chapterIndex: number
  opacity: number
  onDismiss: () => void
}

export function MobileChapterOverlay({
  chapter,
  chapterIndex,
  opacity,
  onDismiss,
}: MobileChapterOverlayProps) {
  const startYRef = useRef<number | null>(null)
  /** A tap ended on the card; its click (or the fallback timer) dismisses. */
  const tapPendingRef = useRef(false)
  const fallbackTimerRef = useRef<number | null>(null)
  const isVisible = opacity > 0.01
  const romanNumerals = ["I", "II", "III", "IV", "V"]

  useEffect(
    () => () => {
      if (fallbackTimerRef.current != null) window.clearTimeout(fallbackTimerRef.current)
    },
    [],
  )

  if (!isVisible) return null

  const dismissOnce = () => {
    if (fallbackTimerRef.current != null) window.clearTimeout(fallbackTimerRef.current)
    fallbackTimerRef.current = null
    tapPendingRef.current = false
    onDismiss()
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return
    startYRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    const startY = startYRef.current
    if (startY === null) return
    startYRef.current = null
    if (!shouldDismissChapterOverlay(startY, event.clientY)) return
    // Don't unmount on pointerup: the phone's click arrives a moment later and
    // would land on the map underneath, opening any pin there. Dismiss on the
    // click instead, so the card absorbs it. The timer covers a click that
    // never comes.
    tapPendingRef.current = true
    if (fallbackTimerRef.current != null) window.clearTimeout(fallbackTimerRef.current)
    fallbackTimerRef.current = window.setTimeout(() => {
      if (tapPendingRef.current) dismissOnce()
    }, 400)
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (tapPendingRef.current) dismissOnce()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-chapter-title"
      aria-describedby="mobile-chapter-description"
      className="pct-chapter-overlay-mobile fixed inset-0 z-[70] touch-none cursor-pointer overflow-hidden bg-[rgba(12,10,8,0.58)] backdrop-blur-[4px] transition-opacity duration-300 md:hidden"
      style={{ opacity }}
      onPointerDown={handlePointerDown}
      onPointerUp={finishGesture}
      onClick={handleClick}
      onPointerCancel={() => {
        startYRef.current = null
      }}
    >
      <div className="relative flex h-full flex-col items-center px-[30px] text-center">
        <div className="pct-chapter-overlay-stack flex min-h-0 flex-1 flex-col items-center justify-center py-8">
          <p className="pct-chapter-overlay-numeral pct-display text-[56px] font-normal leading-none text-[#ed5a43]/90">
            {romanNumerals[chapterIndex] ?? chapterIndex + 1}
          </p>
          <h2 id="mobile-chapter-title" className="pct-chapter-overlay-title pct-display mb-3 mt-3.5 text-[31px] font-normal text-[#f6f1e4]">
            {chapter.title}
          </h2>
          <p
            id="mobile-chapter-description"
            className="pct-chapter-overlay-copy pct-display max-w-[300px] text-base font-light leading-[1.65] text-[#cfc6b4]"
          >
            {chapter.description}
          </p>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            dismissOnce()
          }}
          className="pct-mobile-explore-cue absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-5 py-3 font-mono text-[14px] uppercase tracking-[0.18em] text-[#c7beac] transition hover:text-[#ed5a43] focus-visible:outline-none focus-visible:text-[#ed5a43]"
        >
          Tap to continue
        </button>
      </div>
    </div>
  )
}
