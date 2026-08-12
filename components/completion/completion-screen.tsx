"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Headphones,
  HeartHandshake,
  Info,
  Linkedin,
  Mountain,
  RotateCcw,
} from "lucide-react"

// X/Twitter icon component (lucide doesn't have the new X logo)
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

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
      className={`fixed inset-0 z-[60] overflow-y-auto bg-stone-950/95 backdrop-blur-sm transition-opacity duration-1000 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
    >

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#ff6b9d]/10 via-transparent to-stone-950" />

      {/* Content - centered in remaining space */}
      <div className="flex min-h-full items-center justify-center py-12">
        <div
          className={`relative z-10 flex flex-col items-center text-center px-6 max-w-xl transition-all duration-1000 delay-300 ${
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
        {/* Monument icon */}
        <div className="mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#ff6b9d]/10 border-2 border-[#ff6b9d]/40 flex items-center justify-center">
            <Mountain className="w-10 h-10 md:w-12 md:h-12 text-[#ff6b9d]" />
          </div>
        </div>

        {/* Celebration text */}
        <h1 className="text-3xl md:text-5xl font-light text-white mb-4">
          Journey Complete
        </h1>

        <p className="text-lg md:text-xl text-[#ff6b9d]/80 mb-2 font-light">
          Monument 78, Manning Park
        </p>

        <p className="text-stone-400 mb-8">
          You've traveled {totalMiles.toLocaleString("en-US")} miles from Mexico to Canada
        </p>

        {/* Stats summary */}
        <div className="flex items-center justify-center gap-8 mb-10 text-center">
          <div>
            <p className="text-2xl md:text-3xl font-semibold text-white">{totalMiles.toLocaleString("en-US")}</p>
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
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          <div className="w-full border-y border-stone-800 text-left">
            <Link
              href="/about"
              className="flex items-center justify-between border-b border-stone-800 px-1 py-3.5 font-mono text-xs uppercase tracking-[0.14em] text-stone-200 transition hover:text-[#ff6b9d]"
            >
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                About the project
              </span>
              <ArrowRight className="h-4 w-4 text-stone-500" />
            </Link>
            <Link
              href="/about#get-involved"
              className="flex items-center justify-between border-b border-stone-800 px-1 py-3.5 font-mono text-xs uppercase tracking-[0.14em] text-stone-200 transition hover:text-[#ff6b9d]"
            >
              <span className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4" />
                Get involved
              </span>
              <ArrowRight className="h-4 w-4 text-stone-500" />
            </Link>
            <Link
              href="/library"
              className="flex items-center justify-between border-b border-stone-800 px-1 py-3.5 font-mono text-xs uppercase tracking-[0.14em] text-stone-200 transition hover:text-[#ff6b9d]"
            >
              <span className="flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Audio Library
              </span>
              <ArrowRight className="h-4 w-4 text-stone-500" />
            </Link>
            <button
              type="button"
              onClick={onRestart}
              className="flex w-full items-center justify-between px-1 py-3.5 font-mono text-xs uppercase tracking-[0.14em] text-stone-200 transition hover:text-[#ff6b9d]"
            >
              <span className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Start over
              </span>
              <RotateCcw className="h-4 w-4 text-stone-500" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://www.linkedin.com/shareArticle?mini=true&url=https://pctsoundscapes.com&title=I%20just%20completed%20the%20Pacific%20Crest%20Trail%20audio%20journey!&summary=2,650%20miles%20of%20immersive%20soundscapes%20from%20Mexico%20to%20Canada.%20Experience%20the%20PCT%20like%20never%20before."
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-800 text-stone-400 transition-colors hover:bg-stone-700 hover:text-white"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com/intent/tweet?text=I%20just%20completed%20the%20Pacific%20Crest%20Trail%20audio%20journey%20%F0%9F%8F%94%EF%B8%8F%0A%0A2,650%20miles%20of%20immersive%20soundscapes%20from%20Mexico%20to%20Canada.%20Experience%20the%20PCT%20like%20never%20before.&url=https://pctsoundscapes.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-800 text-stone-400 transition-colors hover:bg-stone-700 hover:text-white"
              aria-label="Share on X"
            >
              <XIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
        </div>
      </div>


    </div>
  )
}
