"use client"

import { X } from "lucide-react"
import type { PCTSegment } from "@/data/pct-segments"

interface MobileChapterToastProps {
  chapter: PCTSegment
  chapterIndex: number
  /** 0–1 visibility, driven by scroll position (fast fade on mobile). */
  opacity: number
  /** Dismiss this chapter's card immediately. */
  onClose: () => void
}

export function MobileChapterToast({ chapter, chapterIndex, opacity, onClose }: MobileChapterToastProps) {
  if (opacity <= 0.01) return null

  return (
    <div
      className="md:hidden fixed top-1/2 left-4 right-4 -translate-y-1/2 z-30 transition-opacity duration-300"
      style={{ opacity }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-stone-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 ring-1 ring-white/10">
        {/* Pink accent bar — popup elevation cue */}
        <div className="h-1 w-full bg-[#ff6b9d]" />

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Dismiss chapter card"
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-stone-800/70 hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 pr-12">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ff6b9d]/20 border border-[#ff6b9d]/50 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#ff6b9d]">{chapterIndex + 1}</span>
            </div>
            <h3 className="text-lg font-bold text-white leading-tight">{chapter.title}</h3>
          </div>

          <p className="text-sm text-stone-300 leading-relaxed">{chapter.description}</p>
        </div>
      </div>
    </div>
  )
}
