"use client"

import { useMemo } from "react"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"
import type { PCTSegment } from "@/data/pct-segments"

interface MobileChapterToastProps {
  chapter: PCTSegment
  chapterIndex: number
  currentMiles: number
}

export function MobileChapterToast({ chapter, chapterIndex, currentMiles }: MobileChapterToastProps) {
  // Calculate visibility based on miles - shorter duration for mobile (no scroll fade)
  const opacity = useMemo(() => {
    const range = CHAPTER_MILE_RANGES[chapterIndex]
    if (!range) return 0

    const milesIntoChapter = currentMiles - range.start

    const fadeInDistance = 3
    const visibleDuration = 12
    const fadeOutDuration = 6
    const totalDisplayWindow = fadeInDistance + visibleDuration + fadeOutDuration

    if (milesIntoChapter < 0) return 0
    if (milesIntoChapter >= totalDisplayWindow) return 0

    if (milesIntoChapter < fadeInDistance) {
      return milesIntoChapter / fadeInDistance
    }

    if (milesIntoChapter < fadeInDistance + visibleDuration) {
      return 1
    }

    const fadeOutProgress = (milesIntoChapter - fadeInDistance - visibleDuration) / fadeOutDuration
    return Math.max(0, 1 - fadeOutProgress)
  }, [chapterIndex, currentMiles])

  if (opacity <= 0) return null

  return (
    <div
      className="md:hidden fixed top-1/2 left-4 right-4 -translate-y-1/2 z-30 transition-opacity duration-300"
      style={{ opacity }}
    >
      <div className="bg-stone-900/90 backdrop-blur-md rounded-xl border border-stone-800/50 p-4">
        {/* Chapter header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#ff6b9d]/20 border border-[#ff6b9d]/40 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-[#ff6b9d]">{chapterIndex + 1}</span>
          </div>
          <h3 className="text-sm font-semibold text-white">{chapter.title}</h3>
        </div>

        {/* Full description */}
        <p className="text-xs text-stone-400 leading-relaxed">{chapter.description}</p>

        {/* Mile range */}
        <div className="mt-3 pt-2 border-t border-stone-800/50">
          <p className="text-[10px] text-stone-500">
            Miles {chapter.startMile?.toLocaleString()} – {chapter.endMile?.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
