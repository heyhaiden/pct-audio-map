"use client"

import { useEffect } from "react"
import type { PCTChapter } from "@/types/map"

interface ChapterCardProps {
  chapter: PCTChapter
  chapterIndex: number
  /** 0–1 visibility from useChapterIntro (locked chapter, both scroll directions). */
  opacity: number
  onDismiss: () => void
}

export function ChapterCard({
  chapter,
  chapterIndex,
  opacity,
  onDismiss,
}: ChapterCardProps) {
  const isVisible = opacity > 0.01
  const romanNumerals = ["I", "II", "III", "IV", "V"]

  // Scroll locking is owned solely by app/page.tsx (isOverlayBlockingScroll).
  // This component used to lock body overflow too, and its snapshot captured
  // the page lock's own "hidden", then restored it after the page had released
  // — stranding the document unscrollable.

  if (!isVisible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-chapter-title"
      aria-describedby="desktop-chapter-description"
      className="pct-chapter-overlay-desktop fixed inset-0 z-[70] hidden cursor-pointer overflow-hidden bg-[rgba(12,10,8,0.58)] text-center backdrop-blur-[4px] transition-opacity duration-300 md:block"
      style={{ opacity }}
      onClick={onDismiss}
    >
      <div className="flex h-full flex-col items-center px-[clamp(30px,6vw,80px)]">
        <div className="pct-chapter-overlay-stack flex min-h-0 flex-1 flex-col items-center justify-center py-[clamp(24px,5dvh,72px)]">
          <p className="pct-chapter-overlay-numeral pct-display text-[clamp(56px,8dvh,76px)] font-normal leading-none text-[#ed5a43]/90">
            {romanNumerals[chapterIndex] ?? chapterIndex + 1}
          </p>
          <h2
            id="desktop-chapter-title"
            className="pct-chapter-overlay-title pct-display mb-3 mt-3.5 text-[clamp(31px,4.5dvh,46px)] font-normal text-[#f6f1e4]"
          >
            {chapter.title}
          </h2>
          <p
            id="desktop-chapter-description"
            className="pct-chapter-overlay-copy pct-display max-w-xl text-[clamp(16px,2.1dvh,20px)] font-light leading-[1.65] text-[#cfc6b4]"
          >
            {chapter.description}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 px-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] pt-2 font-mono text-nav uppercase tracking-[0.2em] text-[#8b8271] transition hover:text-[#ed5a43] focus-visible:outline-none focus-visible:text-[#ed5a43] md:pb-[clamp(1.5rem,5dvh,2.75rem)]"
        >
          Click to continue
        </button>
      </div>
    </div>
  )
}
