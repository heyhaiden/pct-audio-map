"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { getChapterTimelineMotionStyle } from "@/lib/chapter-timeline-visibility"
import { getCompactChapterLabel } from "@/lib/mobile-navigation"
import type { CSSProperties } from "react"

interface ChapterTimelineProps {
  /** Chapter titles + a trailing "End" node (from pctSegments plus the finish). */
  nodes: { id: string; title: string }[]
  /** Index of the active node (current chapter, or the End node at trail's end). */
  activeIndex: number
  /**
   * Continuous trail progress, 0–1. The rail fills upward from Chapter 1 at
   * the bottom toward End at the top.
   */
  progress: number
  /** Slide the rail fully off-canvas while the audio experience owns the view. */
  hidden: boolean
  onNodeClick: (index: number) => void
  /** Toggle the drawer open/closed (mobile arrow; also usable on desktop). */
  onToggleDrawer?: () => void
}

/**
 * Shared chapter navigation for desktop + mobile: a vertical tab rail pinned
 * to the left edge. It mirrors the northbound map: Chapter 1 sits at the
 * bottom, End at the top, and progress fills upward.
 */
export function ChapterTimeline({
  nodes,
  activeIndex,
  progress,
  hidden,
  onNodeClick,
  onToggleDrawer,
}: ChapterTimelineProps) {
  const fill = Math.max(0, Math.min(1, progress))
  const lastIndex = nodes.length - 1
  const displayNodes = nodes.map((node, index) => ({ node, index })).reverse()
  const roman = ["I", "II", "III", "IV", "V", "VI"]

  return (
    <div
      className="pct-chapter-tabs-shell pointer-events-none fixed left-0 z-30"
      style={{
        "--pct-tab-font-size": `clamp(6px, ${(11 / Math.max(1, nodes.length)).toFixed(3)}dvh, 14px)`,
      } as CSSProperties}
    >
      <div className="relative flex h-full items-stretch">
        <div
          data-hidden={hidden ? "true" : "false"}
          data-progress={fill.toFixed(4)}
          aria-hidden={hidden}
          inert={hidden}
          className="relative flex h-full min-h-0 flex-col items-stretch will-change-[transform,opacity] transition-[transform,opacity] motion-reduce:transition-none"
          style={getChapterTimelineMotionStyle(hidden)}
        >
          <div aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-white/10">
            <div
              className="absolute bottom-0 left-0 w-full bg-[#ed5a43]/70 transition-[height] duration-150 ease-out"
              style={{ height: `${fill * 100}%` }}
            />
          </div>

          {displayNodes.map(({ node, index }) => {
            const isActive = index === activeIndex
            const isEnd = index === lastIndex
            const number = roman[index] ?? `${index + 1}`
            const shortName = isEnd ? "END" : getCompactChapterLabel(node.title)

            return (
              <button
                key={node.id}
                type="button"
                data-node-index={index}
                onClick={() => onNodeClick(index)}
                aria-label={
                  isEnd ? "Go to the end of the trail" : `Go to Chapter ${index + 1}: ${node.title}`
                }
                aria-current={isActive ? "true" : undefined}
                className={`pct-chapter-tab pointer-events-auto relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-r-[5px] border-t font-mono uppercase shadow-[2px_0_9px_rgba(0,0,0,0.34)] backdrop-blur-[4px] transition-[color,background-color,border-color,box-shadow] duration-300 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] ${
                  isActive
                    ? "border-y-white/15 border-r-[3px] border-r-[#ed5a43] bg-[rgba(23,21,17,0.93)] text-[#ede8dc] shadow-[3px_0_14px_rgba(0,0,0,0.45)]"
                    : "border-t-white/15 bg-[rgba(12,11,9,0.62)] text-[#b9b0a2] hover:bg-[rgba(23,21,17,0.8)] hover:text-[#ede8dc]"
                }`}
              >
                <span
                  className="block whitespace-nowrap leading-none"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  <b className={`font-semibold ${isActive ? "text-[#ed5a43]" : "text-current"}`}>{number}</b>
                  <span aria-hidden> · </span>
                  <span>{shortName}</span>
                </span>
              </button>
            )
          })}
        </div>

        {onToggleDrawer ? (
          <button
            type="button"
            onClick={onToggleDrawer}
            aria-label={hidden ? "Show chapter tabs" : "Hide chapter tabs"}
            aria-expanded={!hidden}
            className="pct-glass-control pointer-events-auto absolute top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full transition hover:border-[#ed5a43]/45 hover:text-[#ed5a43] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43] md:hidden"
            style={{
              left: hidden ? "6px" : "calc(100% + 6px)",
              transition: "left 700ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {hidden ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
    </div>
  )
}
