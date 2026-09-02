/** Marks the splash overlay so CSS can freeze html+body scrolling. */
export const SPLASH_SCROLL_LOCK_CLASS = "pct-splash-lock"

/**
 * The trail spacer is a ~12,000vh document that maps scrollY to miles.
 * html remains the scroll container even when body overflow is hidden,
 * so this spacer must not exist while splash is up.
 */
export function shouldRenderTrailScrollSpacer(showSplash: boolean) {
  return !showSplash
}
