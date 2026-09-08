import { PCT_TOTAL_MILES } from "./railing-camera.ts"

/** ~5 miles. Scroll restore has landed if we are this close to the saved progress. */
export const RESUME_UNLOCK_PROGRESS_EPS = 0.002

/** Saved journeys are mid-trail; mile 0 is a fresh start, not a resume pose. */
export function isResumeTrailPosition(miles: number | null | undefined): miles is number {
  return typeof miles === "number" && Number.isFinite(miles) && miles > 1
}

export function resumeProgressFromMiles(miles: number, totalMiles = PCT_TOTAL_MILES): number {
  if (!Number.isFinite(miles) || totalMiles <= 0) return 0
  return Math.max(0, Math.min(1, miles / totalMiles))
}

/**
 * Hold the railing camera on the saved mile until window scroll catches up.
 * Child effects enable the camera loop before the parent can restore scroll,
 * and following scrollY=0 would lerp Mexico → Oregon.
 */
export function resolveResumeFrameProgress(options: {
  scrollProgress: number
  resumeProgress: number | null
  locked: boolean
  unlockEpsilon?: number
}): { progress: number; locked: boolean } {
  const {
    scrollProgress,
    resumeProgress,
    locked,
    unlockEpsilon = RESUME_UNLOCK_PROGRESS_EPS,
  } = options
  if (!locked || resumeProgress == null) {
    return { progress: scrollProgress, locked: false }
  }
  if (Math.abs(scrollProgress - resumeProgress) <= unlockEpsilon) {
    return { progress: scrollProgress, locked: false }
  }
  return { progress: resumeProgress, locked: true }
}

/** Index-along-line stand-in until the railing camera path exists. */
export function trailCoordinateAtProgress(
  coordinates: number[][],
  progress: number,
): [number, number] | null {
  if (coordinates.length === 0) return null
  const t = Math.max(0, Math.min(1, progress))
  const index = Math.min(coordinates.length - 1, Math.round(t * (coordinates.length - 1)))
  const coord = coordinates[index]
  if (!coord || coord.length < 2) return null
  return [coord[0], coord[1]]
}
