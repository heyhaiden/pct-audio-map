/**
 * Social apps open links in their own webview. Facebook's iOS webview in
 * particular can refuse to start the audio device at all, so the only real fix
 * is getting the visitor into the system browser.
 */

export type InAppBrowser = {
  /** Display name of the host app, e.g. "Instagram". */
  app: string
  platform: "ios" | "android" | "other"
}

const IN_APP_PATTERNS: Array<[RegExp, string]> = [
  [/Instagram/i, "Instagram"],
  [/FBAN\/Messenger|MessengerForiOS|MessengerLite/i, "Messenger"],
  [/Barcelona/i, "Threads"],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/LinkedInApp/i, "LinkedIn"],
  [/musical_ly|BytedanceWebview|TikTok/i, "TikTok"],
  [/Snapchat/i, "Snapchat"],
]

export function detectInAppBrowser(userAgent?: string): InAppBrowser | null {
  const ua = userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent)
  if (!ua) return null
  const match = IN_APP_PATTERNS.find(([pattern]) => pattern.test(ua))
  if (!match) return null
  const platform = /iPhone|iPad|iPod/i.test(ua)
    ? "ios"
    : /Android/i.test(ua)
      ? "android"
      : "other"
  return { app: match[1], platform }
}

/** Label for the system browser the escape link targets. */
export function systemBrowserName(platform: InAppBrowser["platform"]): string {
  if (platform === "ios") return "Safari"
  if (platform === "android") return "Chrome"
  return "your browser"
}

/**
 * URL that asks the OS to hand this page to the system browser, or null when
 * there's no scheme for it (the caller falls back to copy-link instructions).
 * - iOS 17+: x-safari-https:// opens Safari directly. Older iOS ignores it.
 * - Android: an intent:// URL with no package opens the default browser.
 */
export function systemBrowserUrl(
  href: string,
  platform: InAppBrowser["platform"],
): string | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (url.protocol !== "https:") return null
  const rest = `${url.host}${url.pathname}${url.search}${url.hash}`
  if (platform === "ios") return `x-safari-https://${rest}`
  if (platform === "android") {
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;end`
  }
  return null
}
