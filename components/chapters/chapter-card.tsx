"use client"

import { useEffect, useState } from "react"
import type { PCTChapter } from "@/types/map"

interface ChapterCardProps {
  chapter: PCTChapter
  chapterIndex: number
  totalChapters: number
}

export function ChapterCard({ chapter, chapterIndex, totalChapters }: ChapterCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [chapter.id])

  // Reset visibility when chapter changes
  useEffect(() => {
    setIsVisible(false)
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [chapter.id])

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-30 hidden md:block pointer-events-none">
      <div
        className={`bg-black/60 backdrop-blur-xl rounded-xl px-5 py-5 text-white max-w-xs transition-all duration-500 ${
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
        }`}
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
