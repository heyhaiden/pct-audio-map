"use client"

import { useLayoutEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  cameFromActiveMap,
  goHomeToSplash,
  setResumeIntent,
} from "@/lib/map-session"

export type SiteNavPage = "map" | "home" | "library" | "about" | "resources"

const NAV_LINKS: { id: SiteNavPage; href: string; label: string }[] = [
  { id: "home", href: "/", label: "Home" },
  { id: "library", href: "/library", label: "Audio library" },
  { id: "about", href: "/about", label: "About" },
  { id: "resources", href: "/resources", label: "Resources" },
]

interface SiteHeaderProps {
  /** Page currently viewing — that nav item is marked current. */
  current: Exclude<SiteNavPage, "map">
}

/**
 * Shared sticky header for secondary pages.
 * Left: Back to Map only when the user left an active journey.
 * Home always returns to the splash screen.
 */
export function SiteHeader({ current }: SiteHeaderProps) {
  const [showBackToMap, setShowBackToMap] = useState(false)

  useLayoutEffect(() => {
    setShowBackToMap(cameFromActiveMap())
  }, [])

  return (
    <header className="pct-glass-panel sticky top-0 z-50 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
        {showBackToMap ? (
          <a
            href="/"
            onClick={() => setResumeIntent()}
            className="inline-flex shrink-0 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#9b8e7a] transition-colors hover:text-[#d9cba8]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Map</span>
          </a>
        ) : (
          <span className="inline-flex w-[7.5rem] shrink-0" aria-hidden />
        )}

        <nav className="flex items-center gap-0.5 sm:gap-2" aria-label="Site">
          {NAV_LINKS.map((link) => {
            const isCurrent = link.id === current
            if (isCurrent) {
              return (
                <span
                  key={link.id}
                  aria-current="page"
                  className="px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#d9cba8]"
                >
                  {link.label}
                </span>
              )
            }

            if (link.id === "home") {
              return (
                <a
                  key={link.id}
                  href="/"
                  onClick={() => goHomeToSplash()}
                  className="px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8b8271] transition-colors hover:text-[#ede8dc]"
                >
                  {link.label}
                </a>
              )
            }

            return (
              <Link
                key={link.id}
                href={link.href}
                className="px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8b8271] transition-colors hover:text-[#ede8dc]"
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
