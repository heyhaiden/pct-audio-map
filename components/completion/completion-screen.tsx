"use client"

import { useState, useEffect } from "react"
import { Mountain, Instagram, Twitter, RefreshCcw } from "lucide-react"

interface CompletionScreenProps {
  isVisible: boolean
  totalMiles: number
  onRestart: () => void
}

export function CompletionScreen({ isVisible, totalMiles, onRestart }: CompletionScreenProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isVisible) {
      // Delay content reveal for dramatic effect
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950/95 backdrop-blur-sm transition-opacity duration-1000 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-amber-950/20 via-transparent to-stone-950" />

      {/* Content */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 max-w-xl transition-all duration-1000 delay-300 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Monument icon */}
        <div className="mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center">
            <Mountain className="w-10 h-10 md:w-12 md:h-12 text-amber-500" />
          </div>
        </div>

        {/* Celebration text */}
        <h1 className="text-3xl md:text-5xl font-light text-white mb-4">
          Journey Complete
        </h1>

        <p className="text-lg md:text-xl text-amber-500/80 mb-2 font-light">
          Monument 78, Manning Park
        </p>

        <p className="text-stone-400 mb-8">
          You've traveled {totalMiles.toLocaleString()} miles from Mexico to Canada
        </p>

        {/* Stats summary */}
        <div className="flex items-center justify-center gap-8 mb-10 text-center">
          <div>
            <p className="text-2xl md:text-3xl font-semibold text-white">{totalMiles.toLocaleString()}</p>
            <p className="text-xs text-stone-500">Miles</p>
          </div>
          <div className="w-px h-10 bg-stone-800" />
          <div>
            <p className="text-2xl md:text-3xl font-semibold text-white">5</p>
            <p className="text-xs text-stone-500">Regions</p>
          </div>
          <div className="w-px h-10 bg-stone-800" />
          <div>
            <p className="text-2xl md:text-3xl font-semibold text-white">30+</p>
            <p className="text-xs text-stone-500">Soundscapes</p>
          </div>
        </div>

        {/* Thank you message */}
        <p className="text-stone-400 text-sm mb-8 max-w-md">
          Thank you for experiencing the sounds of the Pacific Crest Trail. 
          Share your journey and explore again whenever you'd like.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium rounded-full transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Start Over
          </button>

          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
              aria-label="Share on Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
              aria-label="Share on Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className={`absolute bottom-8 text-center transition-all duration-1000 delay-500 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-xs text-stone-600">
          PCT Soundscapes - Field recordings collected 2024
        </p>
      </div>
    </div>
  )
}
