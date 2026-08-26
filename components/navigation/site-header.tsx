"use client"

import { useLayoutEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mountain } from "lucide-react"
import { MobileNavigationMenu } from "@/components/navigation/mobile-navigation-menu"
import { cameFromActiveMap, goHomeToSplash, setResumeIntent } from "@/lib/map-session"

export type SiteNavPage = "map" | "home" | "library" | "about" | "resources"

export const NAV_LINKS: { id: SiteNavPage; href: string; label: string }[] = [
  { id: "library", href: "/library", label: "Audio library" },
  { id: "about", href: "/about", label: "About" },
  { id: "resources", href: "/resources", label: "Resources" },
]

const navItemClass =
  "px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors"

interface SiteHeaderProps {
  /** Page currently viewing — that nav item is marked current. */
  current: Exclude<SiteNavPage, "map">
}

/**
 * Shared sticky header for splash and secondary pages.
 * Home sits on the left. Nav sits on the right edge. Back to Map appears
 * beside Home only when the user left an active journey.
 */
export function SiteHeader({ current }: SiteHeaderProps) {
  const [showBackToMap, setShowBackToMap] = useState(false)

  useLayoutEffect(() => {
    setShowBackToMap(cameFromActiveMap())
  }, [])

  return (
    <header className="pct-glass-panel sticky top-0 z-50 rounded-none border-x-0 border-t-0">
      <div className="flex items-center justify-between gap-4 px-[18px] py-4 md:px-[28px]">
        <div className="flex min-w-0 items-center gap-3">
          {current === "home" ? (
            <span
              aria-current="page"
              aria-label="Home"
              className="inline-flex text-[#ed5a43]"
            >
              <Mountain className="h-4 w-4" />
            </span>
          ) : (
            <Link
              href="/"
              onClick={() => goHomeToSplash()}
              aria-label="Back to home"
              className="inline-flex text-[#9b8e7a] transition-colors hover:text-[#ed5a43]"
            >
              <Mountain className="h-4 w-4" />
            </Link>
          )}

          {showBackToMap ? (
            <Link
              href="/"
              onClick={() => setResumeIntent()}
              className="inline-flex shrink-0 items-center gap-2 font-mono text-[12px] uppercase tracking-[0.14em] text-[#9b8e7a] transition-colors hover:text-[#ed5a43]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Map</span>
            </Link>
          ) : null}
        </div>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Site">
          {NAV_LINKS.map((link) => {
            const isCurrent = link.id === current
            if (isCurrent) {
              return (
                <span
                  key={link.id}
                  aria-current="page"
                  className={`${navItemClass} text-[#ed5a43]`}
                >
                  {link.label}
                </span>
              )
            }

            return (
              <Link
                key={link.id}
                href={link.href}
                prefetch={current !== "home"}
                className={`${navItemClass} text-[#8b8271] hover:text-[#ede8dc]`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="md:hidden">
          <MobileNavigationMenu source="site" current={current} />
        </div>
      </div>
    </header>
  )
}
