"use client"

import type { PCTChapter } from "@/types/map"

interface ChapterCardProps {
  chapter: PCTChapter
  chapterIndex: number
  totalChapters: number
  /** 0–1 visibility from useChapterIntro (locked chapter, both scroll directions). */
  opacity: number
  forceVisible?: boolean
}

export function ChapterCard({
  chapter,
  chapterIndex,
  totalChapters,
  opacity,
  forceVisible = false,
}: ChapterCardProps) {
  const finalOpacity = forceVisible ? 1 : opacity
  const isVisible = finalOpacity > 0.01

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-30 hidden md:block pointer-events-none">
      <div
        className="bg-black/60 backdrop-blur-xl rounded-xl px-5 py-5 text-white max-w-xs transition-[opacity,transform] duration-500"
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
