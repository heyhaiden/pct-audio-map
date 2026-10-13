"use client"

import { useLayoutEffect, type ReactNode } from "react"
import { SiteHeader, type SiteNavPage } from "@/components/navigation/site-header"
import { useViewportLayout } from "@/hooks/use-viewport-layout"
import {
  exitDocumentFullscreen,
  resetWindowScroll,
  unlockDocumentScroll,
} from "@/lib/map-session"

const SITE_PATTERN =
  `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q25 30 50 50 T100 50' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 60 Q25 40 50 60 T100 60' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 70 Q25 50 50 70 T100 70' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3C/svg%3E")`

/**
 * Shell for About / Library / Resources.
 *
 * Header stays pinned on phones and scrolls with the page on desktop. Only page
 * content fades on entry. Clears map scroll locks
 * and forces scrollTop=0 so a mid-trail map exit can't leave the page frozen.
 */
export function SitePage({
  current,
  children,
}: {
  current: Exclude<SiteNavPage, "map">
  children: ReactNode
}) {
  useViewportLayout()

  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add("site-page")

    unlockDocumentScroll()
    exitDocumentFullscreen()

    const hash = window.location.hash.slice(1)
    if (hash) {
      // Allow layout to settle, then honor in-page anchors (e.g. #get-in-touch).
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView()
      })
    } else {
      resetWindowScroll()
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      unlockDocumentScroll()
      resetWindowScroll()
    }
    window.addEventListener("pageshow", onPageShow)

    return () => {
      html.classList.remove("site-page")
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [])

  return (
    <div className="site-page-root min-h-screen bg-[#151310]">
      {/* Must stay outside any transformed ancestor, or `fixed` becomes page-sized
          and can swallow wheel/touch scroll. Never receive pointer events. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: SITE_PATTERN,
          backgroundSize: "200px 200px",
        }}
      />
      <div className="relative z-10">
        <SiteHeader current={current} pinned />
        {children}
      </div>
    </div>
  )
}
