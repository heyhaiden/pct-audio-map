"use client"

import type { PCTSegment } from "@/data/pct-segments"

interface MobileChapterToastProps {
  chapter: PCTSegment
  chapterIndex: number
  /** 0–1 visibility from useChapterIntro (locked chapter, both scroll directions). */
  opacity: number
}

export function MobileChapterToast({ chapter, chapterIndex, opacity }: MobileChapterToastProps) {
  if (opacity <= 0.01) return null

  return (
    <div
      className="md:hidden fixed top-1/2 left-4 right-4 -translate-y-1/2 z-30 transition-opacity duration-500"
      style={{ opacity }}
    >
      <div className="bg-stone-900/90 backdrop-blur-md rounded-xl border border-stone-800/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#ff6b9d]/20 border border-[#ff6b9d]/40 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-[#ff6b9d]">{chapterIndex + 1}</span>
          </div>
          <h3 className="text-sm font-semibold text-white">{chapter.title}</h3>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">{chapter.description}</p>
      </div>
    </div>
  )
}
