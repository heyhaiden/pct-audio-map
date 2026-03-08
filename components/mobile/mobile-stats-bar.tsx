"use client"

import { useState, useEffect, useRef } from "react"

interface MobileStatsBarProps {
  currentMiles: number
  totalMiles: number
  currentSection: string
}

export function MobileStatsBar({ currentMiles, totalMiles, currentSection }: MobileStatsBarProps) {
  const progress = (currentMiles / totalMiles) * 100
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track scroll to fade out while scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true)
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 200)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      {/* Minimal bottom progress bar - edge to edge */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-inset-bottom">
        {/* Progress bar at very bottom */}
        <div className="h-[3px] bg-stone-900/50">
          <div 
            className="h-full bg-[#ff6b9d] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Miles counter - subtle floating pill at bottom left, fades while scrolling */}
      <div 
        className={`md:hidden fixed bottom-4 left-3 z-30 transition-opacity duration-300 ${
          isScrolling ? "opacity-30" : "opacity-100"
        }`}
      >
        <div className="bg-stone-950/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-stone-800/30">
          <span className="text-[11px] font-medium text-white tabular-nums">
            {Math.round(currentMiles).toLocaleString()}
          </span>
          <span className="text-[11px] text-stone-500"> / {totalMiles.toLocaleString()} mi</span>
        </div>
      </div>
    </>
  )
}
