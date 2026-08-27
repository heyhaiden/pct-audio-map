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

  useEffect(() => {
    if (!isVisible || !window.matchMedia("(min-width: 768px)").matches) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-chapter-title"
      aria-describedby="desktop-chapter-description"
      className="fixed inset-0 z-[70] hidden cursor-pointer overflow-hidden bg-[rgba(12,10,8,0.58)] text-center backdrop-blur-[4px] transition-opacity duration-300 md:block"
      style={{ opacity }}
      onClick={onDismiss}
    >
      <div className="flex h-full flex-col items-center justify-center px-[clamp(30px,6vw,80px)] py-[clamp(34px,6dvh,72px)]">
        <p className="pct-display text-[clamp(56px,8dvh,76px)] font-normal leading-none text-[#ed5a43]/90">
          {romanNumerals[chapterIndex] ?? chapterIndex + 1}
        </p>
        <h2
          id="desktop-chapter-title"
          className="pct-display mb-3 mt-3.5 text-[clamp(31px,4.5dvh,46px)] font-normal text-[#f6f1e4]"
        >
          {chapter.title}
        </h2>
        <p
          id="desktop-chapter-description"
          className="pct-display max-w-lg text-[clamp(16px,2.1dvh,20px)] font-light leading-[1.65] text-[#cfc6b4]"
        >
          {chapter.description}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="absolute bottom-32 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#8b8271] transition hover:text-[#ed5a43] focus-visible:outline-none focus-visible:text-[#ed5a43]"
        >
          Click to continue
        </button>
      </div>
    </div>
  )
}
