"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Copy, ExternalLink, Volume2, X } from "lucide-react"
import posthog from "posthog-js"
import {
  detectInAppBrowser,
  systemBrowserName,
  systemBrowserUrl,
  type InAppBrowser,
} from "@/lib/in-app-browser"

/** If we're still on the page this long after the escape link, it didn't take. */
const ESCAPE_FALLBACK_MS = 900

interface SoundBlockedPromptProps {
  isVisible: boolean
  /** Retry in the tap. Resolves true once audio is actually running. */
  onRetry: () => Promise<boolean>
  onDismiss: () => void
}

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2.5 rounded-full bg-[#ed5a43] px-7 py-3.5 font-mono text-copy font-medium uppercase tracking-[0.2em] text-white shadow-[0_10px_28px_rgba(0,0,0,0.32)] transition-[transform,background-color] duration-300 ease-out hover:scale-[1.02] hover:bg-[#f06b57] active:scale-95"

const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 px-3 py-2 font-mono text-label uppercase tracking-[0.16em] text-[#ada396] transition-colors duration-200 hover:text-[#f0eadc]"

export function SoundBlockedPrompt({ isVisible, onRetry, onDismiss }: SoundBlockedPromptProps) {
  // Only visible after a tap on the client, so the UA read never runs during SSR.
  const inApp = useMemo<InAppBrowser | null>(
    () => (isVisible ? detectInAppBrowser() : null),
    [isVisible],
  )
  const [showManualSteps, setShowManualSteps] = useState(false)
  const [copied, setCopied] = useState(false)
  const [retryFailed, setRetryFailed] = useState(false)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isVisible) return
    posthog.capture("sound_blocked_prompt_shown", {
      in_app_browser: inApp?.app ?? null,
      platform: inApp?.platform ?? null,
    })
  }, [isVisible, inApp])

  useEffect(
    () => () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
    },
    [],
  )

  const browserName = systemBrowserName(inApp?.platform ?? "other")

  const openInSystemBrowser = () => {
    posthog.capture("sound_blocked_open_in_browser", { in_app_browser: inApp?.app ?? null })
    const target = inApp ? systemBrowserUrl(window.location.href, inApp.platform) : null
    if (!target) {
      setShowManualSteps(true)
      return
    }
    window.location.href = target
    // A successful hand-off backgrounds this webview; if we're still visible,
    // the scheme was ignored (older iOS, locked-down webview).
    fallbackTimer.current = setTimeout(() => {
      if (document.visibilityState === "visible") setShowManualSteps(true)
    }, ESCAPE_FALLBACK_MS)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      // Clipboard can be blocked in webviews too; the steps still work.
      setCopied(false)
    }
  }

  const retry = async () => {
    posthog.capture("sound_blocked_retry", { in_app_browser: inApp?.app ?? null })
    const ok = await onRetry()
    setRetryFailed(!ok)
  }

  if (!isVisible) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="sound-blocked-title"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))]"
    >
      <div className="pct-glass-panel pointer-events-auto relative w-full max-w-[26rem] px-6 pb-5 pt-6 text-center">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Continue without sound"
          className="absolute right-2.5 top-2.5 p-2 text-[#9b8e7a] transition-colors hover:text-[#f0eadc]"
        >
          <X className="h-4 w-4" />
        </button>

        <Volume2 className="mx-auto mb-3 h-6 w-6 text-[#ed5a43]" aria-hidden />
        <h2
          id="sound-blocked-title"
          className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-[#9b8e7a]"
        >
          Sound is off
        </h2>

        {inApp ? (
          <p className="pct-display mb-5 text-pretty text-copy font-light leading-[1.5] text-[#c7beac]">
            {inApp.app}&rsquo;s built-in browser won&rsquo;t play the trail recordings.
            Open this page in {browserName} to hear them.
          </p>
        ) : (
          <p className="pct-display mb-5 text-pretty text-copy font-light leading-[1.5] text-[#c7beac]">
            Your browser blocked the trail recordings. Tap below to turn sound on.
          </p>
        )}

        {inApp ? (
          <button type="button" onClick={openInSystemBrowser} className={PRIMARY_BUTTON}>
            <ExternalLink className="h-4 w-4" aria-hidden />
            Open in {browserName}
          </button>
        ) : (
          <button type="button" onClick={retry} className={PRIMARY_BUTTON}>
            <Volume2 className="h-4 w-4" aria-hidden />
            Turn sound on
          </button>
        )}

        {inApp && showManualSteps && (
          <div className="mt-5 border-t border-[rgba(237,90,67,0.18)] pt-4">
            <p className="mb-3 text-pretty font-mono text-label uppercase leading-[1.6] tracking-[0.12em] text-[#ada396]">
              Tap{" "}
              <span className="text-[#f0eadc]">{inApp.platform === "ios" ? "•••" : "⋮"}</span>{" "}
              then &ldquo;Open in {inApp.platform === "ios" ? "external browser" : "browser"}&rdquo;
            </p>
            <button type="button" onClick={copyLink} className={SECONDARY_BUTTON}>
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? "Link copied" : "Copy link"}
            </button>
          </div>
        )}

        {retryFailed && (
          <p
            role="status"
            className="mt-4 text-pretty font-mono text-label uppercase leading-[1.6] tracking-[0.12em] text-[#ada396]"
          >
            {inApp
              ? `Still blocked here. Open in ${browserName} instead.`
              : "Still blocked. Try opening this page in another browser."}
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-1">
          {inApp && (
            <button type="button" onClick={retry} className={SECONDARY_BUTTON}>
              Try again here
            </button>
          )}
          <button type="button" onClick={onDismiss} className={SECONDARY_BUTTON}>
            Continue without sound
          </button>
        </div>
      </div>
    </div>
  )
}
