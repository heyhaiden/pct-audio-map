"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"

// Display is time-based, not mile-based: a card fires once and runs its own
// clock, so scroll direction/speed/density can never re-trigger or distort it.
const FADE_IN_MS = 400
const HOLD_MS = 7000
const FADE_OUT_MS = 1800
const TICK_MS = 100
/** Journey-start bootstrap shows chapter 0 while still near the trailhead. */
const TRAILHEAD_MILES = 50

export type ChapterIntroState = {
  index: number
  opacity: number
}

/**
 * Cards announce forward progress only. Northbound crossing of a chapter start
 * fires that chapter (highest boundary wins on multi-chapter jumps); reverse
 * scroll never fires anything. Chapter 0 is handled by the journey-start
 * bootstrap since a start-of-0 boundary can never be crossed.
 */
export function resolveIntroTransition(prev: number, current: number): number | null {
  if (current <= prev) return null
  for (let i = CHAPTER_MILE_RANGES.length - 1; i >= 0; i--) {
    if (prev < CHAPTER_MILE_RANGES[i].start && current >= CHAPTER_MILE_RANGES[i].start) {
      return i
    }
  }
  return null
}

export function useChapterIntro(currentMiles: number, enabled: boolean) {
  const prevMilesRef = useRef<number | null>(null)
  const [active, setActive] = useState<{ index: number; startedAt: number } | null>(null)
  const [opacity, setOpacity] = useState(0)

  const triggerIntro = useCallback((index: number) => {
    if (!CHAPTER_MILE_RANGES[index]) return
    setActive({ index, startedAt: performance.now() })
  }, [])

  // Mile-based triggers: journey start + northbound chapter crossings
  useEffect(() => {
    if (!enabled) {
      prevMilesRef.current = null
      setActive(null)
      return
    }

    const prev = prevMilesRef.current
    prevMilesRef.current = currentMiles

    if (prev === null) {
      if (currentMiles < TRAILHEAD_MILES) {
        triggerIntro(0)
      }
      return
    }

    const crossed = resolveIntroTransition(prev, currentMiles)
    if (crossed !== null) {
      triggerIntro(crossed)
    }
  }, [currentMiles, enabled, triggerIntro])

  // Time-based display: ease in, hold, fade out, clear. The card components'
  // own CSS transitions smooth between ticks.
  useEffect(() => {
    if (!active) {
      setOpacity(0)
      return
    }

    const tick = () => {
      const elapsed = performance.now() - active.startedAt
      if (elapsed < FADE_IN_MS) {
        // Show immediately at the crossing rather than starting from 0
        setOpacity(Math.max(0.35, elapsed / FADE_IN_MS))
        return
      }
      if (elapsed < FADE_IN_MS + HOLD_MS) {
        setOpacity(1)
        return
      }
      const fade = (elapsed - FADE_IN_MS - HOLD_MS) / FADE_OUT_MS
      if (fade >= 1) {
        setActive(null)
        return
      }
      setOpacity(1 - fade)
    }

    tick()
    const id = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(id)
  }, [active])

  const state: ChapterIntroState | null =
    active && opacity > 0.01 ? { index: active.index, opacity } : null

  return { intro: state, triggerIntro }
}
