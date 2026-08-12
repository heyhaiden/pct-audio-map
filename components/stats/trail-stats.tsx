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
    <div className="fixed left-1/2 top-5 z-30 hidden -translate-x-1/2 md:block">
      <div className="pct-glass-panel px-3.5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-semibold tracking-[0.08em] text-[#d9cba8] tabular-nums">
            MI {currentMiles.toFixed(1)}
          </span>
          <span className="font-mono text-[8.5px] tracking-[0.08em] text-[#867c6e]">
            / {totalMiles.toLocaleString("en-US")}
          </span>

          <div className="h-px w-14 overflow-hidden bg-white/15">
            <div className="h-full bg-[#d9cba8] transition-all duration-300" style={{ width: `${percentComplete}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
