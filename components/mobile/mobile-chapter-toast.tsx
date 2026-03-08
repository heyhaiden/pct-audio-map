"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"
import type { PCTSegment } from "@/data/pct-segments"

interface MobileChapterToastProps {
  chapter: PCTSegment
  chapterIndex: number
  currentMiles: number
}

export function MobileChapterToast({ chapter, chapterIndex, currentMiles }: MobileChapterToastProps) {
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track scroll to fade out while scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true)
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 200)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Calculate visibility based on miles - shorter duration for mobile
  const mileOpacity = useMemo(() => {
    const range = CHAPTER_MILE_RANGES[chapterIndex]
    if (!range) return 0

    const milesIntoChapter = currentMiles - range.start

    const fadeInDistance = 3
    const visibleDuration = 15
    const fadeOutDuration = 8
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

  // Combine mile-based opacity with scroll state
  const finalOpacity = isScrolling ? mileOpacity * 0.3 : mileOpacity

  if (mileOpacity <= 0) return null

  return (
    <div
      className="md:hidden fixed top-1/2 left-4 right-4 -translate-y-1/2 z-30 transition-opacity duration-300"
      style={{ opacity: finalOpacity }}
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
