"use client"

import { useEffect, useState, useMemo } from "react"
import type { PCTChapter } from "@/types/map"

const CHAPTER_MILE_RANGES = [
  { start: 0, end: 700 }, // Southern California Desert
  { start: 700, end: 1100 }, // Sierra Nevada Range
  { start: 1100, end: 1700 }, // Northern California Volcanoes
  { start: 1700, end: 2250 }, // Oregon Cascades
  { start: 2250, end: 2650 }, // Washington Cascades
]

interface ChapterCardProps {
  chapter: PCTChapter
  chapterIndex: number
  totalChapters: number
  currentMiles: number // Add currentMiles prop
}

export function ChapterCard({ chapter, chapterIndex, totalChapters, currentMiles }: ChapterCardProps) {
  const [hasEntered, setHasEntered] = useState(false)

  const opacity = useMemo(() => {
    const range = CHAPTER_MILE_RANGES[chapterIndex]
    if (!range) return 0

    const chapterLength = range.end - range.start
    const milesIntoChapter = currentMiles - range.start
    const progress = milesIntoChapter / chapterLength

    // Fade in during first 10% of chapter
    const fadeInEnd = 0.1
    // Stay fully visible until 80% of chapter
    const fadeOutStart = 0.8
    // Fade out during last 20%
    const fadeOutEnd = 1.0

    if (progress < 0) return 0
    if (progress > fadeOutEnd) return 0

    // Fade in
    if (progress < fadeInEnd) {
      return progress / fadeInEnd
    }

    // Fully visible
    if (progress >= fadeInEnd && progress <= fadeOutStart) {
      return 1
    }

    // Fade out
    if (progress > fadeOutStart) {
      return 1 - (progress - fadeOutStart) / (fadeOutEnd - fadeOutStart)
    }

    return 1
  }, [chapterIndex, currentMiles])

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setHasEntered(true), 100)
    return () => clearTimeout(timer)
  }, [chapter.id])

  // Reset visibility when chapter changes
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
        {/* Chapter number badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-[#ff6b9d] text-white text-xs font-bold px-2 py-0.5 rounded">
            {chapterIndex + 1} / {totalChapters}
          </div>
        </div>

        {/* Chapter title */}
        <h2 className="text-lg font-bold text-white mb-2 leading-tight">{chapter.title}</h2>

        {/* Chapter description */}
        <p className="text-sm text-gray-300 leading-relaxed">{chapter.description}</p>
      </div>
    </div>
  )
}
