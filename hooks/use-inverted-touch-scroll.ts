"use client"

import { useEffect, useRef } from "react"

/**
 * Invert touch scrolling so swipe-down advances the page (scrollY↑),
 * matching trackpad "scroll down to explore". Wheel/trackpad is unchanged.
 *
 * Native touch remains available (swipe-up → scrollY↑). We add the inverse
 * gesture as a second affordance: swipe-down also advances the trail. Swipe-up
 * dismisses the full-screen chapter overlay while that overlay owns the screen.
 */
export function useInvertedTouchScroll(enabled: boolean) {
  const lastYRef = useRef<number | null>(null)
  const lastTRef = useRef(0)
  const velocityRef = useRef(0)
  const inertiaRafRef = useRef(0)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const cancelInertia = () => {
      if (inertiaRafRef.current) {
        cancelAnimationFrame(inertiaRafRef.current)
        inertiaRafRef.current = 0
      }
    }

    const isLocked = () =>
      document.body.style.overflow === "hidden" || document.body.style.touchAction === "none"

    const isNativeScrollTarget = (target: EventTarget | null) => {
      let node = target instanceof Element ? target : null
      while (node && node !== document.documentElement) {
        const style = window.getComputedStyle(node)
        const oy = style.overflowY
        if (
          (oy === "auto" || oy === "scroll" || oy === "overlay") &&
          node.scrollHeight > node.clientHeight + 1
        ) {
          return true
        }
        node = node.parentElement
      }
      return false
    }

    const onTouchStart = (e: TouchEvent) => {
      if (isLocked() || e.touches.length !== 1) return
      cancelInertia()
      lastYRef.current = e.touches[0].clientY
      lastTRef.current = performance.now()
      velocityRef.current = 0
    }

    const onTouchMove = (e: TouchEvent) => {
      if (isLocked() || e.touches.length !== 1 || lastYRef.current === null) return
      if (isNativeScrollTarget(e.target)) return

      const y = e.touches[0].clientY
      const now = performance.now()
      // Finger moves down (y↑) → advance the trail with the inverse gesture.
      // Finger movement up keeps native scrolling and must not be prevented.
      const delta = y - lastYRef.current
      const dt = Math.max(1, now - lastTRef.current)

      if (delta > 0) {
        window.scrollBy(0, delta)
        velocityRef.current = delta / dt
        e.preventDefault()
      } else {
        velocityRef.current = 0
      }
      lastYRef.current = y
      lastTRef.current = now

    }

    const onTouchEnd = () => {
      lastYRef.current = null
      let v = velocityRef.current
      if (v < 0.05) return

      const step = () => {
        if (isLocked()) {
          cancelInertia()
          return
        }
        v *= 0.95
        if (v < 0.02) {
          inertiaRafRef.current = 0
          return
        }
        window.scrollBy(0, v * 16)
        inertiaRafRef.current = requestAnimationFrame(step)
      }
      inertiaRafRef.current = requestAnimationFrame(step)
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true, capture: true })
    window.addEventListener("touchcancel", onTouchEnd, { passive: true, capture: true })

    return () => {
      cancelInertia()
      window.removeEventListener("touchstart", onTouchStart, true)
      window.removeEventListener("touchmove", onTouchMove, true)
      window.removeEventListener("touchend", onTouchEnd, true)
      window.removeEventListener("touchcancel", onTouchEnd, true)
    }
  }, [enabled])
}
