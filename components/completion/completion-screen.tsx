"use client"

import Link from "next/link"
import { ArrowRight, Headphones, RotateCcw } from "lucide-react"
import { OverlayShell } from "@/components/overlay/overlay-shell"
import { exitDocumentFullscreen, markNavigatedFromMap } from "@/lib/map-session"

interface CompletionScreenProps {
  isVisible: boolean
  totalMiles: number
  onRestart: () => void
  /** Clear the terminus and keep the map where it is. */
  onDismiss: () => void
}

export function CompletionScreen({
  isVisible,
  totalMiles,
  onRestart,
  onDismiss,
}: CompletionScreenProps) {
  const leaveForSitePage = () => {
    exitDocumentFullscreen()
    markNavigatedFromMap()
  }

  return (
    <OverlayShell
      isVisible={isVisible}
      onDismiss={onDismiss}
      kicker={`Northern Terminus · MI ${totalMiles.toLocaleString("en-US")}`}
      title={
        <>
          You&apos;ve reached
          <br />
          the monument.
        </>
      }
      footnote="Click anywhere to clear"
      actions={
        <>
          <Link href="/about" onClick={leaveForSitePage} className="pct-link-row">
            About the project
            <ArrowRight className="h-3.5 w-3.5 text-[#8b8271]" />
          </Link>
          <Link href="/about#get-involved" onClick={leaveForSitePage} className="pct-link-row">
            Get involved
            <ArrowRight className="h-3.5 w-3.5 text-[#8b8271]" />
          </Link>
          <Link href="/library" onClick={leaveForSitePage} className="pct-link-row">
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
            Start over
            <RotateCcw className="h-3.5 w-3.5 text-[#8b8271]" />
          </button>
        </>
      }
    >
      <p className="pct-display mt-5 max-w-[224px] text-copy font-light leading-[1.65] text-[#c0b7a6]">
        Field recordings across two thousand six hundred and fifty miles. Thank you for listening to
        them.
      </p>
    </OverlayShell>
  )
}
