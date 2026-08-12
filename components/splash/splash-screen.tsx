"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

interface SplashScreenProps {
  onEnter: () => void
  /** When false, Begin Journey stays disabled while the trailhead corridor warms. */
  trailheadReady?: boolean
  /** 0–1 warm progress for the button loading bar. */
  trailheadProgress?: number
  /**
   * When true, fade the splash away. Parent should set this only after the map
   * camera is restored to overview so the user never sees a mid-trail warm pose.
   */
  revealMap?: boolean
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
    </svg>
  )
}

function BeginJourneyButton({
  ready,
  progress,
  onClick,
  className,
}: {
  ready: boolean
  progress: number
  onClick: () => void
  className?: string
}) {
  const [fill, setFill] = useState(0.04)
  const [unlocked, setUnlocked] = useState(false)
  const fillRef = useRef(0.04)
  const rafRef = useRef<number | null>(null)

  // Smoothly chase progress; when already-warmed (ready jumps to true),
  // run a short ease-out fill so the button doesn't snap unlock.
  useEffect(() => {
    const target = ready ? 1 : Math.max(0.04, Math.min(0.97, progress))
    const from = fillRef.current

    if (Math.abs(target - from) < 0.005) {
      if (ready && target >= 1) {
        fillRef.current = 1
        setFill(1)
        const settle = window.setTimeout(() => setUnlocked(true), 180)
        return () => clearTimeout(settle)
      }
      return
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const start = performance.now()
    // Cached / instant ready: longer, more graceful sweep. Incremental warm: snappier.
    const duration = ready && from < 0.7 ? 900 : ready ? 450 : 320
    let settleTimer: number | undefined

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (target - from) * eased
      fillRef.current = next
      setFill(next)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      if (ready) {
        settleTimer = window.setTimeout(() => setUnlocked(true), 160)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (settleTimer) clearTimeout(settleTimer)
    }
  }, [ready, progress])

  const showPreparing = !unlocked
  const label = unlocked ? "Begin Journey" : "Preparing trail…"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!unlocked}
      aria-busy={showPreparing}
      aria-label={
        unlocked ? "Begin Journey" : `Preparing trail, ${Math.round(fill * 100)} percent`
      }
      className={`relative overflow-hidden text-white font-medium rounded-full transition-[transform,background-color,box-shadow] duration-500 ease-out ${
        unlocked
          ? "bg-[#ff6b9d] hover:bg-[#ff85ad] hover:scale-105 active:scale-95 shadow-[0_0_0_0_rgba(255,107,157,0)]"
          : "bg-[#ff6b9d]/20 cursor-wait"
      } ${className ?? ""}`}
    >
      {/* Fill bar — stays through the unlock frame so the sweep can finish */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 bg-[#ff6b9d] transition-opacity duration-500 ${
          unlocked ? "opacity-0" : "opacity-100"
        }`}
        style={{ width: `${Math.max(4, fill * 100)}%` }}
      />
      {/* Soft sheen while preparing */}
      {showPreparing && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "pct-btn-sheen 1.4s ease-in-out infinite",
          }}
        />
      )}
      <span
        className={`relative z-10 transition-opacity duration-300 ${
          unlocked ? "opacity-100" : "opacity-95"
        }`}
      >
        {label}
      </span>
    </button>
  )
}

export function SplashScreen({
  onEnter,
  trailheadReady = false,
  trailheadProgress = 0,
  revealMap = false,
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  // Lock scroll when splash is visible
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isVisible])

  // Parent signals overview camera is ready — now fade splash (map is already correct underneath)
  useEffect(() => {
    if (!revealMap || isExiting || !hasStarted) return

    setIsExiting(true)
    const t = setTimeout(() => setIsVisible(false), 700)
    return () => clearTimeout(t)
  }, [revealMap, isExiting, hasStarted])

  const handleEnter = () => {
    if (!trailheadReady || isExiting || hasStarted) return
    setHasStarted(true)
    // Start journey under the still-opaque splash — parent restores overview, then sets revealMap
    onEnter()
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-stone-950 transition-all duration-700 ease-out ${
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

      {/* Content - centered vertically on both mobile and desktop */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-2xl">
          {/* Abstract trail icon */}
          <div className="mb-8 md:mb-8">
            <AbstractTrailIcon className="w-16 h-28 md:w-20 md:h-36" />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-white mb-4 md:mb-4">
            <span className="font-semibold text-[#ff6b9d]">PCT</span> Soundscapes
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-stone-300 mb-3 font-light">
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

          {/* Compact stats line - mobile only */}
          <div className="md:hidden flex items-center gap-3 text-xs text-stone-500 mb-5">
            <span>2,650 mi</span>
            <span className="w-1 h-1 rounded-full bg-[#ff6b9d]/40" />
            <span>Mexico to Canada</span>
          </div>

          {/* Description - desktop only */}
          <p className="hidden md:block text-lg text-stone-400 leading-relaxed max-w-lg mb-10">
            Scroll through an immersive map experience featuring ambient soundscapes
            recorded along the Pacific Crest Trail. Discover the sonic landscape of
            the American West.
          </p>

          {/* Description - mobile only (condensed) */}
          <p className="md:hidden text-base text-stone-400 leading-relaxed max-w-sm">
            Scroll through an immersive map featuring ambient soundscapes recorded
            along the trail — the sonic landscape of the American West.
          </p>

          {/* CTA Buttons - desktop only, inline with content */}
          <div className="hidden md:flex flex-col items-center gap-3">
            <BeginJourneyButton
              ready={trailheadReady}
              progress={trailheadProgress}
              onClick={handleEnter}
              className="px-8 py-3"
            />
            <Link
              href="/about"
              className="px-6 py-2 text-sm text-stone-400 hover:text-white rounded-full border border-transparent hover:border-stone-600 transition-all duration-200"
            >
              About this project
            </Link>
          </div>

          {/* Mobile CTA - pushed down into the thumb-tap zone */}
          <div className="md:hidden flex flex-col items-center gap-4 mt-16 pb-[env(safe-area-inset-bottom)]">
            <BeginJourneyButton
              ready={trailheadReady}
              progress={trailheadProgress}
              onClick={handleEnter}
              className="px-10 py-3.5 text-base"
            />
            <Link
              href="/about"
              className="px-6 py-2 text-sm text-stone-400 hover:text-white rounded-full border border-transparent hover:border-stone-600 transition-all duration-200"
            >
              About this project
            </Link>
          </div>
        </div>
      </div>

      {/* Footer credits - hidden on mobile to avoid overlap */}
      <div className="hidden md:block absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-stone-600">
          Recordings collected 2025
        </p>
      </div>
    </div>
  )
}
