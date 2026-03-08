"use client"

interface MobileStatsBarProps {
  currentMiles: number
  totalMiles: number
  currentSection: string
}

export function MobileStatsBar({ currentMiles, totalMiles, currentSection }: MobileStatsBarProps) {
  const progress = (currentMiles / totalMiles) * 100

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 safe-area-inset-top">
      <div className="bg-stone-950/80 backdrop-blur-md px-4 py-2">
        {/* Miles and section info */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-stone-400 truncate max-w-[60%]">{currentSection}</span>
          <span className="text-xs font-medium text-white tabular-nums">
            {Math.round(currentMiles).toLocaleString()} / {totalMiles.toLocaleString()} mi
          </span>
        </div>

        {/* Horizontal progress bar */}
        <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#ff6b9d] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
