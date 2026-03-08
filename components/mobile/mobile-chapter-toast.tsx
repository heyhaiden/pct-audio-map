"use client"

import { useEffect, useState } from "react"
import type { PCTSegment } from "@/data/pct-segments"

interface MobileChapterToastProps {
  chapter: PCTSegment
  chapterIndex: number
  currentMiles: number
}

export function MobileChapterToast({ chapter, chapterIndex, currentMiles }: MobileChapterToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [lastChapterIndex, setLastChapterIndex] = useState(chapterIndex)

  useEffect(() => {
    // Show toast when chapter changes
    if (chapterIndex !== lastChapterIndex) {
      setIsVisible(true)
      setLastChapterIndex(chapterIndex)

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [chapterIndex, lastChapterIndex])

  // Also show at the start of each chapter (first 5 miles)
  useEffect(() => {
    const milesIntoChapter = currentMiles - (chapter.startMile || 0)
    if (milesIntoChapter >= 0 && milesIntoChapter < 5 && !isVisible) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [currentMiles, chapter.startMile, isVisible])

  return (
    <div
      className={`md:hidden fixed top-16 left-4 right-4 z-30 transition-all duration-500 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-stone-900/95 backdrop-blur-md rounded-xl border border-stone-800/50 p-4">
        <div className="flex items-start gap-3">
          {/* Chapter number badge */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <span className="text-xs font-semibold text-amber-500">{chapterIndex + 1}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{chapter.title}</h3>
            <p className="text-xs text-stone-400 line-clamp-2 mt-1">{chapter.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
