/** Persist active map position when leaving for site pages; resume via Back to Map. */

const SESSION_KEY = "pct-map-session-v1"
const FROM_MAP_KEY = "pct-from-active-map"
const RESUME_KEY = "pct-map-resume-intent"

export type MapSessionState = {
  scrollRatio: number
  miles: number
  wipDismissed: boolean
}

function canUseStorage(): boolean {
  return typeof window !== "undefined"
}

export function saveMapSession(state: MapSessionState): void {
  if (!canUseStorage()) return
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        scrollRatio: Math.max(0, Math.min(1, state.scrollRatio)),
        miles: Math.max(0, state.miles),
        wipDismissed: !!state.wipDismissed,
      } satisfies MapSessionState),
    )
  } catch {
    /* private mode / quota */
  }
}

export function getMapSession(): MapSessionState | null {
  if (!canUseStorage()) return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MapSessionState>
    if (typeof parsed.scrollRatio !== "number" || typeof parsed.miles !== "number") return null
    return {
      scrollRatio: Math.max(0, Math.min(1, parsed.scrollRatio)),
      miles: Math.max(0, parsed.miles),
      wipDismissed: !!parsed.wipDismissed,
    }
  } catch {
    return null
  }
}

export function clearMapSession(): void {
  if (!canUseStorage()) return
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(FROM_MAP_KEY)
    sessionStorage.removeItem(RESUME_KEY)
  } catch {
    /* ignore */
  }
}

/** Mark that the user left an in-progress map journey for a site page. */
export function markNavigatedFromMap(): void {
  if (!canUseStorage()) return
  try {
    sessionStorage.setItem(FROM_MAP_KEY, "1")
  } catch {
    /* ignore */
  }
}

export function cameFromActiveMap(): boolean {
  if (!canUseStorage()) return false
  try {
    return sessionStorage.getItem(FROM_MAP_KEY) === "1" && getMapSession() !== null
  } catch {
    return false
  }
}

/** Back to Map — resume the saved trail position on next home load. */
export function setResumeIntent(): void {
  if (!canUseStorage()) return
  try {
    sessionStorage.setItem(RESUME_KEY, "1")
  } catch {
    /* ignore */
  }
}

export function consumeResumeIntent(): boolean {
  if (!canUseStorage()) return false
  try {
    const ok = sessionStorage.getItem(RESUME_KEY) === "1" && getMapSession() !== null
    sessionStorage.removeItem(RESUME_KEY)
    return ok
  } catch {
    return false
  }
}

/** Home tab — splash screen, discard resume. */
export function goHomeToSplash(): void {
  clearMapSession()
}

export function unlockDocumentScroll(): void {
  if (!canUseStorage()) return
  document.body.style.removeProperty("overflow")
  document.body.style.removeProperty("touch-action")
  document.documentElement.style.removeProperty("overflow")
  document.documentElement.style.removeProperty("touch-action")
}

export function resetWindowScroll(): void {
  if (!canUseStorage()) return
  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual"
  } catch {
    /* ignore */
  }
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

export function exitDocumentFullscreen(): void {
  if (!canUseStorage()) return
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void
  }
  try {
    if (doc.fullscreenElement) void doc.exitFullscreen?.()
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
  } catch {
    /* ignore */
  }
}
