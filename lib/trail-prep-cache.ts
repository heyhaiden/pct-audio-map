const TRAIL_PREP_CACHE_KEY = "pct-trail-prep-ready-v1"

/** True if trailhead tiles were warmed earlier in this tab session. */
export function isTrailPrepCached(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(TRAIL_PREP_CACHE_KEY) === "1"
  } catch {
    return false
  }
}

/** Persist that trailhead prep finished — skips the Enter gate on later home visits. */
export function markTrailPrepCached(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(TRAIL_PREP_CACHE_KEY, "1")
  } catch {
    // Private mode / quota — ignore
  }
}
