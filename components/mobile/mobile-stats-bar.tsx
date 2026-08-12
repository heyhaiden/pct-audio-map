"use client"

import { useState, useEffect, useRef } from "react"

interface MobileStatsBarProps {
  currentMiles: number
  totalMiles: number
  currentSection: string
}

export function MobileStatsBar({ currentMiles, totalMiles, currentSection }: MobileStatsBarProps) {
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track scroll to fade while scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 200)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  return (
    <>
      {/* Miles counter - subtle floating pill at top left, fades while scrolling */}
      <div
        className={`fixed left-1/2 top-3 z-30 -translate-x-1/2 transition-opacity duration-300 md:hidden ${
          isScrolling ? "opacity-20" : "opacity-100"
        }`}
      >
        <div className="pct-glass-panel rounded-full px-3 py-2">
          <span className="font-mono text-[9px] font-semibold tracking-[0.08em] text-[#d9cba8] tabular-nums">
            MI {Math.round(currentMiles).toLocaleString("en-US")}
          </span>
          <span className="font-mono text-[8.5px] tracking-[0.06em] text-[#867c6e]">
            {" "}/ {totalMiles.toLocaleString("en-US")}
          </span>
        </div>
      </div>
    </>
  )
}
