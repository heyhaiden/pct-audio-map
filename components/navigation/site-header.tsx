"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export type SitePage = "map" | "home" | "library" | "about"

const NAV_LINKS: { id: SitePage; href: string; label: string }[] = [
  { id: "home", href: "/", label: "Home" },
  { id: "library", href: "/library", label: "Library" },
  { id: "about", href: "/about", label: "About" },
]

interface SiteHeaderProps {
  /** Page currently viewing — that nav item is marked current. */
  current: Exclude<SitePage, "map">
}

/**
 * Shared sticky header for secondary pages (library, about).
 * Left: back to the map experience. Right: Home / Library / About.
 */
export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 bg-stone-950/80 backdrop-blur-md border-b border-stone-800/50 z-50">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Map</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
          {NAV_LINKS.map((link) => {
            const isCurrent = link.id === current
            if (isCurrent) {
              return (
                <span
                  key={link.id}
                  aria-current="page"
                  className="px-2.5 py-1 text-sm text-white"
                >
                  {link.label}
                </span>
              )
            }
            return (
              <Link
                key={link.id}
                href={link.href}
                className="px-2.5 py-1 text-sm text-stone-400 hover:text-white transition-colors"
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
