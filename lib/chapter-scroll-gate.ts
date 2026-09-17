import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"
import { PCT_TOTAL_MILES } from "@/lib/railing-camera"

/** Sit this far into the next chapter so overlay milesIn is > 0 after scrollY rounding. */
export const CHAPTER_GATE_LANDING_MILES = 0.5

export function chapterIndexForMiles(miles: number): number {
  const index = CHAPTER_MILE_RANGES.findIndex(
    ({ start, end }) => miles >= start && miles < end,
  )
  return index >= 0 ? index : CHAPTER_MILE_RANGES.length - 1
}

/**
 * Northbound inertia can jump tens of miles in a few frames and skip the
 * chapter overlay window. Stop at the next chapter start (plus a hair)
 * and cancel the coast.
 */
export function clampMilesAtChapterGate(
  fromMiles: number,
  toMiles: number,
): { miles: number; hitGate: boolean } {
  if (!(toMiles > fromMiles)) return { miles: toMiles, hitGate: false }

  const fromIndex = chapterIndexForMiles(fromMiles)
  const gate = CHAPTER_MILE_RANGES[fromIndex + 1]?.start
  if (gate == null || fromMiles >= gate || toMiles < gate) {
    return { miles: toMiles, hitGate: false }
  }

  return { miles: gate + CHAPTER_GATE_LANDING_MILES, hitGate: true }
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
