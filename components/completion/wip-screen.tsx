"use client"

import { Construction, Map, RotateCcw } from "lucide-react"
import {
  OverlayActionLabel,
  OverlayIcon,
  OverlayShell,
} from "@/components/overlay/overlay-shell"
import { OverlaySiteLinks } from "@/components/overlay/overlay-site-links"
import { markWipDismissedInMapSession } from "@/lib/map-session"

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
        <OverlayIcon>
          <Construction className="h-8 w-8 text-[#ed5a43]" />
        </OverlayIcon>
      }
      title="Trail Continues"
      actions={
        <>
          <button type="button" onClick={onDismiss} className="pct-link-row">
            <OverlayActionLabel icon={<Map className="h-4 w-4" />}>
              Keep exploring
            </OverlayActionLabel>
          </button>
          <OverlaySiteLinks
            pages={["library"]}
            onNavigate={markWipDismissedInMapSession}
          />
          <button type="button" onClick={onRestart} className="pct-link-row">
            <OverlayActionLabel icon={<RotateCcw className="h-4 w-4" />}>
              Restart journey
            </OverlayActionLabel>
          </button>
        </>
      }
    >
      <p className="pct-display mt-6 max-w-[22rem] text-lede font-light leading-[1.6] text-[#c0b7a6]">
        You&apos;ve reached the edge of what we&apos;ve recorded so far. Thank you for pausing to listen.
      </p>
    </OverlayShell>
  )
}
