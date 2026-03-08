"use client"

import { useEffect, useState, useMemo } from "react"
import type { PCTChapter } from "@/types/map"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"

interface ChapterCardProps {
  chapter: PCTChapter
  chapterIndex: number
  totalChapters: number
  currentMiles: number
}

export function ChapterCard({ chapter, chapterIndex, totalChapters, currentMiles }: ChapterCardProps) {
  const [hasEntered, setHasEntered] = useState(false)

  const opacity = useMemo(() => {
    const range = CHAPTER_MILE_RANGES[chapterIndex]
    if (!range) return 0

    const milesIntoChapter = currentMiles - range.start

    const fadeInDistance = 5      // Quick fade in over 5 miles
    const visibleDuration = 30    // Stay visible for 30 miles
    const fadeOutDuration = 15    // Fade out over 15 miles
    const totalDisplayWindow = fadeInDistance + visibleDuration + fadeOutDuration

    // Not yet reached this chapter
    if (milesIntoChapter < 0) return 0

    // Already past the display window for this chapter
    if (milesIntoChapter >= totalDisplayWindow) return 0

    // Fade in phase
    if (milesIntoChapter < fadeInDistance) {
      return milesIntoChapter / fadeInDistance
    }

    // Fully visible phase
    if (milesIntoChapter < fadeInDistance + visibleDuration) {
      return 1
    }

    // Fade out phase
    const fadeOutProgress = (milesIntoChapter - fadeInDistance - visibleDuration) / fadeOutDuration
    return Math.max(0, 1 - fadeOutProgress)
  }, [chapterIndex, currentMiles])

  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 100)
    return () => clearTimeout(timer)
  }, [chapter.id])

  useEffect(() => {
    setHasEntered(false)
    const timer = setTimeout(() => setHasEntered(true), 100)
    return () => clearTimeout(timer)
  }, [chapter.id])

  const finalOpacity = hasEntered ? opacity : 0
  const isVisible = finalOpacity > 0.01

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-30 hidden md:block pointer-events-none">
      <div
        className={`bg-black/60 backdrop-blur-xl rounded-xl px-5 py-5 text-white max-w-xs transition-all duration-500`}
        style={{
          opacity: finalOpacity,
          transform: isVisible ? "translateX(0)" : "translateX(-16px)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-[#ff6b9d] text-white text-xs font-bold px-2 py-0.5 rounded">
            {chapterIndex + 1} / {totalChapters}
          </div>
        </div>

        <h2 className="text-lg font-bold text-white mb-2 leading-tight">{chapter.title}</h2>

        <p className="text-sm text-gray-300 leading-relaxed">{chapter.description}</p>
      </div>
    </div>
  )
}
