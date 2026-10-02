"use client"

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { X } from "lucide-react"

interface OverlayShellProps {
  isVisible: boolean
  /** Backdrop click and Escape clear the overlay. Omit for a persistent overlay. */
  onDismiss?: () => void
  /** Icon medallion above the kicker. */
  icon?: ReactNode
  /** Mono kicker above the title. */
  kicker?: ReactNode
  title?: ReactNode
  /** Body copy under the title. */
  children?: ReactNode
  /** Action rows under the body — use `pct-link-row` items. */
  actions?: ReactNode
  /**
   * Corner control. `undefined` draws the default close when `onDismiss` is set.
   * Pass `null` to hide it (hamburger keeps its own trigger). Pass a node to replace it.
   */
  closeControl?: ReactNode | null
  /** Extra classes on the fullscreen surface (z-index, etc.). */
  className?: string
  /** Hold before the card fades in so map overlays don't fight the camera. */
  appearDelayMs?: number
  /** Accessible name when there is no visible title. */
  ariaLabel?: string
}

const DEFAULT_APPEAR_DELAY_MS = 500

const closeButtonClass =
  "pct-glass-control absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full text-[#ada396] transition hover:text-[#ed5a43] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] md:right-[22px] md:top-5"

/** Glass medallion used above overlay titles. */
export function OverlayIcon({ children }: { children: ReactNode }) {
  return (
    <div className="pct-overlay-icon pct-glass-control flex h-20 w-20 items-center justify-center rounded-full">
      {children}
    </div>
  )
}

/** Label on the left, optional icon where the arrow used to sit. */
export function OverlayActionLabel({
  icon,
  children,
}: {
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      {children}
      {icon ? (
        <span className="grid h-4 w-4 shrink-0 place-items-center text-[#8b8271]">{icon}</span>
      ) : null}
    </>
  )
}

/**
 * Shared fullscreen overlay. Trail Continues is the blueprint: a larger centered
 * card, kicker, title, one block of body copy, and `pct-link-row` actions.
 */
export function OverlayShell({
  isVisible,
  onDismiss,
  icon,
  kicker,
  title,
  children,
  actions,
  closeControl,
  className = "",
  appearDelayMs = DEFAULT_APPEAR_DELAY_MS,
  ariaLabel,
}: OverlayShellProps) {
  const titleId = useId()
  const [showContent, setShowContent] = useState(false)
  const openedAtRef = useRef(0)

  useLayoutEffect(() => {
    if (!isVisible) {
      setShowContent(false)
      return
    }

    // The opening click's mouseup can land on this freshly mounted backdrop
    // and dismiss in the same gesture. Ignore dismiss until that click is done.
    openedAtRef.current = Date.now()

    if (appearDelayMs <= 0) {
      setShowContent(true)
      return
    }

    setShowContent(false)
    const timer = window.setTimeout(() => setShowContent(true), appearDelayMs)
    return () => window.clearTimeout(timer)
  }, [isVisible, appearDelayMs])

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

  const dismissFromBackdrop = () => {
    if (!onDismiss) return
    if (Date.now() - openedAtRef.current < 400) return
    onDismiss()
  }

  const close =
    closeControl !== undefined
      ? closeControl
      : onDismiss
        ? (
            <button
              type="button"
              onClick={onDismiss}
              className={closeButtonClass}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )
        : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
      data-overlay-scroll
      className={`pct-glass-terminal fixed inset-0 z-[60] overflow-y-auto transition-opacity ${
        appearDelayMs <= 0 ? "duration-500" : "duration-1000"
      } ${
        showContent ? "opacity-100" : "opacity-0"
      } ${className}`}
      onClick={dismissFromBackdrop}
    >
      {close}

      <div className="pct-overlay-shell-frame flex min-h-full items-center justify-center px-8 py-12 md:px-12 md:py-16">
        <div
          onClick={(event) => event.stopPropagation()}
          className={`pct-overlay-shell-card flex w-full max-w-[22rem] flex-col items-center text-center transition-all md:max-w-[28rem] ${
            appearDelayMs <= 0 ? "duration-500" : "duration-1000"
          } ${
            showContent ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
          }`}
        >
          {icon ? <div className="pct-overlay-icon-wrap mb-8">{icon}</div> : null}

          {kicker ? (
            <p className="pct-overlay-kicker mb-5 font-mono text-label uppercase tracking-[0.24em] text-[#8b8271]">
              {kicker}
            </p>
          ) : null}

          {title ? (
            <h1
              id={titleId}
              className="pct-overlay-title pct-display text-[36px] font-normal leading-[1.15] text-[#f6f1e4] md:text-[48px]"
            >
              {title}
            </h1>
          ) : null}

          {children}

          {actions ? (
            <div
              className={`pct-overlay-actions w-full text-left ${
                icon || kicker || title || children ? "mt-10" : ""
              }`}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
