"use client"

import { useMemo } from "react"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"

/**
 * The chapter intro card is tied to scroll *position*, not a timer. The hook
 * just reports the current chapter and how far (in miles) you are into it;
 * callers turn that into an opacity with their own fade window, so mobile can
 * fade much faster than desktop (mobile covers the map, desktop sits off to the
 * side). Nothing is time-based, so scroll speed/direction can't distort it.
 */
export type ChapterIntroState = {
  index: number
  milesIn: number
}

function chapterIndexForMiles(miles: number): number {
  for (let i = 0; i < CHAPTER_MILE_RANGES.length; i++) {
    const r = CHAPTER_MILE_RANGES[i]
    if (miles >= r.start && miles < r.end) return i
  }
  return CHAPTER_MILE_RANGES.length - 1
}

/** Opacity from distance-into-chapter: full for `hold` miles, then fade over `fade`. */
export function introOpacity(milesIn: number, hold: number, fade: number): number {
  if (milesIn <= hold) return 1
  if (milesIn <= hold + fade) return 1 - (milesIn - hold) / fade
  return 0
}

export function useChapterIntro(
  currentMiles: number,
  enabled: boolean,
): ChapterIntroState | null {
  return useMemo<ChapterIntroState | null>(() => {
    if (!enabled) return null
    const index = chapterIndexForMiles(currentMiles)
    const milesIn = currentMiles - CHAPTER_MILE_RANGES[index].start
    return { index, milesIn }
  }, [currentMiles, enabled])
}
