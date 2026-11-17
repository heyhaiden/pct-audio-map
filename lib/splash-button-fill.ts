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

/**
 * Between real milestones the bar used to sit still: it reached 18% when the
 * map object was created, then waited for Mapbox's "load" event (lab, Fast 4G
 * desktop: about 14.8 s), then ran 25% to 100% in about 1.5 s. Visitors read
 * the long pause as stuck.
 *
 * The bar now shows the larger of real progress and this time-based creep.
 * The creep slows as it climbs and never passes the ceiling, so only a ready
 * map fills the bar. About 60% at 10 s and 73% at 15 s.
 */
export const SPLASH_CREEP_TAU_MS = 9000
export const SPLASH_CREEP_CEILING = 0.9
/** How often the creep advances the bar while the map is still loading. */
export const SPLASH_CREEP_TICK_MS = 250

export function splashCreepProgress(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0
  return SPLASH_CREEP_CEILING * (1 - Math.exp(-elapsedMs / SPLASH_CREEP_TAU_MS))
}
