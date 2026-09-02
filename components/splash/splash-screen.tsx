"use client"

import { useState, useEffect, useRef } from "react"
import { Headphones } from "lucide-react"
import { SiteHeader } from "@/components/navigation/site-header"
import { SPLASH_SCROLL_LOCK_CLASS } from "@/lib/splash-scroll-lock"

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
        strokeWidth="3.1"
        strokeLinecap="round"
        fill="none"
        className="text-[#ed5a43]"
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
      className={`relative overflow-hidden rounded-full font-mono text-[13px] font-medium uppercase tracking-[0.2em] text-white transition-[transform,background-color,box-shadow] duration-500 ease-out ${
        unlocked
          ? "bg-[#ed5a43] hover:bg-[#f06b57] hover:scale-[1.02] active:scale-95 shadow-[0_10px_28px_rgba(0,0,0,0.32)]"
          : "bg-[#ed5a43]/20 cursor-wait text-[#ed5a43]"
      } ${className ?? ""}`}
    >
      {/* Fill bar — stays through the unlock frame so the sweep can finish */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 bg-[#ed5a43] transition-opacity duration-500 ${
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

  // Lock html+body. Body-only overflow leaves html as the scroller.
  useEffect(() => {
    if (!isVisible) return
    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
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
      className={`pct-glass-scrim ${SPLASH_SCROLL_LOCK_CLASS} fixed inset-0 z-[100] flex flex-col transition-opacity duration-700 ease-out ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Subtle topographic pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q25 30 50 50 T100 50' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 60 Q25 40 50 60 T100 60' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 70 Q25 50 50 70 T100 70' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px'
      }} />

      <SiteHeader current="home" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 py-11">
        <div className="flex max-w-[30rem] flex-col items-center text-center">
          {/* Abstract trail icon */}
          <div className="mb-8">
            <AbstractTrailIcon className="h-[88px] w-[50px]" />
          </div>

          <h1 className="pct-display mb-2.5 text-[45px] font-normal leading-none text-[#f6f1e4] md:text-[55px]">
            PCT Soundscapes
          </h1>

          <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.26em] text-[#948a79]">
            Mexico → Canada · Field recordings
          </p>

          <p className="pct-display mb-10 max-w-[325px] text-[17px] font-light leading-[1.65] text-[#c7beac] md:max-w-[400px]">
            An audio journey along the Pacific Crest Trail. Scroll to walk it. Stop anywhere and stay
            as long as you like.
          </p>

          <div className="flex flex-col items-center">
            <BeginJourneyButton
              ready={trailheadReady}
              progress={trailheadProgress}
              onClick={handleEnter}
              className="px-[38px] py-4"
            />
            <div className="pct-splash-headphones mt-6 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#948a79]">
              <Headphones className="h-4 w-4" />
              Best with headphones
            </div>
          </div>
        </div>
      </div>

      <div className="pct-splash-footer absolute bottom-[max(28px,env(safe-area-inset-bottom))] left-0 right-0 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#4f493f]">
          Recorded 2025
        </p>
      </div>
    </div>
  )
}
