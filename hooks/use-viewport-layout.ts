"use client"

import { useLayoutEffect, useState } from "react"
import {
  resolveViewportLayout,
  shouldUseDesktopChapterOverlay,
  type ViewportLayout,
} from "@/lib/chapter-tab-layout"

/**
 * Keeps `data-pct-layout` / `data-pct-chapter-overlay` on <html> in sync with
 * resize and orientation, so landscape phones can share short-desktop CSS
 * without waiting on a flaky height media query.
 */
export function useViewportLayout() {
  const [layout, setLayout] = useState<ViewportLayout>("rail")
  const [useDesktopChapterOverlay, setUseDesktopChapterOverlay] = useState(false)

  useLayoutEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const next = resolveViewportLayout(width, height)
      const desktopOverlay = shouldUseDesktopChapterOverlay(width, height)
      root.dataset.pctLayout = next
      root.dataset.pctChapterOverlay = desktopOverlay ? "desktop" : "mobile"
      setLayout(next)
      setUseDesktopChapterOverlay(desktopOverlay)
    }

    apply()
    window.addEventListener("resize", apply)
    window.addEventListener("orientationchange", apply)
    const orientation = window.screen?.orientation
    orientation?.addEventListener("change", apply)
    return () => {
      window.removeEventListener("resize", apply)
      window.removeEventListener("orientationchange", apply)
      orientation?.removeEventListener("change", apply)
      delete root.dataset.pctLayout
      delete root.dataset.pctChapterOverlay
    }
  }, [])

  return { layout, useDesktopChapterOverlay }
}
