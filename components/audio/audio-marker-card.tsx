import { CalendarDays, MapPin, Milestone, Moon, Sun, Sunrise } from "lucide-react"
import { getMarkerMile } from "@/lib/marker-miles"
import { TIME_OF_DAY_LABEL, formatMonthDay, type TimeOfDay } from "@/lib/time-of-day"
import type { AudioMarker } from "@/types/map"

export const audioMarkerStatusClass =
  "flex items-center gap-2 font-mono text-micro uppercase tracking-[0.18em]"

function DuskIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M4 17h16" />
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M12 7v2M5.7 10.7l1.4 1.4M18.3 10.7l-1.4 1.4" />
    </svg>
  )
}

const TIME_OF_DAY_ICON = {
  sunrise: Sunrise,
  day: Sun,
  dusk: DuskIcon,
  night: Moon,
} satisfies Record<TimeOfDay, typeof Sun | typeof DuskIcon>

interface AudioMarkerCardBodyProps {
  marker: AudioMarker
  /** Draw the rule the date aligns to. Off where the card is already busy. */
  showMetaRule?: boolean
  /** Map cards show time of day instead of elevation, and dates without a year. */
  variant?: "map" | "library"
}

/**
 * Shared innards of a recording card: title, date, trail meta, description.
 * Used by the map playback card and the audio library so the two stay twins.
 */
export function AudioMarkerCardBody({
  marker,
  showMetaRule = true,
  variant = "library",
}: AudioMarkerCardBodyProps) {
  const mile = getMarkerMile(marker.id)
  const dateLabel =
    marker.recordingDate && variant === "map"
      ? formatMonthDay(marker.recordingDate)
      : marker.recordingDate
  const TimeIcon = marker.timeOfDay ? TIME_OF_DAY_ICON[marker.timeOfDay] : null

  return (
    <>
      {/* Date sits above the rule, its right edge flush with the rule's end. */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="pct-display min-w-0 text-[21px] font-medium leading-[1.14] text-[#ede8dc] md:text-[26px]">
          {marker.name}
        </h3>
        {dateLabel ? (
          <span className="mt-1 flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-micro uppercase tracking-[0.14em] text-[#9b8e7a]">
            <CalendarDays className="h-3 w-3" />
            {dateLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <div className="flex shrink-0 items-center gap-3 font-mono text-micro uppercase tracking-[0.18em] text-[#9b8e7a]">
          {mile !== null ? (
            <span className="flex items-center gap-1.5">
              <Milestone className="h-3 w-3" />
              MI {mile.toLocaleString("en-US")}
            </span>
          ) : null}
          {variant === "map" && marker.timeOfDay && TimeIcon ? (
            <span className="flex items-center gap-1.5">
              <TimeIcon className="h-3 w-3" />
              {TIME_OF_DAY_LABEL[marker.timeOfDay]}
            </span>
          ) : null}
          {variant !== "map" && marker.elevation ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              {marker.elevation.toLocaleString("en-US")} ft
            </span>
          ) : null}
        </div>
        {showMetaRule ? <div className="h-px flex-1 bg-white/15" /> : null}
      </div>

      {marker.description ? (
        <p className="pct-display mt-3 text-copy font-light leading-[1.6] text-[#ada396] md:text-prose">
          {marker.description}
        </p>
      ) : null}
    </>
  )
}
