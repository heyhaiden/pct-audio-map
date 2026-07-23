"use client"

import { Flag } from "lucide-react"

interface ChapterTimelineProps {
  /** Chapter titles + a trailing "End" node (from pctSegments plus the finish). */
  nodes: { id: string; title: string }[]
  /** Index of the active node (current chapter, or the End node at trail's end). */
  activeIndex: number
  /**
   * Continuous scroll progress along the dot track, 0–1. 0 sits on the first
   * node, 1 on the last; the value advances smoothly through each chapter so
   * the pink connector line *is* the horizontal scroll-progress indicator.
   */
  progress: number
  onNodeClick: (index: number) => void
}

/**
 * Shared chapter navigation for desktop + mobile: a connected node track pinned
 * to the bottom of the screen. The pink connector line fills continuously as
 * you scroll (the horizontal progress line the dots sit on); tap any node to
 * jump. The active node's name shows below. The final node is the trail's end.
 */
export function ChapterTimeline({ nodes, activeIndex, progress, onNodeClick }: ChapterTimelineProps) {
  const fill = Math.max(0, Math.min(1, progress))
  const lastIndex = nodes.length - 1

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none bg-gradient-to-t from-stone-950/85 via-stone-950/45 to-transparent">
      <div className="mx-auto max-w-2xl px-6 pt-8 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
        {/* Node track */}
        <div className="relative pointer-events-auto">
          {/* Connector line — inset by half a node width so it ends on the dots */}
          <div className="absolute left-2 right-2 top-2 -translate-y-1/2 h-0.5 bg-white/20 rounded-full" />
          {/* Continuous pink progress fill = the horizontal scroll indicator */}
          <div
            className="absolute left-2 top-2 -translate-y-1/2 h-0.5 bg-[#ff6b9d] rounded-full transition-[width] duration-150 ease-out"
            style={{ width: `calc(${fill} * (100% - 1rem))` }}
          />

          {/* Nodes */}
          <div className="relative flex items-start justify-between">
            {nodes.map((node, index) => {
              const isActive = index === activeIndex
              const isPast = index < activeIndex
              const isEnd = index === lastIndex

              return (
                <button
                  key={node.id}
                  onClick={() => onNodeClick(index)}
                  aria-label={isEnd ? "Go to the end of the trail" : `Go to Chapter ${index + 1}: ${node.title}`}
                  aria-current={isActive ? "true" : undefined}
                  className="relative flex flex-col items-center gap-1.5 focus:outline-none"
                >
                  {/* Expanded tap target without disturbing dot spacing */}
                  <span aria-hidden className="absolute -inset-x-3 -top-2 -bottom-3" />
                  <span
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                      isActive
                        ? "bg-[#ff6b9d] border-[#ff6b9d] scale-125 shadow-lg shadow-[#ff6b9d]/50"
                        : isPast
                          ? "bg-[#ff6b9d] border-[#ff6b9d]"
                          : "bg-transparent border-white/50 hover:border-white/80"
                    }`}
                  />
                  {isEnd ? (
                    <Flag
                      className={`w-3 h-3 transition-colors ${isActive ? "text-[#ff6b9d]" : "text-stone-400"}`}
                    />
                  ) : (
                    <span
                      className={`text-[11px] font-semibold tabular-nums transition-colors ${
                        isActive ? "text-[#ff6b9d]" : "text-stone-300"
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active node name */}
        <div className="mt-3 text-center">
          <span className="text-sm font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            {nodes[activeIndex]?.title}
          </span>
        </div>
      </div>
    </div>
  )
}
