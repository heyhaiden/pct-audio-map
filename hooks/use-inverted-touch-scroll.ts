"use client"

import { useEffect, useRef } from "react"
import {
  applyTouchDelta,
  shouldStartInertia,
  stepInertiaVelocity,
} from "@/lib/inverted-touch-scroll"

/**
 * Drive map-journey scrolling from one-finger touch.
 * Swipe-down advances (scrollY↑); swipe-up goes back — both are JS-owned
 * because the fixed Mapbox canvas is not a native scroll target.
 * Wheel/trackpad keep native direction. Two-finger gestures are cancelled
 * so pinch cannot zoom the page or fight the camera.
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
      // Any new touch (including 2-finger) must kill leftover inertia.
      cancelInertia()
      velocityRef.current = 0

      if (isLocked()) {
        lastYRef.current = null
        return
      }

      if (e.touches.length !== 1) {
        lastYRef.current = null
        return
      }

      lastYRef.current = e.touches[0].clientY
      lastTRef.current = performance.now()
    }

    const onTouchMove = (e: TouchEvent) => {
      if (isLocked()) return

      // Block pinch / two-finger zoom on the journey page.
      if (e.touches.length >= 2) {
        lastYRef.current = null
        velocityRef.current = 0
        e.preventDefault()
        return
      }

      if (e.touches.length !== 1 || lastYRef.current === null) return
      if (isNativeScrollTarget(e.target)) return

      const y = e.touches[0].clientY
      const now = performance.now()
      const { scrollDelta, velocity } = applyTouchDelta({
        deltaY: y - lastYRef.current,
        deltaMs: now - lastTRef.current,
      })

      window.scrollBy(0, scrollDelta)
      velocityRef.current = velocity
      e.preventDefault()

      lastYRef.current = y
      lastTRef.current = now
    }

    const onTouchEnd = () => {
      lastYRef.current = null
      let v = velocityRef.current
      if (!shouldStartInertia(v)) return

      const step = () => {
        if (isLocked()) {
          cancelInertia()
          return
        }
        v = stepInertiaVelocity(v)
        if (v === 0) {
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
