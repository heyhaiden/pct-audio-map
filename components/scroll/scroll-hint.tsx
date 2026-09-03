"use client"

import { useEffect, useRef, useState } from "react"
import { Pointer } from "lucide-react"

interface ScrollHintProps {
  /** The hint is allowed to appear at all — nothing else owns the view. */
  enabled: boolean
  /** First lull after arriving on the trail (2–3s). */
  initialDelayMs?: number
  /** Later lulls, once the user has already been nudged or has scrolled. */
  idleDelayMs?: number
}

const ACTIVITY_EVENTS = [
  "wheel",
  "scroll",
  "touchstart",
  "touchmove",
  "pointerdown",
  "keydown",
] as const

/** First pause at the trailhead — long enough to land, short enough to notice. */
const INITIAL_DELAY_MS = 2500
/** Re-nudge only after a real stall, not every brief pause. */
const IDLE_DELAY_MS = 12000

/**
 * "Scroll to explore" nudge. Hidden on arrival, fades up after a short idle at
 * the start of the map, then only again after a much longer stall. Hides the
 * moment the user does anything.
 */
export function ScrollHint({
  enabled,
  initialDelayMs = INITIAL_DELAY_MS,
  idleDelayMs = IDLE_DELAY_MS,
}: ScrollHintProps) {
  const [visible, setVisible] = useState(false)
  // Defaults to the mouse until proven otherwise, so the web view never
  // flashes a finger during hydration.
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)")
    const sync = () => setIsTouch(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])
  const hasUsedInitialPrompt = useRef(false)

  useEffect(() => {
    if (!enabled) {
      setVisible(false)
      return
    }

    let timer = 0
    const arm = () => {
      setVisible(false)
      window.clearTimeout(timer)
      const delay = hasUsedInitialPrompt.current ? idleDelayMs : initialDelayMs
      timer = window.setTimeout(() => {
        hasUsedInitialPrompt.current = true
        setVisible(true)
      }, delay)
    }

    const onActivity = () => {
      hasUsedInitialPrompt.current = true
      arm()
    }

    arm()
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true }),
    )

    return () => {
      window.clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, onActivity),
      )
    }
  }, [enabled, initialDelayMs, idleDelayMs])

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none fixed bottom-32 left-1/2 z-30 -translate-x-1/2 transition-[opacity,translate] duration-700 ease-out md:bottom-20 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="pct-glass-panel w-max px-3 py-2">
        <div className="flex items-center gap-2 whitespace-nowrap">
          {/* Keyed to pointer type, not width: a narrow desktop window still
              scrolls with a wheel, so it keeps the mouse. */}
          {isTouch ? (
            <span className="pct-swipe-down inline-flex size-4 shrink-0 items-center justify-center overflow-visible">
              <Pointer
                size={16}
                strokeWidth={1.25}
                className="block size-4 text-[#ed5a43]"
                aria-hidden
              />
            </span>
          ) : (
            <div className="relative h-5 w-3 shrink-0 rounded-sm border border-[#8b8271]">
              <div className="absolute left-1/2 top-0.5 h-1.5 w-0.5 -translate-x-1/2 animate-bounce rounded-full bg-[#ed5a43]" />
            </div>
          )}
          <span className="whitespace-nowrap font-mono text-nav uppercase tracking-[0.14em] text-[#9b8e7a]">
            {isTouch ? "Swipe down to explore" : "Scroll to explore"}
          </span>
        </div>
      </div>
    </div>
  )
}
