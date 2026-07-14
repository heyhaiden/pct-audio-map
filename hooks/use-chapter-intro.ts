"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"

/** Miles to ease in after a chapter boundary is crossed. */
const FADE_IN_MILES = 4
/** How long the card stays fully visible (was ~8 — too short). */
const VISIBLE_MILES = 32
/** Miles to ease out. */
const FADE_OUT_MILES = 12

const TOTAL_WINDOW = FADE_IN_MILES + VISIBLE_MILES + FADE_OUT_MILES

export type ChapterIntroState = {
  /** Locked chapter index — does not change mid-fade when mile-range chapter flips. */
  index: number
  /** Mile marker where this intro was triggered. */
  originMiles: number
  opacity: number
}

function opacityFromDistance(distance: number): number {
  if (distance < 0) return 0
  if (distance < FADE_IN_MILES) {
    // At the exact crossing, show immediately rather than starting at 0
    return Math.max(0.35, distance / FADE_IN_MILES)
  }
  if (distance < FADE_IN_MILES + VISIBLE_MILES) return 1
  if (distance < TOTAL_WINDOW) {
    return Math.max(0, 1 - (distance - FADE_IN_MILES - VISIBLE_MILES) / FADE_OUT_MILES)
  }
  return 0
}

function isIntroStillActive(
  intro: { index: number; originMiles: number } | null,
  currentMiles: number,
): boolean {
  if (!intro) return false
  return Math.abs(currentMiles - intro.originMiles) < TOTAL_WINDOW
}

/**
 * Drives chapter intro cards for forward and reverse scroll.
 * Locks displayed chapter to the boundary that was crossed so reverse scroll
 * cannot swap in the previous chapter's content while the card is still fading.
 */
export function useChapterIntro(currentMiles: number, enabled: boolean) {
  const prevMilesRef = useRef<number | null>(null)
  const introRef = useRef<{ index: number; originMiles: number } | null>(null)
  const [intro, setIntro] = useState<{ index: number; originMiles: number } | null>(null)

  const updateIntro = useCallback((next: { index: number; originMiles: number } | null) => {
    introRef.current = next
    setIntro(next)
  }, [])

  const triggerIntro = useCallback(
    (index: number, originMiles?: number) => {
      const range = CHAPTER_MILE_RANGES[index]
      if (!range) return
      updateIntro({
        index,
        originMiles: originMiles ?? range.start,
      })
    },
    [updateIntro],
  )

  useEffect(() => {
    if (!enabled) {
      prevMilesRef.current = currentMiles
      return
    }

    const prev = prevMilesRef.current

    // First enabled sample — show chapter 0 near the trailhead
    if (prev === null) {
      prevMilesRef.current = currentMiles
      if (currentMiles < TOTAL_WINDOW) {
        updateIntro({ index: 0, originMiles: 0 })
      }
      return
    }

    prevMilesRef.current = currentMiles
    if (prev === currentMiles) return

    const goingForward = currentMiles > prev
    const active = introRef.current

    for (let i = 0; i < CHAPTER_MILE_RANGES.length; i++) {
      const { start, end } = CHAPTER_MILE_RANGES[i]

      if (goingForward) {
        // Entered this chapter at its start
        if (prev < start && currentMiles >= start) {
          updateIntro({ index: i, originMiles: start })
          return
        }
        continue
      }

      // —— Reverse scroll ——

      // Re-entered this chapter from the next one (across end boundary)
      if (prev >= end && currentMiles < end) {
        updateIntro({ index: i, originMiles: end })
        return
      }

      // Re-entered this chapter's start intro window from deeper in the chapter
      const windowEnd = start + TOTAL_WINDOW
      if (currentMiles >= start && currentMiles < windowEnd && prev >= windowEnd) {
        updateIntro({ index: i, originMiles: start })
        return
      }

      // Crossed this chapter's start going south → entered previous chapter.
      // If any card is still on screen, keep it locked so we don't flash the
      // previous chapter's content mid-fade (the reverse-scroll bug).
      if (i > 0 && prev >= start && currentMiles < start) {
        if (isIntroStillActive(active, currentMiles)) {
          return
        }
        updateIntro({ index: i - 1, originMiles: start })
        return
      }
    }
  }, [currentMiles, enabled, updateIntro])

  const distance = intro ? Math.abs(currentMiles - intro.originMiles) : Number.POSITIVE_INFINITY
  const opacity = intro ? opacityFromDistance(distance) : 0

  // Clear stale intro once fully faded so a later re-entry can re-trigger
  useEffect(() => {
    if (!intro) return
    if (opacity <= 0 && distance >= TOTAL_WINDOW) {
      updateIntro(null)
    }
  }, [intro, opacity, distance, updateIntro])

  const state: ChapterIntroState | null =
    intro && opacity > 0.01
      ? { index: intro.index, originMiles: intro.originMiles, opacity }
      : null

  return { intro: state, triggerIntro }
}
