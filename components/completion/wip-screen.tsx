"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Construction, Library } from "lucide-react"

interface WipScreenProps {
  isVisible: boolean
  onRestart: () => void
}

export function WipScreen({ isVisible, onRestart }: WipScreenProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isVisible) {
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
      className={`fixed inset-0 z-50 flex flex-col bg-stone-950/95 backdrop-blur-sm transition-opacity duration-1000 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#ff6b9d]/10 via-transparent to-stone-950" />

      <div className="flex-1 flex items-center justify-center">
        <div
          className={`relative z-10 flex flex-col items-center text-center px-6 max-w-xl transition-all duration-1000 delay-300 ${
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="mb-8">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#ff6b9d]/10 border-2 border-[#ff6b9d]/40 flex items-center justify-center">
              <Construction className="w-10 h-10 md:w-12 md:h-12 text-[#ff6b9d]" />
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-light text-white mb-4">Trail Continues</h1>

          <p className="text-lg md:text-xl text-[#ff6b9d]/80 mb-2 font-light">
            More soundscapes coming
          </p>

          <p className="text-stone-400 mb-8">
            You&apos;ve reached the edge of what we&apos;ve mapped so far — early Oregon and beyond
            are still in progress.
          </p>

          <p className="text-stone-400 text-sm mb-8 max-w-md">
            Thanks for exploring the PCT with us. Head back south for more audio, or browse the
            library while we keep recording.
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/library"
                className="flex items-center gap-2 px-6 py-3 bg-[#ff6b9d] hover:bg-[#ff85ad] text-white font-medium rounded-full transition-colors"
              >
                <Library className="w-4 h-4" />
                Audio Library
              </Link>
            </div>

            <button
              onClick={onRestart}
              className="px-6 py-2.5 text-sm text-stone-400 hover:text-white border border-stone-700 hover:border-stone-500 rounded-full transition-colors"
            >
              Back to the trail
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
