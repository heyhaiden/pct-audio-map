"use client"

interface ScrollIndicatorProps {
  progress: number
  currentChapter: number
  totalChapters: number
  onChapterClick?: (chapterIndex: number) => void
}

export function ScrollIndicator({ progress, currentChapter, totalChapters, onChapterClick }: ScrollIndicatorProps) {
  const handleDotClick = (chapterIndex: number) => {
    // Allow clicking any chapter, even the current one (to re-center)
    if (onChapterClick) {
      onChapterClick(chapterIndex)
    }
  }

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-30 hidden md:block">
      <div className="bg-black/60 backdrop-blur-xl rounded-xl px-3 py-4 text-white">
        {/* Progress line with dots integrated */}
        <div className="relative flex flex-col items-center h-48">
          {/* Progress line background - centered */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/20 rounded-full" />

          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-[#ff6b9d] rounded-full transition-all duration-300 ease-out"
            style={{ height: `${progress * 100}%` }}
          />

          {Array.from({ length: totalChapters }, (_, i) => {
            // Invert the dot position so chapter 0 is at bottom (100%) and last chapter is at top (0%)
            const dotPosition = totalChapters === 1 ? 50 : ((totalChapters - 1 - i) / (totalChapters - 1)) * 100
            const isActive = i === currentChapter
            // A chapter is "past" if we've reached or passed it (i <= currentChapter, but not active)
            const isPast = i < currentChapter

            return (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 transition-all duration-300 cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-[#ff6b9d] focus:ring-offset-2 focus:ring-offset-black/60 ${
                  isActive
                    ? "bg-[#ff6b9d] border-[#ff6b9d] scale-125 shadow-lg shadow-[#ff6b9d]/50"
                    : isPast
                      ? "bg-[#ff6b9d] border-[#ff6b9d] hover:scale-110"
                      : "bg-transparent border-white/30 hover:border-white/50 hover:scale-110"
                }`}
                style={{ top: `${dotPosition}%` }}
                aria-label={`Go to Chapter ${i + 1}`}
              />
            )
          })}
        </div>

        {/* Chapter counter */}
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-400">Chapter</div>
          <div className="text-sm font-bold text-[#ff6b9d]">
            {currentChapter + 1}/{totalChapters}
          </div>
        </div>
      </div>
    </div>
  )
}
