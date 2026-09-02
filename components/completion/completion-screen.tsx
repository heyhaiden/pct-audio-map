"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Headphones, RotateCcw } from "lucide-react"
import { exitDocumentFullscreen, markNavigatedFromMap } from "@/lib/map-session"

interface CompletionScreenProps {
  isVisible: boolean
  totalMiles: number
  onRestart: () => void
}

export function CompletionScreen({ isVisible, totalMiles, onRestart }: CompletionScreenProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setShowContent(false)
      return
    }

    const timer = window.setTimeout(() => setShowContent(true), 500)
    return () => window.clearTimeout(timer)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className={`pct-glass-terminal fixed inset-0 z-[60] overflow-y-auto transition-opacity duration-1000 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex min-h-full items-center justify-center px-7 py-[34px]">
        <div
          className={`flex w-full max-w-[280px] flex-col items-center text-center transition-all duration-1000 ${
            showContent ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
          }`}
        >
          <p className="mb-4 font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#8b8271]">
            Northern Terminus · MI {totalMiles.toLocaleString("en-US")}
          </p>

          <h1 className="pct-display text-[29px] font-normal leading-[1.18] text-[#f6f1e4] md:text-[36px]">
            You&apos;ve reached
            <br />
            the monument.
          </h1>

          <p className="pct-display mt-5 max-w-[224px] text-[13px] font-light leading-[1.65] text-[#c0b7a6]">
            Field recordings across two thousand six hundred and fifty miles. Thank you for listening
            to them.
          </p>

          <div className="mt-8 w-full max-w-[232px] text-left">
            <Link
              href="/about"
              onClick={() => {
                exitDocumentFullscreen()
                markNavigatedFromMap()
              }}
              className="pct-link-row"
            >
              About the project
              <ArrowRight className="h-3.5 w-3.5 text-[#8b8271]" />
            </Link>
            <Link
              href="/about#get-involved"
              onClick={() => {
                exitDocumentFullscreen()
                markNavigatedFromMap()
              }}
              className="pct-link-row"
            >
              Get involved
              <ArrowRight className="h-3.5 w-3.5 text-[#8b8271]" />
            </Link>
            <Link
              href="/library"
              onClick={() => {
                exitDocumentFullscreen()
                markNavigatedFromMap()
              }}
              className="pct-link-row"
            >
              <span className="flex items-center gap-2">
                <Headphones className="h-3.5 w-3.5" />
                Audio library
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#8b8271]" />
            </Link>
            <button type="button" onClick={onRestart} className="pct-link-row border-b border-b-[#ed5a43]/20">
              Start over
              <RotateCcw className="h-3.5 w-3.5 text-[#8b8271]" />
            </button>
          </div>

          <p className="mt-6 font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#6b6455]">
            ↑ Scroll to return to map
          </p>
        </div>
      </div>
    </div>
  )
}
