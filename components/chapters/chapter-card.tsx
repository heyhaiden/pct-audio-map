"use client"

import { useEffect, useState, useMemo } from "react"
import type { PCTChapter } from "@/types/map"

const CHAPTER_MILE_RANGES = [
  { start: 0, end: 700 }, // Southern California Desert (700 mi)
  { start: 700, end: 1100 }, // Sierra Nevada Range (400 mi)
  { start: 1100, end: 1700 }, // Northern California Volcanoes (600 mi)
  { start: 1700, end: 2250 }, // Oregon Cascades (550 mi)
  { start: 2250, end: 2650 }, // Washington Cascades (400 mi)
]

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
    const chapterLength = range.end - range.start

    const fadeInDistance = 10
    const visibleDuration = 125 // Stay fully visible for 125 miles
    const fadeOutDuration = 75 // Then fade out over 75 miles

    // Not yet in this chapter
    if (milesIntoChapter < 0) return 0

    // Past this chapter entirely
    if (currentMiles >= range.end) return 0

    // Fade in quickly over first 10 miles
    if (milesIntoChapter < fadeInDistance) {
      return milesIntoChapter / fadeInDistance
    }

    // Fully visible for 125 miles after fade in
    if (milesIntoChapter <= visibleDuration) {
      return 1
    }

    const fadeOutStart = visibleDuration
    const fadeOutEnd = Math.min(fadeOutStart + fadeOutDuration, chapterLength)

    if (milesIntoChapter >= fadeOutEnd) return 0

    const fadeOutProgress = (milesIntoChapter - fadeOutStart) / (fadeOutEnd - fadeOutStart)
    return 1 - fadeOutProgress
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
