"use client"

import { useLayoutEffect, useRef, useState } from "react"

export const slidePanelClass =
  "h-0 overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"

export function slideContentClass(open: boolean) {
  return `transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
    open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
  }`
}

export function useSlidePanel(defaultOpen = false) {
  const [open, setOpen] = useState(defaultOpen)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!defaultOpen || !panelRef.current) return
    panelRef.current.style.height = "auto"
  }, [defaultOpen])

  const onEndRef = useRef<((event: TransitionEvent) => void) | null>(null)

  const clearEnd = () => {
    const panel = panelRef.current
    if (panel && onEndRef.current) panel.removeEventListener("transitionend", onEndRef.current)
    onEndRef.current = null
  }

  const toggle = () => {
    const panel = panelRef.current
    if (!panel) return
    clearEnd()

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      const next = !open
      setOpen(next)
      panel.style.height = next ? "auto" : "0px"
      return
    }

    if (!open) {
      setOpen(true)
      const target = panel.scrollHeight
      panel.style.height = `${target}px`
      const onEnd = (event: TransitionEvent) => {
        if (event.propertyName !== "height") return
        panel.style.height = "auto"
        clearEnd()
      }
      onEndRef.current = onEnd
      panel.addEventListener("transitionend", onEnd)
      return
    }

    setOpen(false)
    panel.style.height = `${panel.scrollHeight}px`
    panel.getBoundingClientRect()
    panel.style.height = "0px"
  }

  return { open, toggle, panelRef }
}
