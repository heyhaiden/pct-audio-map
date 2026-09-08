"use client"

import { useEffect, useState, type ReactNode } from "react"

interface OverlayShellProps {
  isVisible: boolean
  /** Backdrop click and Escape clear the overlay. Omit for a persistent overlay. */
  onDismiss?: () => void
  /** Icon medallion above the kicker. */
  icon?: ReactNode
  /** Mono kicker above the title. */
  kicker?: ReactNode
  title: ReactNode
  /** Body copy under the title. */
  children?: ReactNode
  /** Action rows under the body — use `pct-link-row` items. */
  actions?: ReactNode
  /** Mono line pinned below the actions. */
  footnote?: ReactNode
  /** Corner control rendered outside the fading content column. */
  closeControl?: ReactNode
  contentClassName?: string
}

/**
 * The shared full-screen overlay surface. The terminus (end of trail) sets the
 * look; the WIP notice and the site menu inherit it so all three read as one
 * family. Content fades up after a short hold so it doesn't fight the camera.
 */
export function OverlayShell({
  isVisible,
  onDismiss,
  icon,
  kicker,
  title,
  children,
  actions,
  footnote,
  closeControl,
  contentClassName = "",
}: OverlayShellProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setShowContent(false)
      return
    }

    const timer = window.setTimeout(() => setShowContent(true), 500)
    return () => window.clearTimeout(timer)
  }, [isVisible])

  useEffect(() => {
    if (!isVisible || !onDismiss) return

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      onDismiss()
    }

    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [isVisible, onDismiss])

  if (!isVisible) return null

  return (
    <div
      // Marks the one region still allowed to scroll while the page is locked.
      data-overlay-scroll
      className={`pct-glass-terminal fixed inset-0 z-[60] overflow-y-auto transition-opacity duration-1000 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
      onClick={onDismiss}
    >
      {closeControl}

      <div className="flex min-h-full items-center justify-center px-7 py-[34px]">
        <div
          // Clicks inside the card shouldn't count as "click anywhere to clear".
          onClick={(event) => event.stopPropagation()}
          className={`flex w-full max-w-[300px] flex-col items-center text-center transition-all duration-1000 ${
            showContent ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
          } ${contentClassName}`}
        >
          {icon ? <div className="mb-6">{icon}</div> : null}

          {kicker ? (
            <p className="mb-4 font-mono text-micro uppercase tracking-[0.24em] text-[#8b8271]">
              {kicker}
            </p>
          ) : null}

          <h1 className="pct-display text-[29px] font-normal leading-[1.18] text-[#f6f1e4] md:text-[36px]">
            {title}
          </h1>

          {children}

          {actions ? <div className="mt-8 w-full max-w-[240px] text-left">{actions}</div> : null}

          {footnote ? (
            <p className="mt-6 font-mono text-micro uppercase tracking-[0.12em] text-[#6b6455]">
              {footnote}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
