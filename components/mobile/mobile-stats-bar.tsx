"use client"

interface MobileStatsBarProps {
  currentMiles: number
  totalMiles: number
  currentSection: string
}

export function MobileStatsBar({ currentMiles, totalMiles, currentSection }: MobileStatsBarProps) {
  const progress = (currentMiles / totalMiles) * 100

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/50 px-4 py-3 safe-area-inset-top">
      <div className="flex items-center justify-between">
        {/* Section name */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-stone-500 truncate">Current Section</p>
          <p className="text-sm font-medium text-white truncate">{currentSection}</p>
        </div>

        {/* Progress ring and miles */}
        <div className="flex items-center gap-3">
          {/* Circular progress */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-stone-800"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${progress} 100`}
                strokeLinecap="round"
                className="text-amber-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Miles counter */}
          <div className="text-right">
            <p className="text-lg font-semibold text-white tabular-nums">
              {Math.round(currentMiles).toLocaleString()}
            </p>
            <p className="text-[10px] text-stone-500">of {totalMiles.toLocaleString()} mi</p>
          </div>
        </div>
      </div>
    </div>
  )
}
