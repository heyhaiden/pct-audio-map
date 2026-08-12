"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Instagram,
  Menu,
  Twitter,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"
import {
  exitDocumentFullscreen,
  markNavigatedFromMap,
  setResumeIntent,
} from "@/lib/map-session"

interface AboutSocialProps {
  className?: string
  soundEnabled: boolean
  onSoundToggle: () => void
}

const controlClass =
  "pct-glass-control grid h-11 w-11 place-items-center rounded-full transition hover:border-[#d9cba8]/45 hover:text-[#d9cba8] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d9cba8] md:h-10 md:w-10"

export function AboutSocial({ className, soundEnabled, onSoundToggle }: AboutSocialProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuCloseRef = useRef<HTMLButtonElement>(null)
  const menuWasOpenRef = useRef(false)

  useEffect(() => {
    if (!isMenuOpen) return
    const focusFrame = requestAnimationFrame(() => menuCloseRef.current?.focus())
    const handleMenuKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setIsMenuOpen(false)
        return
      }
      if (event.key !== "Tab") return

      const menu = document.getElementById("journey-menu")
      const focusable = Array.from(
        menu?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [],
      ).filter((element) => element.getClientRects().length > 0)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", handleMenuKeydown)
    return () => {
      cancelAnimationFrame(focusFrame)
      window.removeEventListener("keydown", handleMenuKeydown)
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (isMenuOpen) {
      menuWasOpenRef.current = true
      return
    }
    if (!menuWasOpenRef.current) return
    menuWasOpenRef.current = false
    menuTriggerRef.current?.focus()
  }, [isMenuOpen])

  return (
    <>
      <div
        aria-hidden={isMenuOpen}
        inert={isMenuOpen}
        className={`fixed left-3 top-3 z-50 transition-opacity duration-300 md:left-[22px] md:top-5 ${
          isMenuOpen ? "pointer-events-none opacity-0" : "opacity-100"
        } ${className ?? ""}`}
      >
        <button
          ref={menuTriggerRef}
          type="button"
          onClick={onSoundToggle}
          aria-label={soundEnabled ? "Mute journey audio" : "Unmute journey audio"}
          aria-pressed={!soundEnabled}
          className={controlClass}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      <div
        aria-hidden={isMenuOpen}
        inert={isMenuOpen}
        className={`fixed right-3 top-3 z-50 transition-opacity duration-300 md:right-[22px] md:top-5 ${
          isMenuOpen ? "pointer-events-none opacity-0" : "opacity-100"
        } ${className ?? ""}`}
      >
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
        className={`fixed inset-0 z-[80] bg-[rgba(10,9,7,0.94)] backdrop-blur-[18px] transition-opacity duration-500 ${
          isMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <aside
          role="dialog"
          aria-modal="true"
          id="journey-menu"
          aria-label="Journey menu"
          className={`flex h-full w-full flex-col items-center overflow-y-auto px-[30px] py-[34px] transition-transform duration-500 ${
            isMenuOpen ? "translate-y-0" : "translate-y-2"
          }`}
        >
          <button
            ref={menuCloseRef}
            type="button"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu"
            className={`${controlClass} absolute right-3 top-3 md:right-[22px] md:top-5`}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="my-auto w-full max-w-sm py-10">
            <p className="mb-5 font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#8b8271]">
              PCT Soundscapes
            </p>

            <nav>
              <Link
                href="/"
                onClick={() => {
                  exitDocumentFullscreen()
                  setResumeIntent()
                }}
                className="pct-display flex items-center justify-between border-b border-[#d9cba8]/15 py-[13px] text-[27px] text-[#f0eadc] transition hover:text-[#d9cba8]"
              >
                <span>Map</span>
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#8b8271]">01</span>
              </Link>
              <Link
                href="/about"
                onClick={() => {
                  exitDocumentFullscreen()
                  markNavigatedFromMap()
                }}
                className="pct-display flex items-center justify-between border-b border-[#d9cba8]/15 py-[13px] text-[27px] text-[#f0eadc] transition hover:text-[#d9cba8]"
              >
                <span>About</span>
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#8b8271]">02</span>
              </Link>
              <Link
                href="/resources"
                onClick={() => {
                  exitDocumentFullscreen()
                  markNavigatedFromMap()
                }}
                className="pct-display flex items-center justify-between border-b border-[#d9cba8]/15 py-[13px] text-[27px] text-[#f0eadc] transition hover:text-[#d9cba8]"
              >
                <span>Resources</span>
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#8b8271]">03</span>
              </Link>
              <Link
                href="/about#get-involved"
                onClick={() => {
                  exitDocumentFullscreen()
                  markNavigatedFromMap()
                }}
                className="pct-display flex items-center justify-between border-b border-[#d9cba8]/15 py-[13px] text-[27px] text-[#f0eadc] transition hover:text-[#d9cba8]"
              >
                <span>Get involved</span>
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#8b8271]">04</span>
              </Link>
              <Link
                href="/library"
                onClick={() => {
                  exitDocumentFullscreen()
                  markNavigatedFromMap()
                }}
                className="pct-display flex items-center justify-between border-b border-[#d9cba8]/15 py-[13px] text-[27px] text-[#f0eadc] transition hover:text-[#d9cba8]"
              >
                <span>Audio library</span>
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#8b8271]">05</span>
              </Link>
            </nav>

            <div className="mt-8 pt-5">
              <p className="mb-3 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#6b6455]">
                Follow the journey
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${controlClass} h-10 w-10`}
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${controlClass} h-10 w-10`}
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
