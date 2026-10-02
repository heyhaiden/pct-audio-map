"use client"

import { useEffect, useLayoutEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mountain } from "lucide-react"
import { MobileNavigationMenu } from "@/components/navigation/mobile-navigation-menu"
import { cameFromActiveMap, goHomeToSplash, setResumeIntent } from "@/lib/map-session"

export type SiteNavPage = "map" | "home" | "library" | "about" | "resources"

export const NAV_LINKS: { id: SiteNavPage; href: string; label: string }[] = [
  // Only rendered once you've left home — see the nav below.
  { id: "home", href: "/", label: "Home" },
  { id: "library", href: "/library", label: "Audio library" },
  { id: "about", href: "/about", label: "About" },
  { id: "resources", href: "/resources", label: "Resources" },
]

const navItemClass =
  "px-2.5 py-1 font-mono text-nav uppercase tracking-[0.12em] transition-colors"

/**
 * Which page last rendered the Home link, or null if it wasn't on screen.
 * Module scope, so it survives client-side route changes within a page load:
 * Home eases in when it first appears (arriving from home), and simply stays
 * put when moving between subpages where it was already visible.
 */
let homeLinkVisibleOn: string | null = null

interface SiteHeaderProps {
  /** Page currently viewing — that nav item is marked current. */
  current: Exclude<SiteNavPage, "map">
  /** Pin the bar on phones so it stays put while the page scrolls. */
  pinned?: boolean
}

/**
 * Shared header for splash and secondary pages.
 * Left slot: the mountain home mark, shown everywhere including the splash. It
 * is replaced by Back to Map only on a secondary page reached from a running
 * journey. Nav on the right always lists every page — the current one is
 * marked, not removed.
 */
export function SiteHeader({ current, pinned = false }: SiteHeaderProps) {
  const [showBackToMap, setShowBackToMap] = useState(false)
  const showHomeLink = current !== "home"
  // Decided once per mount, before first paint, so the class is never applied
  // to an element that already painted at full opacity.
  const [animateHomeLink] = useState(() => showHomeLink && homeLinkVisibleOn === null)

  useLayoutEffect(() => {
    setShowBackToMap(cameFromActiveMap())
  }, [])

  useEffect(() => {
    homeLinkVisibleOn = showHomeLink ? current : null
  }, [showHomeLink, current])

  return (
    <header
      className={
        pinned
          ? "max-md:sticky max-md:top-0 max-md:z-30 max-md:border-b max-md:border-white/[0.06] max-md:bg-[#151310]/92 max-md:backdrop-blur-md"
          : "bg-transparent"
      }
    >
      <div className="pct-site-header-bar flex items-center justify-between gap-4 px-[18px] py-4 max-md:pt-[max(1rem,env(safe-area-inset-top))] md:px-[28px] md:pt-4">
        <div className="flex min-w-0 items-center gap-3">
          {current !== "home" && showBackToMap ? (
            // Arrived here from a running journey — offer the way back instead
            // of the home mark, so the bookmarked trail position isn't lost.
            <Link
              href="/"
              onClick={() => setResumeIntent()}
              className="inline-flex shrink-0 items-center gap-2 font-mono text-nav uppercase tracking-[0.14em] text-[#9b8e7a] transition-colors hover:text-[#ed5a43]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to map</span>
            </Link>
          ) : current === "home" ? (
            // Splash keeps the mountain mark — you're already home.
            <span aria-current="page" aria-label="Home" className="inline-flex text-[#8b8271]">
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
        </div>

        <nav className="pct-site-nav-desktop hidden items-center gap-2 md:flex" aria-label="Site">
          {NAV_LINKS.map((link) => {
            // Home is only offered once you've left it.
            if (link.id === "home" && current === "home") return null

            if (link.id === current) {
              return (
                <span key={link.id} aria-current="page" className={`${navItemClass} text-[#ed5a43]`}>
                  {link.label}
                </span>
              )
            }

            const isHome = link.id === "home"
            return (
              <Link
                key={link.id}
                href={link.href}
                prefetch={current !== "home"}
                onClick={isHome ? () => goHomeToSplash() : undefined}
                className={`${navItemClass} text-[#8b8271] hover:text-[#ede8dc] ${
                  isHome && animateHomeLink ? "pct-nav-in" : ""
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="pct-site-nav-mobile md:hidden">
          <MobileNavigationMenu source="site" current={current} />
        </div>
      </div>
    </header>
  )
}
