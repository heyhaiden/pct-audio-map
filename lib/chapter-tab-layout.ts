/** Narrow viewport → mobile rail (scaled + drawer). Keep in sync with
 *  `@media (max-width: …)` in globals.css. */
export const CHAPTER_TABS_MOBILE_MAX_WIDTH = 767

/** Short viewport → bottom dock. Keep in sync with `@media (max-height: …)`
 *  in globals.css. */
export const CHAPTER_TABS_MIN_RAIL_HEIGHT = 640

/** @deprecated Use CHAPTER_TABS_MOBILE_MAX_WIDTH + 1 for the rail width floor. */
export const CHAPTER_TABS_MIN_RAIL_WIDTH = CHAPTER_TABS_MOBILE_MAX_WIDTH + 1

/** Bottom dock when the viewport is too short for a vertical rail. */
export function chapterTabsShouldDock(_width: number, height: number): boolean {
  return height < CHAPTER_TABS_MIN_RAIL_HEIGHT
}

/** Mobile rail: narrow but tall enough to stay vertical — scale + drawer. */
export function chapterTabsIsMobileRail(width: number, height: number): boolean {
  return width <= CHAPTER_TABS_MOBILE_MAX_WIDTH && height >= CHAPTER_TABS_MIN_RAIL_HEIGHT
}
