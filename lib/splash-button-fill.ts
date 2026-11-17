/**
 * Timing for the "Begin Journey" button's fill bar. While the map prepares,
 * the bar chases load progress. Once the map is ready the bar sweeps to full
 * and the button unlocks.
 *
 * The ready sweep used to take 900 ms plus a 160 ms settle, so a listener
 * waited about 1.1 s on a map that was already ready (lab baseline:
 * trailhead ready at 6,310 ms, button tappable at 7,396 ms).
 */

/** Sweep while still loading: quick, it only has to keep up with progress. */
export const SPLASH_FILL_PROGRESS_MS = 320
/** Ready with most of the bar still empty: long enough to read as a sweep. */
export const SPLASH_FILL_READY_FAR_MS = 320
/** Ready with the bar mostly full. */
export const SPLASH_FILL_READY_NEAR_MS = 200
/** Beat between the bar reaching full and the button unlocking. */
export const SPLASH_UNLOCK_SETTLE_MS = 60

export function splashFillDurationMs(options: { ready: boolean; from: number }): number {
  if (!options.ready) return SPLASH_FILL_PROGRESS_MS
  return options.from < 0.7 ? SPLASH_FILL_READY_FAR_MS : SPLASH_FILL_READY_NEAR_MS
}

/** Longest wait between the map being ready and the button unlocking. */
export const SPLASH_MAX_READY_TO_UNLOCK_MS = SPLASH_FILL_READY_FAR_MS + SPLASH_UNLOCK_SETTLE_MS
