"use client"

import { useEffect, useState, useMemo } from "react"
import type { PCTChapter } from "@/types/map"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"

interface ChapterCardProps {
  chapter: PCTChapter
  chapterIndex: number
  totalChapters: number
  currentMiles: number
  forceVisible?: boolean
}

export function ChapterCard({ chapter, chapterIndex, totalChapters, currentMiles, forceVisible = false }: ChapterCardProps) {
  const [hasEntered, setHasEntered] = useState(false)

  const opacity = useMemo(() => {
    const range = CHAPTER_MILE_RANGES[chapterIndex]
    if (!range) return 0

    const fadeInDistance = 3
    const visibleDuration = 8
    const fadeOutDuration = 5

    const milesFromChapterStart = currentMiles - range.start

    if (milesFromChapterStart < -fadeInDistance) return 0
    if (milesFromChapterStart >= visibleDuration + fadeOutDuration) return 0

    if (milesFromChapterStart < 0) {
      return (milesFromChapterStart + fadeInDistance) / fadeInDistance
    }

    if (milesFromChapterStart < visibleDuration) {
      return 1
    }

    const fadeOutProgress = (milesFromChapterStart - visibleDuration) / fadeOutDuration
    return Math.max(0, 1 - fadeOutProgress)
  }, [chapterIndex, currentMiles])

  useEffect(() => {
    setHasEntered(false)
    const timer = setTimeout(() => setHasEntered(true), 100)
    return () => clearTimeout(timer)
  }, [chapter.id])

  const finalOpacity = forceVisible ? 1 : hasEntered ? opacity : 0
  const isVisible = finalOpacity > 0.01

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-30 hidden md:block pointer-events-none">
      <div
        className="bg-black/60 backdrop-blur-xl rounded-xl px-5 py-5 text-white max-w-xs transition-all duration-700"
        style={{
          opacity: finalOpacity,
          transform: isVisible ? "translateX(0)" : "translateX(16px)",
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
