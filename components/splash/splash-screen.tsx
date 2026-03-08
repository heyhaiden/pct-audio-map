"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Volume2 } from "lucide-react"

interface SplashScreenProps {
  onEnter: () => void
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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-950 transition-all duration-800 ease-out ${
        isExiting ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-stone-900/50 to-stone-950" />
      
      {/* Subtle topographic pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q25 30 50 50 T100 50' fill='none' stroke='%23fff' stroke-width='0.5'/%3E%3Cpath d='M0 60 Q25 40 50 60 T100 60' fill='none' stroke='%23fff' stroke-width='0.5'/%3E%3Cpath d='M0 70 Q25 50 50 70 T100 70' fill='none' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px'
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
        {/* Trail marker icon */}
        <div className="mb-8">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-amber-500/60 flex items-center justify-center">
            <Volume2 className="w-8 h-8 md:w-10 md:h-10 text-amber-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-white mb-4">
          <span className="font-semibold">PCT</span> Soundscapes
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-stone-400 mb-3 font-light">
          An Audio Journey Along the Pacific Crest Trail
        </p>

        {/* Trail stats */}
        <div className="flex items-center gap-6 text-sm text-stone-500 mb-12">
          <span>2,650 miles</span>
          <span className="w-1 h-1 rounded-full bg-stone-600" />
          <span>Mexico to Canada</span>
          <span className="w-1 h-1 rounded-full bg-stone-600" />
          <span>Field recordings</span>
        </div>

        {/* Description */}
        <p className="text-base md:text-lg text-stone-400 mb-12 leading-relaxed max-w-lg">
          Scroll through an immersive map experience featuring ambient soundscapes 
          recorded along the Pacific Crest Trail. Discover the sonic landscape of 
          the American West.
        </p>

        {/* CTA Button */}
        <button
          onClick={handleEnter}
          className="group flex flex-col items-center gap-3 transition-all duration-300 hover:scale-105"
        >
          <span className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium rounded-full transition-colors duration-200">
            Begin Journey
          </span>
          <ChevronDown className="w-5 h-5 text-stone-500 animate-bounce" />
        </button>
      </div>

      {/* Footer credits */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-stone-600">
          Recordings collected 2024
        </p>
      </div>
    </div>
  )
}
