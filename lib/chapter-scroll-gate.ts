import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"
import { pctSegments } from "@/data/pct-segments"
import { PCT_TOTAL_MILES } from "@/lib/railing-camera"

/** Sit this far into the next chapter so overlay milesIn is > 0 after scrollY rounding. */
export const CHAPTER_GATE_LANDING_MILES = 0.5

export function chapterIndexForMiles(miles: number): number {
  const index = CHAPTER_MILE_RANGES.findIndex(
    ({ start, end }) => miles >= start && miles < end,
  )
  return index >= 0 ? index : CHAPTER_MILE_RANGES.length - 1
}

/** Overlay landing for a chapter id (pctSegments / marker.chapter). */
export function overlayLandingMilesForChapter(chapterId: string): number | null {
  const index = pctSegments.findIndex((segment) => segment.id === chapterId)
  if (index < 0) return null
  const start = CHAPTER_MILE_RANGES[index]?.start
  if (start == null) return null
  return start + CHAPTER_GATE_LANDING_MILES
}

/**
 * Northbound inertia can jump tens of miles in a few frames and skip the
 * chapter overlay window. Stop at the next chapter start (plus a hair)
 * and cancel the coast.
 */
export function chapterGateLandingMiles(fromMiles: number): number | null {
  const fromIndex = chapterIndexForMiles(fromMiles)
  const gate = CHAPTER_MILE_RANGES[fromIndex + 1]?.start
  if (gate == null || fromMiles >= gate) return null
  return gate + CHAPTER_GATE_LANDING_MILES
}

/**
 * If a northbound hop would land at or past the next chapter start, stop on
 * the overlay instead of skipping it.
 */
export function nextChapterGateMiles(fromMiles: number, nextMiles: number): number | null {
  const landing = chapterGateLandingMiles(fromMiles)
  if (landing == null || nextMiles < landing - CHAPTER_GATE_LANDING_MILES) return null
  return landing
}

export function clampMilesAtChapterGate(
  fromMiles: number,
  toMiles: number,
): { miles: number; hitGate: boolean } {
  if (!(toMiles > fromMiles)) return { miles: toMiles, hitGate: false }

  const landing = nextChapterGateMiles(fromMiles, toMiles)
  if (landing == null) return { miles: toMiles, hitGate: false }
  return { miles: landing, hitGate: true }
}

/** Miles → document scrollY. Ceil at a gate so integer scrollY cannot undershoot. */
export function scrollTopForMiles(
  miles: number,
  maxScroll: number,
  { atGate = false }: { atGate?: boolean } = {},
): number {
  if (maxScroll <= 0) return 0
  const top = (miles / PCT_TOTAL_MILES) * maxScroll
  const clamped = Math.max(0, Math.min(maxScroll, top))
  if (!atGate) return clamped
  return Math.min(maxScroll, Math.ceil(clamped))
}

/** Apply a document scroll delta, stopping at the next chapter gate. */
export function applyJourneyScrollDelta(deltaY: number): boolean {
  if (typeof window === "undefined") return false

  const max = document.documentElement.scrollHeight - window.innerHeight
  if (max <= 0) {
    window.scrollBy(0, deltaY)
    return false
  }

  const fromMiles = (window.scrollY / max) * PCT_TOTAL_MILES
  const unclampedY = Math.max(0, Math.min(max, window.scrollY + deltaY))
  const toMiles = (unclampedY / max) * PCT_TOTAL_MILES
  const { miles, hitGate } = clampMilesAtChapterGate(fromMiles, toMiles)
  // Bare scrollTo — `{ behavior: "instant" }` is ignored on some WebKit builds.
  window.scrollTo(0, scrollTopForMiles(miles, max, { atGate: hitGate }))
  return hitGate
}
