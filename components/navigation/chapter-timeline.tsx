"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { type CSSProperties } from "react"
import {
  getChapterDrawerHandleIndex,
  getChapterTimelineMotionStyle,
} from "@/lib/chapter-timeline-visibility"
import { getCompactChapterLabel } from "@/lib/mobile-navigation"

interface ChapterTimelineProps {
  /** Chapter titles, in trail order (from pctSegments). */
  nodes: { id: string; title: string }[]
  /** Index of the active chapter. */
  activeIndex: number
  /**
   * Continuous trail progress, 0–1. The rail fills upward from Chapter 1 at
   * the bottom toward the last chapter at the top; the dock fills rightward.
   */
  progress: number
  /** Slide the rail/dock fully off-canvas while the audio experience owns the view. */
  hidden: boolean
  onNodeClick: (index: number) => void
  /** Toggle the drawer open/closed (rail peek handle on phones). */
  onToggleDrawer?: () => void
  /** Hide the peek handle while the audio card owns the view. */
  showDrawerHandle?: boolean
}

/**
 * Shared chapter navigation: left rail on desktop (no drawer), scaled mobile
 * rail with a peek drawer, and a bottom dock when the viewport is too short.
 * Chapter 1 stays first in the DOM; CSS `flex-col-reverse` puts it at the
 * bottom of the rail.
 */
export function ChapterTimeline({
  nodes,
  activeIndex,
  progress,
  hidden,
  onNodeClick,
  onToggleDrawer,
  showDrawerHandle = true,
}: ChapterTimelineProps) {
  const fill = Math.max(0, Math.min(1, progress))
  const roman = ["I", "II", "III", "IV", "V", "VI"]
  const handleIndex = getChapterDrawerHandleIndex(nodes.length)
  const peekHandle = Boolean(onToggleDrawer && showDrawerHandle)
  const connectedTab = (index: number) => (index === handleIndex ? "true" : "false")

  return (
    <div className="pct-chapter-tabs-shell pointer-events-none fixed z-30">
      <div
        data-hidden={hidden ? "true" : "false"}
        data-peek={peekHandle ? "true" : "false"}
        data-progress={fill.toFixed(4)}
        className="pct-chapter-tabs-motion relative will-change-[translate,opacity] transition-[translate,opacity] motion-reduce:transition-none"
        style={getChapterTimelineMotionStyle()}
      >
        {/* `inert` sits on the tabs themselves, not this column: the drawer
            handle is nested inside the connected tab's wrapper, and an inert
            column would take the handle down with it — leaving no way to reopen
            a tucked rail. */}
        <div className="pct-chapter-tabs-cluster relative items-stretch">
          <div aria-hidden className="pct-chapter-tabs-progress">
            <div
              className="pct-chapter-tabs-progress-fill absolute bg-[#ed5a43]/70 transition-[height,width] duration-150 ease-out"
              style={
                {
                  "--pct-tab-progress": `${fill * 100}%`,
                } as CSSProperties
              }
            />
          </div>

          {nodes.map((node, index) => {
            const isActive = index === activeIndex
            const number = roman[index] ?? `${index + 1}`
            const shortName = getCompactChapterLabel(node.title)

            const tab = (
              <button
                key={node.id}
                type="button"
                aria-hidden={hidden}
                inert={hidden}
                tabIndex={hidden ? -1 : undefined}
                data-node-index={index}
                data-connected={connectedTab(index)}
                data-active={isActive ? "true" : "false"}
                onClick={() => onNodeClick(index)}
                aria-label={`Go to Chapter ${index + 1}: ${node.title}`}
                aria-current={isActive ? "true" : undefined}
                className={`pct-chapter-tab pointer-events-auto relative font-mono uppercase transition-[color,background-color,border-color,box-shadow,width,height,opacity] duration-300 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] motion-reduce:transition-none ${
                  isActive ? "pct-chapter-tab--active" : "pct-chapter-tab--idle"
                }`}
              >
                <span className="pct-chapter-tab-label whitespace-nowrap leading-none">
                  <b
                    className={`font-semibold ${
                      isActive ? "text-[#ed5a43]" : "text-current opacity-80"
                    }`}
                  >
                    {number}
                  </b>
                  <span aria-hidden> · </span>
                  <span>{shortName}</span>
                </span>
              </button>
            )

            if (index !== handleIndex || !peekHandle) return tab

            // The handle lives inside the connected tab's own box, whose width
            // shrink-wraps that tab. `left-full` is therefore that tab's right
            // edge by construction — it tracks the width transition with no
            // measurement and no frame of lag, so they can never separate.
            return (
              <div key={node.id} className="pct-chapter-tab-handle-wrap relative flex min-h-0 w-fit">
                {tab}
                <button
                  type="button"
                  onClick={onToggleDrawer}
                  aria-label={hidden ? "Show chapter tabs" : "Hide chapter tabs"}
                  aria-expanded={!hidden}
                  className={`pct-chapter-drawer-handle pointer-events-auto absolute left-full top-1/2 z-10 h-14 w-6 -translate-y-1/2 rounded-r-[5px] border-y border-r border-y-white/15 border-r-[#ed5a43]/45 text-[#b9b0a2] shadow-[2px_0_9px_rgba(0,0,0,0.34)] backdrop-blur-[4px] hover:text-[#ed5a43] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] ${
                    activeIndex === handleIndex
                      ? "bg-[rgba(23,21,17,0.93)]"
                      : "bg-[rgba(12,11,9,0.62)]"
                  }`}
                >
                  {hidden ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
