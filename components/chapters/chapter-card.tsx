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

    const fadeInDistance = 15
    const visibleDuration = 75
    const fadeOutDuration = 50

    if (milesIntoChapter < 0) return 0

    if (currentMiles >= range.end) return 0

    if (milesIntoChapter < fadeInDistance) {
      return milesIntoChapter / fadeInDistance
    }

    if (milesIntoChapter <= visibleDuration) {
      return 1
    }

    const fadeOutStart = visibleDuration
    const fadeOutEnd = fadeOutStart + fadeOutDuration

    if (milesIntoChapter >= fadeOutEnd) return 0

    const fadeOutProgress = (milesIntoChapter - fadeOutStart) / (fadeOutEnd - fadeOutStart)
    return 1 - fadeOutProgress
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
