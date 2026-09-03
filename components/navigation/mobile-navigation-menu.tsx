"use client"

import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import {
  exitDocumentFullscreen,
  goHomeToSplash,
  markNavigatedFromMap,
} from "@/lib/map-session"
import {
  MOBILE_NAV_ITEMS,
  type MobileNavigationPage,
  type MobileNavigationSource,
} from "@/lib/mobile-navigation"

interface MobileNavigationMenuProps {
  source: MobileNavigationSource
  current?: MobileNavigationPage
  triggerClassName?: string
}

const defaultControlClass =
  "pct-glass-control grid h-11 w-11 place-items-center rounded-full transition hover:border-[#ed5a43]/45 hover:text-[#ed5a43] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43]"

const menuLinkClass =
  "pct-display flex items-center justify-between border-b border-[#ed5a43]/15 py-[13px] text-[27px] text-[#f0eadc] transition hover:text-[#ed5a43] focus-visible:outline-none focus-visible:text-[#ed5a43]"

export function MobileNavigationMenu({
  source,
  current,
  triggerClassName = defaultControlClass,
}: MobileNavigationMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [triggerBox, setTriggerBox] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const controlRef = useRef<HTMLButtonElement>(null)
  const [liftControl, setLiftControl] = useState(false)

  useLayoutEffect(() => {
    setHasMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (isOpen) setLiftControl(true)
  }, [isOpen])

  useEffect(() => {
    if (isOpen || !liftControl) return
    const release = window.setTimeout(() => setLiftControl(false), 500)
    return () => window.clearTimeout(release)
  }, [isOpen, liftControl])

  useLayoutEffect(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const syncBox = () => {
      const rect = trigger.getBoundingClientRect()
      setTriggerBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    }

    syncBox()
    const observer = new ResizeObserver(syncBox)
    observer.observe(trigger)
    window.addEventListener("resize", syncBox)
    window.addEventListener("scroll", syncBox, true)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncBox)
      window.removeEventListener("scroll", syncBox, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = "hidden"

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setIsOpen(false)
        controlRef.current?.focus()
        return
      }
      if (event.key !== "Tab") return

      const menu = document.getElementById(menuId)
      const focusable = [controlRef.current, ...Array.from(
        menu?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )].filter((element): element is HTMLElement =>
        !!element && element.getClientRects().length > 0,
      )
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

    window.addEventListener("keydown", handleKeydown)
    return () => {
      // Cleared, not restored: a snapshot taken while another lock was active
      // would re-apply "hidden" after that lock had released, freezing touch
      // scrolling. The splash lock is CSS-class based and survives this.
      document.body.style.removeProperty("overflow")
      window.removeEventListener("keydown", handleKeydown)
    }
  }, [isOpen, menuId])

  const handleNavigation = (
    page: MobileNavigationPage,
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    exitDocumentFullscreen()

    if (page === "home") {
      goHomeToSplash()
      if (source === "map") {
        event.preventDefault()
        window.location.reload()
      }
    } else if (source === "map") {
      markNavigatedFromMap()
    }

    setIsOpen(false)
  }

  const showLiftedControl = liftControl && triggerBox !== null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-hidden={showLiftedControl}
        tabIndex={showLiftedControl ? -1 : undefined}
        className={`${triggerClassName} ${showLiftedControl ? "invisible" : ""}`}
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {hasMounted
        ? createPortal(
            <>
              <div
                aria-hidden={!isOpen}
                inert={!isOpen}
                className={`pct-glass-terminal fixed inset-0 z-[110] transition-opacity duration-500 ${
                  isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <aside
                  role="dialog"
                  aria-modal="true"
                  id={menuId}
                  aria-label="Site menu"
                  className={`flex h-full w-full flex-col items-center overflow-y-auto px-[30px] py-[34px] transition-transform duration-500 ${
                    isOpen ? "translate-y-0" : "translate-y-2"
                  }`}
                >
                  <div className="my-auto w-full max-w-sm py-10">
                    <p className="mb-5 font-mono text-micro uppercase tracking-[0.24em] text-[#8b8271]">
                      Offbeat: Soundscapes of the PCT
                    </p>

                    {/* Map always lists Home as 01. On site pages, Home drops
                        off only while you're already on the splash. */}
                    <nav aria-label="Mobile site navigation">
                      {MOBILE_NAV_ITEMS.map((item, index) => ({ item, index }))
                        .filter(
                          ({ item }) =>
                            source === "map" ||
                            !(item.id === "home" && current === "home"),
                        )
                        .map(({ item, index }) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={(event) => handleNavigation(item.id, event)}
                            aria-current={current === item.id ? "page" : undefined}
                            className={`${menuLinkClass} ${
                              current === item.id ? "text-[#ed5a43]" : ""
                            }`}
                          >
                            <span>{item.label}</span>
                            <span className="font-mono text-micro tracking-[0.16em] text-[#8b8271]">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </Link>
                        ))}
                    </nav>
                  </div>
                </aside>
              </div>
              {showLiftedControl ? (
                <button
                  ref={controlRef}
                  type="button"
                  onClick={() => setIsOpen((open) => !open)}
                  aria-label={isOpen ? "Close menu" : "Open menu"}
                  aria-expanded={isOpen}
                  aria-controls={menuId}
                  className={`${triggerClassName} fixed z-[120]`}
                  style={triggerBox}
                >
                  {isOpen ? (
                    <X className="h-[18px] w-[18px]" />
                  ) : (
                    <Menu className="h-[18px] w-[18px]" />
                  )}
                </button>
              ) : null}
            </>,
            document.body,
          )
        : null}
    </>
  )
}
