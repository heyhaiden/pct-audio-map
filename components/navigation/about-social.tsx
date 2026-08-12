"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Headphones,
  HeartHandshake,
  Info,
  Instagram,
  MapPinned,
  Menu,
  Twitter,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"

interface AboutSocialProps {
  className?: string
  soundEnabled: boolean
  onSoundToggle: () => void
}

const controlClass =
  "grid h-11 w-11 place-items-center rounded-full border border-stone-700/60 bg-stone-950/75 text-stone-300 shadow-lg backdrop-blur-md transition hover:border-stone-500 hover:bg-stone-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b9d] md:h-10 md:w-10"

export function AboutSocial({ className, soundEnabled, onSoundToggle }: AboutSocialProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 200)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [isMenuOpen])

  return (
    <>
      <div
        className={`fixed right-3 top-3 z-50 flex items-center gap-2 transition-opacity duration-300 md:right-6 md:top-6 ${
          isScrolling && !isMenuOpen ? "opacity-25" : "opacity-100"
        } ${className ?? ""}`}
      >
        <button
          type="button"
          onClick={onSoundToggle}
          aria-label={soundEnabled ? "Mute journey audio" : "Unmute journey audio"}
          aria-pressed={!soundEnabled}
          className={controlClass}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <Link href="/library" aria-label="Open Audio Library" className={controlClass}>
          <Headphones className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          aria-controls="journey-menu"
          className={controlClass}
        >
          {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <div
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 h-full w-full bg-black/60"
          onClick={() => setIsMenuOpen(false)}
        />

        <aside
          id="journey-menu"
          aria-label="Journey menu"
          className={`absolute right-0 top-0 h-full w-72 border-l border-stone-800 bg-stone-950 shadow-2xl transition-transform duration-300 md:right-6 md:top-20 md:h-auto md:rounded-xl md:border ${
            isMenuOpen ? "translate-x-0 md:translate-y-0" : "translate-x-full md:translate-x-0 md:-translate-y-2"
          }`}
        >
          <div className="p-6 pt-24 md:pt-6">
            <h2 className="text-xl font-semibold text-white">PCT Soundscapes</h2>
            <p className="mb-8 mt-2 text-sm text-stone-400">
              An immersive audio journey along the Pacific Crest Trail.
            </p>

            <nav className="space-y-2">
              <Link
                href="/"
                className="flex items-center justify-between rounded-lg px-2 py-3 text-stone-300 transition hover:bg-stone-900 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>Listen</span>
                <MapPinned className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="flex items-center justify-between rounded-lg px-2 py-3 text-stone-300 transition hover:bg-stone-900 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>About</span>
                <Info className="h-4 w-4" />
              </Link>
              <Link
                href="/about#get-involved"
                className="flex items-center justify-between rounded-lg px-2 py-3 text-stone-300 transition hover:bg-stone-900 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>Get involved</span>
                <HeartHandshake className="h-4 w-4" />
              </Link>
              <Link
                href="/library"
                className="flex items-center justify-between rounded-lg px-2 py-3 text-stone-300 transition hover:bg-stone-900 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>Audio Library</span>
                <Headphones className="h-4 w-4" />
              </Link>
            </nav>

            <div className="mt-8 border-t border-stone-800 pt-6">
              <p className="mb-4 text-xs text-stone-500">Follow the journey</p>
              <div className="flex items-center gap-3">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-full bg-stone-900 text-stone-400 transition hover:text-white"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-full bg-stone-900 text-stone-400 transition hover:text-white"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
