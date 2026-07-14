"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Info, Instagram, Twitter, Menu, X, Headphones } from "lucide-react"

interface AboutSocialProps {
  className?: string
}

export function AboutSocial({ className }: AboutSocialProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track scroll velocity to hide menu button while scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true)
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Set timeout to detect when scrolling stops (same as mileage counter)
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 200) // 200ms after last scroll event = stopped
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      {/* Desktop: Hover zone in bottom-left */}
      <div className={`hidden md:block fixed bottom-6 left-6 z-40 ${className}`}>
        <div
          className="relative"
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {/* Trigger button */}
          <button
            className={`w-10 h-10 rounded-full bg-stone-900/80 backdrop-blur-md border border-stone-800/50 flex items-center justify-center transition-all duration-300 hover:bg-stone-800/80 ${
              isExpanded ? "opacity-0 scale-90" : "opacity-100 scale-100"
            }`}
            aria-label="About and social links"
          >
            <Info className="w-4 h-4 text-stone-400" />
          </button>

          {/* Expanded panel */}
          <div
            className={`absolute bottom-0 left-0 bg-stone-900/95 backdrop-blur-md rounded-xl border border-stone-800/50 overflow-hidden transition-all duration-300 ${
              isExpanded
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <div className="p-4 min-w-[200px]">
              <h3 className="text-sm font-semibold text-white mb-3">PCT Soundscapes</h3>
              
              <div className="space-y-2 mb-4">
                <Link
                  href="/about"
                  className="flex items-center gap-2 text-sm text-stone-400 hover:text-white transition-colors"
                >
                  <Info className="w-4 h-4" />
                  About this project
                </Link>
                <Link
                  href="/library"
                  className="flex items-center gap-2 text-sm text-stone-400 hover:text-white transition-colors"
                >
                  <Headphones className="w-4 h-4" />
                  Audio library
                </Link>
              </div>

              <div className="border-t border-stone-800 pt-3">
                <p className="text-xs text-stone-500 mb-2">Follow</p>
                <div className="flex items-center gap-2">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-stone-800/50 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700/50 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-stone-800/50 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700/50 transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Menu button in top-right - fades while scrolling */}
      <div 
        className={`md:hidden fixed top-3 right-3 z-50 transition-opacity duration-300 ${
          isScrolling && !isMobileMenuOpen ? "opacity-20" : "opacity-100"
        }`}
      >
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-9 h-9 rounded-full bg-stone-900/80 backdrop-blur-md border border-stone-800/40 flex items-center justify-center"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? (
            <X className="w-4 h-4 text-white" />
          ) : (
            <Menu className="w-4 h-4 text-stone-400" />
          )}
        </button>
      </div>

      {/* Mobile: Slide-out menu */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-72 bg-stone-950 border-l border-stone-800 transform transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-6 pt-20">
            <h2 className="text-xl font-semibold text-white mb-2">PCT Soundscapes</h2>
            <p className="text-sm text-stone-400 mb-8">
              An immersive audio journey along the Pacific Crest Trail.
            </p>

            <nav className="space-y-4">
              <Link
                href="/about"
                className="flex items-center justify-between text-stone-300 hover:text-white transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>About</span>
                <Info className="w-4 h-4" />
              </Link>
              <Link
                href="/library"
                className="flex items-center justify-between text-stone-300 hover:text-white transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>Audio library</span>
                <Headphones className="w-4 h-4" />
              </Link>
            </nav>

            <div className="border-t border-stone-800 mt-8 pt-6">
              <p className="text-xs text-stone-500 mb-4">Follow the journey</p>
              <div className="flex items-center gap-3">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
