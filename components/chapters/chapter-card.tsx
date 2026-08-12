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
  const chapterWords = ["ONE", "TWO", "THREE", "FOUR", "FIVE"]

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[30%] z-30 hidden text-center md:block">
      <div
        className="relative transition-[opacity,transform] duration-300 ease-out"
        style={{
          opacity: finalOpacity,
          transform: isVisible ? "translateY(0)" : "translateY(6px)",
        }}
      >
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-40 w-[min(32rem,92vw)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(57,42,28,0.58)_0%,rgba(25,20,15,0.34)_48%,transparent_76%)]"
        />
        <div className="relative">
          <div className="pct-display mb-2 text-sm tracking-[0.44em] text-[#d9cba8]/90">
            CHAPTER {chapterWords[chapterIndex] ?? chapterIndex + 1}
          </div>
          <h2 className="pct-display px-6 text-[32px] font-normal leading-[1.1] text-[#f6f1e4] [text-shadow:0_2px_20px_rgba(0,0,0,0.96),0_1px_4px_rgba(0,0,0,0.9)]">
            {chapter.title}
          </h2>
          <div className="mx-auto mt-[13px] h-px w-[34px] bg-[#d9cba8]/60" />
        </div>
        <span className="sr-only">
          Chapter {chapterIndex + 1} of {totalChapters}. {chapter.description}
        </span>
      </div>
    </div>
  )
}
