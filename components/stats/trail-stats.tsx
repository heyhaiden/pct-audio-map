"use client"

interface TrailStatsProps {
  currentMiles: number
  totalMiles: number
  currentElevation?: number
  currentSection: string
}

export function TrailStats({ currentMiles, totalMiles, currentSection }: TrailStatsProps) {
  const percentComplete = (currentMiles / totalMiles) * 100

  return (
    <div className="fixed top-20 right-6 z-30 hidden md:block">
      <div className="bg-black/60 backdrop-blur-xl rounded-xl px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          {/* Miles counter */}
          <span className="text-lg font-bold text-[#ff6b9d] tabular-nums">{currentMiles.toFixed(1)}</span>
          <span className="text-xs text-gray-400">/ {totalMiles} mi</span>

          {/* Progress bar */}
          <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-[#ff6b9d] transition-all duration-300" style={{ width: `${percentComplete}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
