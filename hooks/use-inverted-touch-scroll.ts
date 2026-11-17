"use client"

import { useEffect, useRef } from "react"
import { applyJourneyScrollDelta } from "@/lib/chapter-scroll-gate"
import {
  applyTouchDelta,
  clearNativeTextSelection,
  isNativeScrollTarget,
  isTapGesture,
  isTrailCameraSettling,
  noteTrailTouchEnd,
  noteTrailTouchMove,
  noteTrailTouchStart,
  shouldCoastAfterRelease,
  shouldPreventTouchStartCallout,
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
  /** Where and when this stroke's finger went down, and how far it has strayed. */
  const strokeRef = useRef<{ x: number; y: number; t: number; maxTravel: number } | null>(null)
  const interruptedGlideRef = useRef(false)
  const velocityRef = useRef(0)
  const inertiaRafRef = useRef(0)
  const preventedCalloutRef = useRef(false)
  const consumeStrokeRef = useRef(false)
  /** Answered on a stroke's first move, then reused until the next touchstart. */
  const nativeScrollStrokeRef = useRef<boolean | null>(null)

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

    // A touch keeps its target for the whole stroke, so one answer covers it.
    // Asking on every touchmove forced a style recalculation each time.
    const strokeStartedOnNativeScroller = (target: EventTarget | null) => {
      if (nativeScrollStrokeRef.current === null) {
        nativeScrollStrokeRef.current = isNativeScrollTarget(
          target instanceof Element ? target : null,
          document.documentElement,
          (node) => window.getComputedStyle(node).overflowY,
        )
      }
      return nativeScrollStrokeRef.current
    }

    const onTouchStart = (e: TouchEvent) => {
      // Any new touch (including 2-finger) must kill leftover inertia.
      interruptedGlideRef.current = inertiaRafRef.current !== 0
      cancelInertia()
      velocityRef.current = 0
      consumeStrokeRef.current = false
      nativeScrollStrokeRef.current = null
      noteTrailTouchStart()
      clearNativeTextSelection()
      preventedCalloutRef.current = false
      strokeRef.current = null

      if (isLocked()) {
        lastYRef.current = null
        return
      }

      if (e.touches.length !== 1) {
        lastYRef.current = null
        return
      }

      const now = performance.now()
      lastYRef.current = e.touches[0].clientY
      lastTRef.current = now
      strokeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: now, maxTravel: 0 }

      // Chrome iOS Copy/Search starts on touchstart. CSS user-select is not enough.
      if (shouldPreventTouchStartCallout(e.target)) {
        e.preventDefault()
        preventedCalloutRef.current = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (isLocked()) return

      // Block pinch / two-finger zoom on the journey page.
      if (e.touches.length >= 2) {
        lastYRef.current = null
        strokeRef.current = null
        velocityRef.current = 0
        e.preventDefault()
        return
      }

      const stroke = strokeRef.current
      if (stroke && e.touches.length === 1) {
        const travel = Math.hypot(e.touches[0].clientX - stroke.x, e.touches[0].clientY - stroke.y)
        if (travel > stroke.maxTravel) stroke.maxTravel = travel
      }

      if (consumeStrokeRef.current) {
        e.preventDefault()
        return
      }

      if (e.touches.length !== 1 || lastYRef.current === null) return
      if (strokeStartedOnNativeScroller(e.target)) return

      const y = e.touches[0].clientY
      const now = performance.now()
      const { scrollDelta, velocity } = applyTouchDelta({
        deltaY: y - lastYRef.current,
        deltaMs: now - lastTRef.current,
      })

      const hitGate = applyJourneyScrollDelta(scrollDelta)
      if (hitGate) {
        // Rest of this stroke would keep scrolling through the new chapter and
        // eat the 20-mile mobile overlay window before the card can lock.
        velocityRef.current = 0
        lastYRef.current = null
        consumeStrokeRef.current = true
        cancelInertia()
      } else {
        velocityRef.current = velocity
        lastYRef.current = y
      }
      noteTrailTouchMove(now)
      e.preventDefault()

      lastTRef.current = now
    }

    const onTouchEnd = (e: TouchEvent) => {
      const releasedAt = performance.now()
      const msSinceMove = releasedAt - lastTRef.current
      let v = velocityRef.current
      const stroke = strokeRef.current
      strokeRef.current = null
      lastYRef.current = null
      noteTrailTouchEnd()
      clearNativeTextSelection()

      // preventDefault on touchstart suppresses the synthesized click that
      // audio pins listen for — replay it, but only for a real tap.
      if (preventedCalloutRef.current && e.changedTouches[0] && stroke) {
        const t = e.changedTouches[0]
        const tap = isTapGesture({
          maxTravelPx: Math.max(stroke.maxTravel, Math.hypot(t.clientX - stroke.x, t.clientY - stroke.y)),
          durationMs: releasedAt - stroke.t,
          interruptedGlide: interruptedGlideRef.current,
        })
        if (tap) {
          const hit =
            document.elementFromPoint(t.clientX, t.clientY) ??
            (e.target instanceof Element ? e.target : null)
          hit?.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: t.clientX,
              clientY: t.clientY,
            }),
          )
        }
      }
      preventedCalloutRef.current = false

      if (!shouldCoastAfterRelease(v, msSinceMove)) {
        velocityRef.current = 0
        return
      }

      const step = () => {
        if (isLocked() || isTrailCameraSettling()) {
          cancelInertia()
          return
        }
        v = stepInertiaVelocity(v)
        if (v === 0) {
          inertiaRafRef.current = 0
          return
        }
        if (applyJourneyScrollDelta(v * 16)) {
          velocityRef.current = 0
          cancelInertia()
          return
        }
        inertiaRafRef.current = requestAnimationFrame(step)
      }
      inertiaRafRef.current = requestAnimationFrame(step)
    }

    const onNativeHoldMenu = (e: Event) => {
      if (!shouldPreventTouchStartCallout(e.target)) return
      e.preventDefault()
      clearNativeTextSelection()
    }

    const onSelectionChange = () => clearNativeTextSelection()

    window.addEventListener("touchstart", onTouchStart, { passive: false, capture: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true, capture: true })
    window.addEventListener("touchcancel", onTouchEnd, { passive: true, capture: true })
    window.addEventListener("contextmenu", onNativeHoldMenu, { capture: true })
    window.addEventListener("selectstart", onNativeHoldMenu, { capture: true })
    document.addEventListener("selectionchange", onSelectionChange)

    return () => {
      cancelInertia()
      noteTrailTouchEnd()
      window.removeEventListener("touchstart", onTouchStart, true)
      window.removeEventListener("touchmove", onTouchMove, true)
      window.removeEventListener("touchend", onTouchEnd, true)
      window.removeEventListener("touchcancel", onTouchEnd, true)
      window.removeEventListener("contextmenu", onNativeHoldMenu, true)
      window.removeEventListener("selectstart", onNativeHoldMenu, true)
      document.removeEventListener("selectionchange", onSelectionChange)
    }
  }, [enabled])
}
