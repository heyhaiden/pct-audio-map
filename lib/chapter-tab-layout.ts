/** Narrow viewport → mobile rail (scaled + drawer). Keep in sync with
 *  `@media (max-width: …)` in globals.css. */
export const CHAPTER_TABS_MOBILE_MAX_WIDTH = 767

/** Short viewport → bottom dock. Keep in sync with `@media (max-height: …)`
 *  in globals.css. */
export const CHAPTER_TABS_MIN_RAIL_HEIGHT = 640

/** @deprecated Use CHAPTER_TABS_MOBILE_MAX_WIDTH + 1 for the rail width floor. */
export const CHAPTER_TABS_MIN_RAIL_WIDTH = CHAPTER_TABS_MOBILE_MAX_WIDTH + 1

export type ViewportLayout = "rail" | "mobile-rail" | "dock"

/** Bottom dock when the viewport is too short for a vertical rail. */
export function chapterTabsShouldDock(_width: number, height: number): boolean {
  return height < CHAPTER_TABS_MIN_RAIL_HEIGHT
}

/** Phone (or any short wide screen) turned on its side. */
export function isLandscapePhone(width: number, height: number): boolean {
  return width > height && chapterTabsShouldDock(width, height)
}

/** Mobile rail: narrow but tall enough to stay vertical — scale + drawer. */
export function chapterTabsIsMobileRail(width: number, height: number): boolean {
  return width <= CHAPTER_TABS_MOBILE_MAX_WIDTH && height >= CHAPTER_TABS_MIN_RAIL_HEIGHT
}

/** Shared map chrome: portrait phone, landscape/short dock, or tall desktop rail. */
export function resolveViewportLayout(width: number, height: number): ViewportLayout {
  if (chapterTabsShouldDock(width, height)) return "dock"
  if (chapterTabsIsMobileRail(width, height)) return "mobile-rail"
  return "rail"
}

/** Portrait-phone top-down overview only. Landscape uses the desktop crane. */
export function shouldUseMobileIntroCamera(width: number, height: number): boolean {
  return chapterTabsIsMobileRail(width, height)
}

/** Short wide phone (not a short desktop window). Gets its own crane zoom. */
export function shouldUseLandscapeIntroCamera(width: number, height: number): boolean {
  return isLandscapePhone(width, height) && width <= 1100
}

/** Desktop chapter card (click, long hold). Landscape phones use the compact mobile card. */
export function shouldUseDesktopChapterOverlay(width: number, height: number): boolean {
  return !chapterTabsIsMobileRail(width, height) && !shouldUseLandscapeIntroCamera(width, height)
}

export type IntroCameraKind = "portrait" | "landscape" | "desktop"

export function resolveIntroCameraKind(width: number, height: number): IntroCameraKind {
  if (shouldUseMobileIntroCamera(width, height)) return "portrait"
  if (shouldUseLandscapeIntroCamera(width, height)) return "landscape"
  return "desktop"
}

/** Splash is still up: retarget the hidden overview when the phone rotates. */
export function shouldRetargetWaitingOverview(
  introPhase: "waiting" | "overview" | "flying" | "done",
  skipIntro: boolean,
  previousKind: IntroCameraKind,
  nextKind: IntroCameraKind,
): boolean {
  return !skipIntro && introPhase === "waiting" && previousKind !== nextKind
}
