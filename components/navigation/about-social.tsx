"use client"

import { Volume2, VolumeX } from "lucide-react"
import { MobileNavigationMenu } from "@/components/navigation/mobile-navigation-menu"

interface AboutSocialProps {
  className?: string
  soundEnabled: boolean
  onSoundToggle: () => void
}

// 44px on both touch and desktop — these are the only persistent map controls,
// so they hold their weight rather than shrinking on the larger screen.
const controlClass =
  "pct-glass-control grid h-11 w-11 place-items-center rounded-full transition hover:border-[#ed5a43]/45 hover:text-[#ed5a43] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43]"

export function AboutSocial({ className, soundEnabled, onSoundToggle }: AboutSocialProps) {
  return (
    <div
      className={`fixed right-3 top-3 z-50 flex flex-col items-center gap-2 md:right-[22px] md:top-5 ${
        className ?? ""
      }`}
    >
      <MobileNavigationMenu source="map" triggerClassName={controlClass} />
      <button
        type="button"
        onClick={onSoundToggle}
        aria-label={soundEnabled ? "Mute journey audio" : "Unmute journey audio"}
        aria-pressed={!soundEnabled}
        className={controlClass}
      >
        {soundEnabled ? (
          <Volume2 className="h-[18px] w-[18px]" />
        ) : (
          <VolumeX className="h-[18px] w-[18px]" />
        )}
      </button>
    </div>
  )
}
