"use client"

import Link from "next/link"
import { ArrowRight, Compass, Construction, Headphones, RotateCcw, X } from "lucide-react"
import { OverlayShell } from "@/components/overlay/overlay-shell"
import { exitDocumentFullscreen, markNavigatedFromMap } from "@/lib/map-session"

interface WipScreenProps {
  isVisible: boolean
  onRestart: () => void
  /** Close the notice and keep exploring the map from the current position. */
  onDismiss: () => void
}

export function WipScreen({ isVisible, onRestart, onDismiss }: WipScreenProps) {
  return (
    <OverlayShell
      isVisible={isVisible}
      onDismiss={onDismiss}
      icon={
        <div className="pct-glass-control flex h-16 w-16 items-center justify-center rounded-full">
          <Construction className="h-7 w-7 text-[#ed5a43]" />
        </div>
      }
      kicker="More soundscapes coming"
      title="Trail Continues"
      footnote="Click anywhere to clear"
      closeControl={
        <button
          type="button"
          onClick={onDismiss}
          className="pct-glass-control absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full text-[#ada396] transition hover:text-[#ed5a43] md:right-[22px] md:top-5 md:h-10 md:w-10"
          aria-label="Close and keep exploring"
        >
          <X className="h-5 w-5" />
        </button>
      }
      actions={
        <>
          <button type="button" onClick={onDismiss} className="pct-link-row">
            <span className="flex items-center gap-2">
              <Compass className="h-3.5 w-3.5" />
              Keep exploring
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-[#8b8271]" />
          </button>
          <Link
            href="/library"
            onClick={() => {
              exitDocumentFullscreen()
              markNavigatedFromMap()
            }}
            className="pct-link-row"
          >
            <span className="flex items-center gap-2">
              <Headphones className="h-3.5 w-3.5" />
              Audio library
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-[#8b8271]" />
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className="pct-link-row border-b border-b-[#ed5a43]/20"
          >
            Restart journey
            <RotateCcw className="h-3.5 w-3.5 text-[#8b8271]" />
          </button>
        </>
      }
    >
      <p className="pct-display mt-5 max-w-[260px] text-copy font-light leading-[1.65] text-[#c0b7a6]">
        You&apos;ve reached the edge of what we&apos;ve mapped so far — early Oregon and beyond are
        still in progress.
      </p>
      <p className="pct-display mt-4 max-w-[260px] text-copy font-light leading-[1.65] text-[#ada396]">
        Keep exploring the map from here, browse the library, or head back south for more audio
        while we keep recording.
      </p>
    </OverlayShell>
  )
}
