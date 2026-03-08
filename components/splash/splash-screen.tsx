"use client"

import { useState } from "react"

interface SplashScreenProps {
  onEnter: () => void
}

// Abstract minimalist trail line SVG
function AbstractTrailIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 120 200" 
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main trail line - abstract serpentine path from bottom to top */}
      <path
        d="M60 195 
           C45 180, 75 165, 55 150
           C35 135, 80 120, 65 105
           C50 90, 85 75, 60 60
           C35 45, 75 30, 55 15
           L58 5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        className="text-[#ff6b9d]"
      />
      {/* Subtle parallel accent line */}
      <path
        d="M65 190
           C50 175, 80 162, 60 147
           C40 132, 85 117, 70 102"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        className="text-[#ff6b9d]/30"
      />
    </svg>
  )
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  const handleEnter = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onEnter()
    }, 800)
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-stone-950 transition-all duration-800 ease-out ${
        isExiting ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-stone-900/50 to-stone-950" />
      
      {/* Subtle topographic pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q25 30 50 50 T100 50' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 60 Q25 40 50 60 T100 60' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 70 Q25 50 50 70 T100 70' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px'
      }} />

      {/* Content - upper portion on mobile, centered on desktop */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-20 md:pt-0 md:justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-2xl">
          {/* Abstract trail icon */}
          <div className="mb-5 md:mb-8">
            <AbstractTrailIcon className="w-14 h-24 md:w-20 md:h-36" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-6xl lg:text-7xl font-light tracking-tight text-white mb-2 md:mb-4">
            <span className="font-semibold text-[#ff6b9d]">PCT</span> Soundscapes
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-xl text-stone-400 mb-4 md:mb-3 font-light">
            An Audio Journey Along the Pacific Crest Trail
          </p>

          {/* Trail stats - hidden on mobile */}
          <div className="hidden md:flex items-center gap-6 text-sm text-stone-500 mb-8 flex-wrap justify-center">
            <span>2,650 miles</span>
            <span className="w-1 h-1 rounded-full bg-[#ff6b9d]/40" />
            <span>Mexico to Canada</span>
            <span className="w-1 h-1 rounded-full bg-[#ff6b9d]/40" />
            <span>Field recordings</span>
          </div>

          {/* Description - full text on both mobile and desktop */}
          <p className="text-sm md:text-lg text-stone-400 leading-relaxed max-w-lg mb-0 md:mb-10 px-2 md:px-0">
            Scroll through an immersive map experience featuring ambient soundscapes 
            recorded along the Pacific Crest Trail. Discover the sonic landscape of 
            the American West.
          </p>

          {/* CTA Button - desktop only, inline with content */}
          <button
            onClick={handleEnter}
            className="hidden md:block px-8 py-3 bg-[#ff6b9d] hover:bg-[#ff85ad] text-white font-medium rounded-full transition-all duration-200 hover:scale-105"
          >
            Begin Journey
          </button>
        </div>
      </div>

      {/* Mobile CTA - positioned lower for thumb access */}
      <div className="md:hidden relative z-10 flex justify-center pb-28">
        <button
          onClick={handleEnter}
          className="px-8 py-3 bg-[#ff6b9d] hover:bg-[#ff85ad] text-white font-medium rounded-full transition-all duration-200 active:scale-95"
        >
          Begin Journey
        </button>
      </div>

      {/* Footer credits */}
      <div className="absolute bottom-6 md:bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-stone-600">
          Recordings collected 2025
        </p>
      </div>
    </div>
  )
}
