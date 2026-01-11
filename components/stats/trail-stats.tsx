"use client"

interface TrailStatsProps {
  currentMiles: number
  totalMiles: number
  currentElevation?: number
  currentSection: string
}

export function TrailStats({ currentMiles, totalMiles, currentElevation, currentSection }: TrailStatsProps) {
  const percentComplete = (currentMiles / totalMiles) * 100

  return (
    <div className="fixed top-6 right-6 z-30 hidden md:block">
      <div className="bg-black/60 backdrop-blur-xl rounded-xl px-5 py-4 text-white w-[220px]">
        {/* Section name */}
        <div className="text-xs text-gray-400 mb-3 truncate">{currentSection}</div>

        {/* Miles progress */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-bold text-[#ff6b9d] tabular-nums min-w-[80px]">
              {currentMiles.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400 whitespace-nowrap">/ {totalMiles} mi</span>
          </div>
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-[#ff6b9d] transition-all duration-300" style={{ width: `${percentComplete}%` }} />
          </div>
        </div>

        {/* Elevation */}
        {currentElevation !== undefined && (
          <div className="text-xs">
            <span className="text-gray-400">Elevation:</span>{" "}
            <span className="text-white font-medium tabular-nums">{currentElevation.toLocaleString()} ft</span>
          </div>
        )}
      </div>
    </div>
  )
}
