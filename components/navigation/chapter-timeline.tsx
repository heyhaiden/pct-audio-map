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
   * the bottom toward the last chapter at the top.
   */
  progress: number
  /** Slide the rail fully off-canvas while the audio experience owns the view. */
  hidden: boolean
  onNodeClick: (index: number) => void
  /** Toggle the drawer open/closed (mobile arrow; also usable on desktop). */
  onToggleDrawer?: () => void
  /** Hide the peek handle while the audio card owns the view. */
  showDrawerHandle?: boolean
}

/**
 * Shared chapter navigation for desktop + mobile: a vertical tab rail pinned
 * to the left edge. It mirrors the northbound map: Chapter 1 sits at the
 * bottom, the last chapter at the top, and progress fills upward.
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
  const displayNodes = nodes.map((node, index) => ({ node, index })).reverse()
  const roman = ["I", "II", "III", "IV", "V", "VI"]
  const handleIndex = getChapterDrawerHandleIndex(nodes.length)
  const peekHandle = Boolean(onToggleDrawer && showDrawerHandle)

  // The handle's offset is pure CSS (--pct-handle-offset), matched to the
  // connected tab's own width variable. Measuring the tab from JS meant the
  // handle updated a frame behind and visibly floated during hover.
  const connectedTab = (index: number) => (index === handleIndex ? "true" : "false")

  return (
    <div
      className="pct-chapter-tabs-shell pointer-events-none fixed left-0 z-30"
      style={{
        "--pct-tab-font-size": `clamp(9px, ${(12 / Math.max(1, nodes.length)).toFixed(3)}dvh, 15px)`,
      } as CSSProperties}
    >
      <div
        data-hidden={hidden ? "true" : "false"}
        data-progress={fill.toFixed(4)}
        className="relative flex h-full min-h-0 items-stretch will-change-[transform,opacity] transition-[translate,opacity] motion-reduce:transition-none"
        style={getChapterTimelineMotionStyle(hidden, peekHandle)}
      >
        {/* `inert` sits on the tabs themselves, not this column: the drawer
            handle is nested inside the connected tab's wrapper, and an inert
            column would take the handle down with it — leaving no way to reopen
            a tucked rail. */}
        <div className="relative flex h-full min-h-0 flex-col items-stretch">
          <div aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-white/10">
            <div
              className="absolute bottom-0 left-0 w-full bg-[#ed5a43]/70 transition-[height] duration-150 ease-out"
              style={{ height: `${fill * 100}%` }}
            />
          </div>

          {displayNodes.map(({ node, index }) => {
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
                className={`pct-chapter-tab pointer-events-auto relative flex min-h-0 items-center justify-center overflow-hidden rounded-r-[5px] border-t font-mono uppercase shadow-[2px_0_9px_rgba(0,0,0,0.34)] backdrop-blur-[4px] transition-[color,background-color,border-color,box-shadow,width,opacity] duration-300 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] motion-reduce:transition-none ${
                  index === handleIndex && peekHandle ? "h-full" : "flex-1"
                } ${
                  isActive
                    ? "border-y-white/15 border-r-[3px] border-r-[#ed5a43] bg-[rgba(23,21,17,0.93)] text-[#ede8dc] shadow-[3px_0_14px_rgba(0,0,0,0.45)]"
                    : "border-t-white/15 border-r-2 border-r-transparent bg-[rgba(12,11,9,0.62)] text-[#b9b0a2] hover:border-r-[#ed5a43]/70 hover:bg-[rgba(23,21,17,0.88)] hover:text-[#ede8dc] hover:shadow-[2px_0_12px_rgba(0,0,0,0.4)]"
                }`}
              >
                <span
                  className="block whitespace-nowrap leading-none"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  <b
                    className={`font-semibold ${isActive ? "text-[#ed5a43]" : "text-current opacity-80"}`}
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
              <div key={node.id} className="relative flex w-fit min-h-0 flex-1">
                {tab}
                <button
                  type="button"
                  onClick={onToggleDrawer}
                  aria-label={hidden ? "Show chapter tabs" : "Hide chapter tabs"}
                  aria-expanded={!hidden}
                  className={`pct-chapter-drawer-handle pointer-events-auto absolute left-full top-1/2 z-10 grid h-14 w-6 -translate-y-1/2 place-items-center rounded-r-[5px] border-y border-r border-y-white/15 border-r-[#ed5a43]/45 text-[#b9b0a2] shadow-[2px_0_9px_rgba(0,0,0,0.34)] backdrop-blur-[4px] hover:text-[#ed5a43] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] md:hidden ${
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
