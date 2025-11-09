"use client"

import { useState, useEffect } from "react"

interface IntroModalProps {
  onBegin: () => void
  mapReady?: boolean // Whether the map is fully loaded and ready
  loadingProgress?: number // Loading progress 0-100
}

export function IntroModal({ onBegin, mapReady = false, loadingProgress = 0 }: IntroModalProps) {
  const [displayProgress, setDisplayProgress] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  
  // Reset and start progress animation when component mounts or loadingProgress changes
  useEffect(() => {
    if (!hasStarted && loadingProgress > 0) {
      setHasStarted(true)
      setDisplayProgress(0) // Always start from 0
    }
  }, [loadingProgress, hasStarted])
  
  // Smooth progress animation - always starts at 0 and animates to current progress
  useEffect(() => {
    if (loadingProgress > displayProgress && hasStarted) {
      const interval = setInterval(() => {
        setDisplayProgress((prev) => {
          if (prev >= loadingProgress) {
            clearInterval(interval)
            return loadingProgress
          }
          // Smooth increment - faster when far from target, slower when close
          const diff = loadingProgress - prev
          const increment = Math.max(0.5, diff / 15)
          const next = Math.min(prev + increment, loadingProgress)
          return next
        })
      }, 30) // Update every 30ms for smooth animation
      
      return () => clearInterval(interval)
    } else if (loadingProgress < displayProgress) {
      // If progress decreases (shouldn't happen, but handle it)
      setDisplayProgress(loadingProgress)
    }
  }, [loadingProgress, displayProgress, hasStarted])

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center overscroll-none"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      onWheel={(e) => e.preventDefault()}
    >
      <div className="max-w-3xl mx-auto px-6 text-center">
        {/* Hero content */}
        <div className="mb-12">
          <div className="inline-block mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ff6b9d] to-[#ff5a8a] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Pacific Crest Trail
            <span className="block text-[#ff6b9d] mt-2">Audio Journey</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto">
            Immerse yourself in the sounds of 2,650 miles of wilderness. From the Mexican border to
            Canada, experience ambient recordings captured along one of America&apos;s most iconic
            trails.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <span>3D Terrain Visualization</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <span>15 Audio Locations</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span>Interactive Storytelling</span>
            </div>
          </div>
        </div>

        {/* Loading indicator - always show until map is ready */}
        {!mapReady && (
          <div className="mb-6 space-y-3">
            <div className="w-full max-w-md mx-auto h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ff6b9d] to-[#ff5a8a] transition-all duration-300 ease-out"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              {displayProgress < 30 
                ? "Loading Mapbox scripts..." 
                : displayProgress < 35 
                ? "Initializing map..." 
                : displayProgress < 45 
                ? "Loading map style..." 
                : displayProgress < 55 
                ? "Loading map tiles..." 
                : displayProgress < 70 
                ? "Preparing trail data..." 
                : displayProgress < 100 
                ? "Finalizing..." 
                : "Ready!"}
            </p>
          </div>
        )}

        {/* Begin button - only show when map is ready */}
        {mapReady && (
          <button
            onClick={onBegin}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#ff6b9d] to-[#ff5a8a] hover:from-[#ff5a8a] hover:to-[#ff4979] text-white text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-[#ff6b9d]/50 cursor-pointer"
          >
            <span>Begin Journey</span>
            <svg
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        )}

        {/* Instructions */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-sm text-gray-500">
            🎧 Best experienced with headphones • Scroll to explore • Click markers to listen
          </p>
        </div>
      </div>
    </div>
  )
}
