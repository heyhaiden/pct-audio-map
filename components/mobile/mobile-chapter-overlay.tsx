"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import type { PCTChapter } from "@/types/map"

interface MobileChapterOverlayProps {
  chapter: PCTChapter
  chapterIndex: number
  opacity: number
  onDismiss: () => void
}

const SWIPE_DISMISS_DISTANCE = 48

export function MobileChapterOverlay({
  chapter,
  chapterIndex,
  opacity,
  onDismiss,
}: MobileChapterOverlayProps) {
  const startYRef = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const isVisible = opacity > 0.01

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

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (startYRef.current === null) return
    setDragY(Math.min(0, event.clientY - startYRef.current))
  }

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (startYRef.current === null) return
    const distance = startYRef.current - event.clientY
    startYRef.current = null
    setDragY(0)
    if (distance >= SWIPE_DISMISS_DISTANCE) onDismiss()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-chapter-title"
      className="md:hidden fixed inset-0 z-50 touch-none overflow-hidden bg-stone-950/75 backdrop-blur-lg transition-opacity duration-300"
      style={{ opacity }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={() => {
        startYRef.current = null
        setDragY(0)
      }}
    >
      <div
        className="flex h-full flex-col items-center justify-center px-8 text-center transition-transform duration-150 ease-out"
        style={{ transform: `translateY(${dragY * 0.32}px)` }}
      >
        <p className="font-serif text-6xl font-light text-[#d9cba8]">{chapterIndex + 1}</p>
        <h2 id="mobile-chapter-title" className="mt-5 font-serif text-3xl font-normal text-stone-50">
          {chapter.title}
        </h2>
        <div className="my-5 h-px w-10 bg-[#d9cba8]/50" />
        <p className="max-w-xs font-serif text-sm font-light leading-7 text-stone-300">
          {chapter.description}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] rounded-full border border-white/20 bg-stone-950/50 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-300 transition hover:border-white/40 hover:text-white"
        >
          Swipe up or tap to continue
        </button>
      </div>
    </div>
  )
}
