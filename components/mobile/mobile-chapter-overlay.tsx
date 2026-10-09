"use client"

import { useEffect, useRef, type PointerEvent } from "react"
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
  const isVisible = opacity > 0.01
  const romanNumerals = ["I", "II", "III", "IV", "V"]

  // Scroll locking is owned solely by app/page.tsx (isOverlayBlockingScroll).
  // This component used to set body overflow AND touch-action itself; both are
  // what useInvertedTouchScroll's isLocked() reads, and its snapshot/restore
  // raced the page lock and left them stuck on.

  if (!isVisible) return null

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return
    startYRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    const startY = startYRef.current
    if (startY === null) return
    startYRef.current = null
    if (shouldDismissChapterOverlay(startY, event.clientY)) onDismiss()
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
          onClick={onDismiss}
          className="pct-mobile-explore-cue absolute left-1/2 -translate-x-1/2 px-5 py-2 font-mono text-nav uppercase tracking-[0.2em] text-[#8b8271] transition hover:text-[#ed5a43] focus-visible:outline-none focus-visible:text-[#ed5a43]"
        >
          Tap to continue
        </button>
      </div>
    </div>
  )
}
