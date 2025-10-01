"use client"

import { useState } from "react"
import { ChevronDown, MapPin } from "lucide-react"
import type { PCTChapter } from "@/types/map"

interface ChapterDropdownProps {
  chapters: PCTChapter[]
  currentChapter: number
  onChapterSelect: (index: number) => void
}

export function ChapterDropdown({ chapters, currentChapter, onChapterSelect }: ChapterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleChapterClick = (index: number) => {
    onChapterSelect(index)
    setIsOpen(false)

    // Scroll to the chapter section
    const chapterElement = document.querySelector(`[data-chapter-index="${index}"]`)
    if (chapterElement) {
      chapterElement.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-sm rounded-lg text-white hover:bg-black/90 transition-colors border border-white/10"
      >
        <MapPin className="w-4 h-4 text-[#ff6b9d]" />
        <span className="text-sm font-medium">
          Chapter {currentChapter + 1}: {chapters[currentChapter]?.title}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown menu */}
          <div className="absolute top-full left-0 mt-2 w-96 max-h-[70vh] overflow-y-auto bg-black/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-2xl z-50">
            <div className="p-2">
              {chapters.map((chapter, index) => (
                <button
                  key={chapter.id}
                  onClick={() => handleChapterClick(index)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentChapter === index
                      ? "bg-[#ff6b9d]/20 border border-[#ff6b9d]/30"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        currentChapter === index ? "bg-[#ff6b9d] text-white" : "bg-white/10 text-gray-400"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-semibold mb-1 ${
                          currentChapter === index ? "text-white" : "text-gray-300"
                        }`}
                      >
                        {chapter.title}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-2">{chapter.description}</p>
                      {chapter.audioMarkers.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <div className="w-3 h-3 rounded-full bg-[#ff6b9d]/30 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b9d]" />
                          </div>
                          <span className="text-xs text-gray-500">
                            {chapter.audioMarkers.length} audio marker{chapter.audioMarkers.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
