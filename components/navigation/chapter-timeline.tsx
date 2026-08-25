"use client"

import { useEffect, useRef } from "react"
import { getChapterTimelineMotionStyle } from "@/lib/chapter-timeline-visibility"

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
}

/**
 * Shared chapter navigation for desktop + mobile: a vertical tab rail pinned
 * to the left edge. It mirrors the northbound map: Chapter 1 sits at the
 * bottom, End at the top, and progress fills upward.
 */
export function ChapterTimeline({ nodes, activeIndex, progress, hidden, onNodeClick }: ChapterTimelineProps) {
  const fill = Math.max(0, Math.min(1, progress))
  const lastIndex = nodes.length - 1
  const shellRef = useRef<HTMLDivElement>(null)
  const displayNodes = nodes.map((node, index) => ({ node, index })).reverse()
  const roman = ["I", "II", "III", "IV", "V"]
  const shortNames: Record<string, string> = {
    "Southern California": "SOCAL",
    "Sierra Nevada": "SIERRA",
    "Northern California": "NORCAL",
    Oregon: "OREGON",
    Washington: "WASHINGTON",
  }

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    const centerActiveButton = () => {
      const activeButton = shell.querySelector<HTMLElement>(`[data-node-index="${activeIndex}"]`)
      if (!activeButton || shell.scrollHeight <= shell.clientHeight) return
      const target = activeButton.offsetTop - (shell.clientHeight - activeButton.offsetHeight) / 2
      shell.scrollTo({ top: Math.max(0, target), behavior: "auto" })
    }

    centerActiveButton()
    const observer = new ResizeObserver(centerActiveButton)
    observer.observe(shell)
    return () => observer.disconnect()
  }, [activeIndex])

  return (
    <div
      ref={shellRef}
      aria-hidden={hidden}
      inert={hidden}
      className="pct-chapter-tabs-shell pointer-events-none fixed left-0 z-[75] overflow-y-auto [scrollbar-width:none] md:top-1/2 md:z-30 md:max-h-[calc(100dvh-48px)] md:-translate-y-1/2 [&::-webkit-scrollbar]:hidden"
    >
      <div
        data-hidden={hidden ? "true" : "false"}
        data-progress={fill.toFixed(4)}
        className="relative flex flex-col items-start will-change-[transform,opacity] transition-[transform,opacity] motion-reduce:transition-none"
        style={getChapterTimelineMotionStyle(hidden)}
      >
        <div aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-white/10">
          <div
            className="absolute bottom-0 left-0 w-full bg-[#d9cba8]/70 transition-[height] duration-150 ease-out"
            style={{ height: `${fill * 100}%` }}
          />
        </div>

        {displayNodes.map(({ node, index }) => {
          const isActive = index === activeIndex
          const isEnd = index === lastIndex
          const number = isEnd ? "↟" : roman[index] ?? `${index + 1}`
          const shortName = isEnd ? "END" : shortNames[node.title] ?? node.title

          return (
            <button
              key={node.id}
              type="button"
              data-node-index={index}
              onClick={() => onNodeClick(index)}
              aria-label={isEnd ? "Go to the end of the trail" : `Go to Chapter ${index + 1}: ${node.title}`}
              aria-current={isActive ? "true" : undefined}
              className={`pointer-events-auto relative min-h-11 min-w-[30px] rounded-r-[5px] border-t px-2 py-3 font-mono text-[14px] uppercase tracking-[0.13em] shadow-[2px_0_9px_rgba(0,0,0,0.34)] backdrop-blur-[4px] transition-[color,background-color,border-color,box-shadow] duration-300 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d9cba8] md:min-w-0 md:rounded-r-md md:tracking-[0.1em] ${
                isActive
                  ? "border-y-white/15 border-r-[3px] border-r-[#d9cba8] bg-[rgba(23,21,17,0.93)] text-[#ede8dc] shadow-[3px_0_14px_rgba(0,0,0,0.45)] md:pr-2.5"
                  : "border-t-white/15 bg-[rgba(12,11,9,0.62)] text-[#b9b0a2] hover:bg-[rgba(23,21,17,0.8)] hover:text-[#ede8dc]"
              }`}
            >
              <span className="block" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                <b className={`font-semibold ${isActive ? "text-[#d9cba8]" : "text-current"}`}>{number}</b>
                <span aria-hidden> · </span>
                <span className="pct-tab-label-short">{shortName}</span>
                <span className="pct-tab-label-full">{isEnd ? "END OF TRAIL" : node.title}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
