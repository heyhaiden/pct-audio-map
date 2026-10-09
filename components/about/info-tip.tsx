"use client"

import { useEffect, useId, useRef, useState } from "react"

export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const tooltipId = useId()

  const show = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const hide = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 160)
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => {
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
          setOpen((current) => !current)
        }}
        className="-mt-3 inline-flex size-[15px] shrink-0 items-center justify-center rounded-full border border-[#ede8dc]/30 font-mono text-[10px] leading-none text-[#d4cbb8] transition-colors hover:border-[#ede8dc]/55 hover:text-[#f6f1e4] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43]"
      >
        <span className="sr-only">About Our Why's</span>
        i
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!open}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`absolute left-11 top-full z-20 mt-1 w-[min(32rem,calc(100%-2.75rem))] rounded-md border border-[#ede8dc]/15 bg-[#171510] px-4 py-3 text-left shadow-[0_14px_38px_rgba(0,0,0,0.55)] transition-opacity ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <span className="pct-display block text-copy font-light leading-[1.65] text-[#cfc6b4]">{text}</span>
      </span>
    </>
  )
}
