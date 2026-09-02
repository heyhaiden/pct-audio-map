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

  useEffect(() => {
    if (!isVisible) return

    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction
    const mobileQuery = window.matchMedia("(max-width: 767px)")
    const syncScrollLock = () => {
      document.body.style.overflow = mobileQuery.matches ? "hidden" : previousOverflow
      document.body.style.touchAction = mobileQuery.matches ? "none" : previousTouchAction
    }

    syncScrollLock()
    mobileQuery.addEventListener("change", syncScrollLock)
    return () => {
      mobileQuery.removeEventListener("change", syncScrollLock)
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
    }
  }, [isVisible])

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
      className="fixed inset-0 z-[70] touch-none cursor-pointer overflow-hidden bg-[rgba(12,10,8,0.58)] backdrop-blur-[4px] transition-opacity duration-300 md:hidden"
      style={{ opacity }}
      onPointerDown={handlePointerDown}
      onPointerUp={finishGesture}
      onPointerCancel={() => {
        startYRef.current = null
      }}
    >
      <div className="flex h-full flex-col items-center justify-center px-[30px] py-[34px] text-center">
        <p className="pct-display text-[56px] font-normal leading-none text-[#ed5a43]/90">
          {romanNumerals[chapterIndex] ?? chapterIndex + 1}
        </p>
        <h2 id="mobile-chapter-title" className="pct-display mb-3 mt-3.5 text-[31px] font-normal text-[#f6f1e4]">
          {chapter.title}
        </h2>
        <p
          id="mobile-chapter-description"
          className="pct-display max-w-[224px] text-base font-light leading-[1.65] text-[#cfc6b4]"
        >
          {chapter.description}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="absolute bottom-32 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#8b8271] transition hover:text-[#ed5a43] focus-visible:outline-none focus-visible:text-[#ed5a43]"
        >
          Tap to continue
        </button>
      </div>
    </div>
  )
}
