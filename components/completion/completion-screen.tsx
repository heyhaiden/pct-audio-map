"use client"

import Link from "next/link"
import { Flag, Music, RotateCcw } from "lucide-react"
import {
  OverlayActionLabel,
  OverlayIcon,
  OverlayShell,
} from "@/components/overlay/overlay-shell"
import { exitDocumentFullscreen, markNavigatedFromMap } from "@/lib/map-session"

interface CompletionScreenProps {
  isVisible: boolean
  onRestart: () => void
  /** Clear the terminus and keep the map where it is. */
  onDismiss: () => void
}

export function CompletionScreen({
  isVisible,
  onRestart,
  onDismiss,
}: CompletionScreenProps) {
  return (
    <OverlayShell
      isVisible={isVisible}
      onDismiss={onDismiss}
      icon={
        <OverlayIcon>
          <Flag className="h-8 w-8 text-[#ed5a43]" />
        </OverlayIcon>
      }
      kicker="Northern terminus"
      title="End of Trail"
      actions={
        <>
          <Link
            href="/library"
            onClick={() => {
              exitDocumentFullscreen()
              markNavigatedFromMap()
            }}
            className="pct-link-row"
          >
            <OverlayActionLabel icon={<Music className="h-4 w-4" />}>
              Audio library
            </OverlayActionLabel>
          </Link>
          <button type="button" onClick={onRestart} className="pct-link-row">
            <OverlayActionLabel icon={<RotateCcw className="h-4 w-4" />}>
              Start over
            </OverlayActionLabel>
          </button>
        </>
      }
    >
      <p className="pct-display mt-6 max-w-[22rem] text-lede font-light leading-[1.6] text-[#c0b7a6]">
        Field recordings from Mexico to Canada. Thank you for listening.
      </p>
    </OverlayShell>
  )
}
