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
        className={`md:hidden fixed top-3 left-3 z-30 transition-opacity duration-300 ${
          isScrolling ? "opacity-20" : "opacity-100"
        }`}
      >
        <div className="bg-stone-950/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-stone-800/30">
          <span className="text-[11px] font-medium text-white tabular-nums">
            {Math.round(currentMiles).toLocaleString("en-US")}
          </span>
          <span className="text-[11px] text-stone-500"> / {totalMiles.toLocaleString("en-US")} mi</span>
        </div>
      </div>
    </>
  )
}
