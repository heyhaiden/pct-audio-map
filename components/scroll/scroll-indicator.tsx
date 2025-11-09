"use client"

interface ScrollIndicatorProps {
  progress: number
  currentChapter: number
  totalChapters: number
  onChapterClick?: (chapterIndex: number) => void
}

export function ScrollIndicator({ progress, currentChapter, totalChapters, onChapterClick }: ScrollIndicatorProps) {
  const handleDotClick = (chapterIndex: number) => {
    if (onChapterClick && chapterIndex !== currentChapter) {
      onChapterClick(chapterIndex)
    }
  }

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30 hidden md:block">
      <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-4 py-6 text-white">
        {/* Progress line with dots integrated */}
        <div className="relative flex flex-col items-center h-64">
          {/* Progress line background - centered */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/20 rounded-full" />

          {/* Progress fill - centered */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 bg-[#ff6b9d] rounded-full transition-all duration-300 ease-out"
            style={{ height: `${progress * 100}%` }}
          />

          {/* Chapter dots positioned along the line */}
          {Array.from({ length: totalChapters }, (_, i) => {
            const dotPosition = totalChapters === 1 ? 50 : (i / (totalChapters - 1)) * 100
            const isActive = i === currentChapter
            const isPast = i < currentChapter

            return (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-all duration-300 cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-[#ff6b9d] focus:ring-offset-2 focus:ring-offset-black/80 ${
                  isActive
                    ? "bg-[#ff6b9d] border-[#ff6b9d] scale-125 shadow-lg shadow-[#ff6b9d]/50"
                    : isPast
                      ? "bg-[#ff6b9d]/50 border-[#ff6b9d]/50 hover:scale-110"
                      : "bg-transparent border-white/30 hover:border-white/50 hover:scale-110"
                }`}
                style={{ top: `${dotPosition}%` }}
                aria-label={`Go to Chapter ${i + 1}`}
              />
            )
          })}
        </div>

        {/* Chapter counter */}
        <div className="mt-6 text-center">
          <div className="text-xs text-gray-400">Chapter</div>
          <div className="text-sm font-bold text-[#ff6b9d]">
            {currentChapter + 1}/{totalChapters}
          </div>
        </div>
      </div>
    </div>
  )
}
