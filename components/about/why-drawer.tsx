"use client"

import { ChevronRight } from "lucide-react"
import { slideContentClass, slidePanelClass, useSlidePanel } from "@/hooks/use-slide-panel"

export function WhyDrawer({ index, title, body }: { index: number; title: string; body: string }) {
  const { open, toggle, panelRef } = useSlidePanel()

  return (
    <div className="border-b border-[#ed5a43]/12">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="group flex w-full cursor-pointer items-center gap-3 py-4 text-left transition-colors focus-visible:outline-none"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-[#8b8271] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            open ? "rotate-90 text-[#ed5a43]" : ""
          }`}
        />
        <span className="w-5 shrink-0 font-mono text-micro text-[#9b8e7a]">{String(index + 1).padStart(2, "0")}</span>
        <span
          className={`pct-display text-lede font-medium transition-colors group-hover:text-[#ed5a43] group-focus-visible:text-[#ed5a43] ${
            open ? "text-[#f6f1e4]" : "text-[#ede8dc]"
          }`}
        >
          {title}
        </span>
      </button>
      <div ref={panelRef} aria-hidden={!open} className={slidePanelClass}>
        <div className={`flex gap-3 pb-5 ${slideContentClass(open)}`}>
          <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="w-5 shrink-0" aria-hidden />
          <p className="pct-display min-w-0 flex-1 pr-4 text-left text-prose font-light leading-[1.7] text-[#b4aa9b]">{body}</p>
        </div>
      </div>
    </div>
  )
}
