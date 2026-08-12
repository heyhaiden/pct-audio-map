"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Construction, Library, X, Compass } from "lucide-react"
import { exitDocumentFullscreen, markNavigatedFromMap } from "@/lib/map-session"

interface WipScreenProps {
  isVisible: boolean
  onRestart: () => void
  /** Close the notice and keep exploring the map from the current position. */
  onDismiss: () => void
}

export function WipScreen({ isVisible, onRestart, onDismiss }: WipScreenProps) {
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
      className={`pct-glass-terminal fixed inset-0 z-[60] flex flex-col transition-opacity duration-1000 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Close — dismiss and keep exploring the map */}
      <button
        onClick={onDismiss}
        className="pct-glass-control absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full text-[#ada396] transition hover:text-[#d9cba8] md:right-[22px] md:top-5 md:h-10 md:w-10"
        aria-label="Close and keep exploring"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center justify-center">
        <div
          className={`relative z-10 flex max-w-sm flex-col items-center px-7 text-center transition-all delay-300 duration-1000 ${
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="mb-6">
            <div className="pct-glass-control flex h-16 w-16 items-center justify-center rounded-full">
              <Construction className="h-7 w-7 text-[#d9cba8]" />
            </div>
          </div>

          <h1 className="pct-display mb-3 text-[29px] font-normal text-[#f6f1e4] md:text-[36px]">Trail Continues</h1>

          <p className="mb-5 font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#8b8271]">
            More soundscapes coming
          </p>

          <p className="pct-display mb-5 max-w-[260px] text-[13px] font-light leading-[1.65] text-[#c0b7a6]">
            You&apos;ve reached the edge of what we&apos;ve mapped so far — early Oregon and beyond
            are still in progress.
          </p>

          <p className="pct-display mb-7 max-w-[260px] text-[12.5px] font-light leading-[1.65] text-[#ada396]">
            Keep exploring the map from here, browse the library, or head back south for more
            audio while we keep recording.
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={onDismiss}
                className="flex items-center gap-2 rounded-full bg-[#d9cba8] px-6 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#3e3527] transition hover:bg-[#e6d9b7]"
              >
                <Compass className="w-4 h-4" />
                Keep exploring
              </button>
              <Link
                href="/library"
                onClick={() => {
                  exitDocumentFullscreen()
                  markNavigatedFromMap()
                }}
                className="pct-glass-control flex items-center gap-2 rounded-full px-6 py-3 font-mono text-[9px] uppercase tracking-[0.14em] transition hover:text-[#d9cba8]"
              >
                <Library className="w-4 h-4" />
                Audio library
              </Link>
            </div>

            <button
              onClick={onRestart}
              className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#8b8271] transition hover:text-[#d9cba8]"
            >
              Restart journey
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
