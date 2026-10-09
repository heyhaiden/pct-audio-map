"use client"

import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { BookOpen, Info, Menu, Mountain, Music, X, type LucideIcon } from "lucide-react"
import { OverlayActionLabel, OverlayShell } from "@/components/overlay/overlay-shell"
import {
  exitDocumentFullscreen,
  goHomeToSplash,
  markNavigatedFromMap,
} from "@/lib/map-session"
import {
  visibleMobileNavItems,
  shouldCloseMobileNavOnNavigate,
  type MobileNavigationPage,
  type MobileNavigationSource,
} from "@/lib/mobile-navigation"

interface MobileNavigationMenuProps {
  source: MobileNavigationSource
  current?: MobileNavigationPage
  triggerClassName?: string
}

const defaultControlClass =
  "pct-glass-control relative grid h-11 w-11 place-items-center rounded-full transition hover:border-[#ed5a43]/45 hover:text-[#ed5a43] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43]"

const NAV_ICONS: Record<MobileNavigationPage, LucideIcon> = {
  home: Mountain,
  library: Music,
  about: Info,
  resources: BookOpen,
}

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
      if (event.key !== "Tab") return

      const menu = document.getElementById(menuId)
      const focusable = [
        controlRef.current,
        ...Array.from(
          menu?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        ),
      ].filter((element): element is HTMLElement => !!element && element.getClientRects().length > 0)
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
      document.body.style.removeProperty("overflow")
      window.removeEventListener("keydown", handleKeydown)
    }
  }, [isOpen, menuId])

  const closeMenu = () => {
    setIsOpen(false)
    controlRef.current?.focus()
  }

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

    if (shouldCloseMobileNavOnNavigate(page, current)) {
      setIsOpen(false)
    }
  }

  const showLiftedControl = liftControl && triggerBox !== null
  const items = visibleMobileNavItems(source, current)

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
              <OverlayShell
                isVisible={isOpen}
                onDismiss={closeMenu}
                appearDelayMs={0}
                className="z-[110]"
                closeControl={null}
                ariaLabel="Site menu"
                actions={
                  <nav id={menuId} aria-label="Site">
                    {items.map((item) => {
                      const Icon = NAV_ICONS[item.id]
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={(event) => handleNavigation(item.id, event)}
                          aria-current={current === item.id ? "page" : undefined}
                          className={`pct-link-row ${current === item.id ? "text-[#ed5a43]" : ""}`}
                        >
                          <OverlayActionLabel icon={<Icon className="h-4 w-4" />}>
                            {item.label}
                          </OverlayActionLabel>
                        </Link>
                      )
                    })}
                  </nav>
                }
              />
              {showLiftedControl ? (
                <button
                  ref={controlRef}
                  type="button"
                  data-keep-audio-focus
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
