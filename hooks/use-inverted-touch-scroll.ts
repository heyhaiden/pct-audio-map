"use client"

import { useEffect, useRef } from "react"
import { applyJourneyScrollDelta } from "@/lib/chapter-scroll-gate"
import {
  applyTouchDelta,
  clampGlideVelocity,
  clearNativeTextSelection,
  createVelocityTracker,
  isNativeScrollTarget,
  isTrailCameraSettling,
  noteTrailTouchEnd,
  noteTrailTouchMove,
  noteTrailTouchStart,
  shouldCoastAfterRelease,
  shouldPreventTouchStartCallout,
  stepGlideVelocity,
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
  const lastXRef = useRef(0)
  const velocityRef = useRef(createVelocityTracker())
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
      cancelInertia()
      velocityRef.current.reset()
      consumeStrokeRef.current = false
      nativeScrollStrokeRef.current = null
      noteTrailTouchStart()
      clearNativeTextSelection()
      preventedCalloutRef.current = false

      if (isLocked()) {
        lastYRef.current = null
        return
      }

      if (e.touches.length !== 1) {
        lastYRef.current = null
        return
      }

      lastXRef.current = e.touches[0].clientX
      lastYRef.current = e.touches[0].clientY
      lastTRef.current = performance.now()

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
        velocityRef.current.reset()
        e.preventDefault()
        return
      }

      if (consumeStrokeRef.current) {
        e.preventDefault()
        return
      }

      if (e.touches.length !== 1 || lastYRef.current === null) return
      if (strokeStartedOnNativeScroller(e.target)) return

      const y = e.touches[0].clientY
      const now = performance.now()
      const { scrollDelta } = applyTouchDelta({
        deltaY: y - lastYRef.current,
        deltaMs: now - lastTRef.current,
      })

      const hitGate = applyJourneyScrollDelta(scrollDelta)
      if (hitGate) {
        // Rest of this stroke would keep scrolling through the new chapter and
        // eat the 20-mile mobile overlay window before the card can lock.
        velocityRef.current.reset()
        lastYRef.current = null
        consumeStrokeRef.current = true
        cancelInertia()
      } else {
        velocityRef.current.add(scrollDelta, now)
        lastYRef.current = y
      }
      noteTrailTouchMove(now)
      e.preventDefault()

      lastTRef.current = now
    }

    const onTouchEnd = (e: TouchEvent) => {
      const releasedAt = performance.now()
      const msSinceMove = releasedAt - lastTRef.current
      let v = clampGlideVelocity(velocityRef.current.velocity(releasedAt))
      velocityRef.current.reset()
      const startY = lastYRef.current
      lastYRef.current = null
      noteTrailTouchEnd()
      clearNativeTextSelection()

      // preventDefault on touchstart suppresses the synthesized click that
      // audio pins listen for — replay a tap that did not move.
      if (preventedCalloutRef.current && e.changedTouches[0] && startY != null) {
        const t = e.changedTouches[0]
        const dx = t.clientX - lastXRef.current
        const dy = t.clientY - startY
        if (dx * dx + dy * dy < 100 && msSinceMove < 450) {
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

      if (!shouldCoastAfterRelease(v, msSinceMove)) return

      // Time-based glide: each frame moves by the speed over the elapsed time,
      // then friction decays the speed by that same time.
      let lastFrame = releasedAt
      const step = (now: number) => {
        if (isLocked() || isTrailCameraSettling()) {
          cancelInertia()
          return
        }
        const dt = Math.min(64, Math.max(0, now - lastFrame))
        lastFrame = now
        const distance = v * dt
        v = stepGlideVelocity(v, dt)
        if (applyJourneyScrollDelta(distance)) {
          cancelInertia()
          return
        }
        if (v === 0) {
          inertiaRafRef.current = 0
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
