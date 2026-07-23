"use client"

import { useEffect, useRef, useState } from "react"

interface PerfDebugPanelProps {
  map?: any | null
}

/**
 * Toggleable FPS / performance overlay.
 * Hotkey: backtick (`) — also a small corner toggle when hidden.
 */
export function PerfDebugPanel({ map = null }: PerfDebugPanelProps) {
  const [open, setOpen] = useState(false)
  const [fps, setFps] = useState(0)
  const [frameMs, setFrameMs] = useState(0)
  const [mapZoom, setMapZoom] = useState<number | null>(null)
  const [mapPitch, setMapPitch] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const framesRef = useRef<number[]>([])
  const lastTsRef = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === "INPUT" || tag === "TEXTAREA") return
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!open) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
      framesRef.current = []
      return
    }

    const tick = (ts: number) => {
      const last = lastTsRef.current
      lastTsRef.current = ts
      if (last != null) {
        const dt = ts - last
        framesRef.current.push(dt)
        if (framesRef.current.length > 60) framesRef.current.shift()
        const avg = framesRef.current.reduce((a, b) => a + b, 0) / framesRef.current.length
        setFrameMs(Math.round(avg * 10) / 10)
        setFps(avg > 0 ? Math.round(1000 / avg) : 0)
      }

      if (map && !map._removed) {
        try {
          setMapZoom(Math.round(map.getZoom() * 100) / 100)
          setMapPitch(Math.round(map.getPitch()))
        } catch {
          /* ignore */
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [open, map])

  const heap =
    typeof performance !== "undefined" && (performance as any).memory
      ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
      : null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-[200] rounded bg-black/50 px-2 py-1 text-[10px] font-mono text-stone-400 hover:text-white border border-stone-700/50"
        aria-label="Show performance panel"
        title="Toggle perf panel (`)"
      >
        FPS
      </button>
    )
  }

  return (
    <div className="fixed bottom-3 left-3 z-[200] rounded-lg bg-black/80 backdrop-blur-md border border-stone-700/60 px-3 py-2 font-mono text-[11px] text-stone-200 shadow-lg min-w-[140px]">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-stone-400 uppercase tracking-wider text-[9px]">Perf</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-stone-500 hover:text-white text-[10px]"
          aria-label="Hide performance panel"
        >
          hide · `
        </button>
      </div>
      <div className="space-y-0.5">
        <div>
          <span className="text-stone-500">FPS </span>
          <span className={fps < 30 ? "text-red-400" : fps < 50 ? "text-amber-300" : "text-emerald-400"}>
            {fps || "—"}
          </span>
        </div>
        <div>
          <span className="text-stone-500">frame </span>
          {frameMs ? `${frameMs} ms` : "—"}
        </div>
        {mapZoom != null && (
          <div>
            <span className="text-stone-500">zoom </span>
            {mapZoom}
            <span className="text-stone-500"> · pitch </span>
            {mapPitch}°
          </div>
        )}
        {heap != null && (
          <div>
            <span className="text-stone-500">heap </span>
            {heap} MB
          </div>
        )}
      </div>
    </div>
  )
}
