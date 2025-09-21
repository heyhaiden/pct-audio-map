"use client"

interface ScrollIndicatorProps {
  progress: number
  currentChapter: number
  totalChapters: number
}

export function ScrollIndicator({ progress, currentChapter, totalChapters }: ScrollIndicatorProps) {
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-sm rounded-full p-3 text-white">
        {/* Progress bar */}
        <div className="w-1 h-32 bg-white/20 rounded-full overflow-hidden mb-4">
          <div
            className="w-full bg-[#ff6b9d] transition-all duration-300 ease-out"
            style={{ height: `${progress * 100}%` }}
          />
        </div>

        {/* Chapter indicators */}
        <div className="space-y-2">
          {Array.from({ length: totalChapters }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                i === currentChapter
                  ? "bg-[#ff6b9d] border-[#ff6b9d] scale-125"
                  : i < currentChapter
                    ? "bg-[#ff6b9d]/50 border-[#ff6b9d]/50"
                    : "bg-transparent border-white/30"
              }`}
            />
          ))}
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
