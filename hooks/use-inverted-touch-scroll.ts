"use client"

import { useEffect, useRef } from "react"
import { applyJourneyScrollDelta } from "@/lib/chapter-scroll-gate"
import {
  applyTouchDelta,
  clearNativeTextSelection,
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
  const lastXRef = useRef(0)
  const velocityRef = useRef(0)
  const inertiaRafRef = useRef(0)
  const preventedCalloutRef = useRef(false)
  const consumeStrokeRef = useRef(false)

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
      consumeStrokeRef.current = false
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
        velocityRef.current = 0
        e.preventDefault()
        return
      }

      if (consumeStrokeRef.current) {
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
      const msSinceMove = performance.now() - lastTRef.current
      let v = velocityRef.current
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
