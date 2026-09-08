"use client"

import { useEffect } from "react"

/** Wheel deltas arrive in lines or pages depending on the device. */
function pixelDelta(event: WheelEvent): number {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight
  return event.deltaY
}

/**
 * Match the trackpad to the touch gesture.
 *
 * `useInvertedTouchScroll` makes a downward drag advance the trail. Native
 * wheel does the opposite under macOS natural scrolling — a two-finger swipe
 * down reports `deltaY < 0`, lowers scrollY, and walks the trail backwards — so
 * the same physical gesture ran in opposite directions on phone and desktop.
 * Inverting here puts both on "drag down to go north".
 *
 * Touch pointers are skipped: those are already handled by the touch hook.
 */
export function useInvertedWheelScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    if (window.matchMedia("(pointer: coarse)").matches) return

    const isLocked = () =>
      document.body.style.overflow === "hidden" ||
      document.documentElement.style.overflow === "hidden"

    const onWheel = (event: WheelEvent) => {
      if (isLocked()) return
      // Ctrl+wheel is the browser's pinch-zoom gesture — leave it alone.
      if (event.ctrlKey) return
      // Overlay cards scroll their own content natively.
      const target = event.target
      if (target instanceof Element && target.closest("[data-overlay-scroll]")) return

      event.preventDefault()
      window.scrollBy(0, -pixelDelta(event))
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    return () => window.removeEventListener("wheel", onWheel)
  }, [enabled])
}
