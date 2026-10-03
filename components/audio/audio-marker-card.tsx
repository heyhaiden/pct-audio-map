import { CalendarDays, CloudMoon, CloudSun, Milestone, Moon, SunMedium } from "lucide-react"
import { getMarkerMile } from "@/lib/marker-miles"
import { TIME_OF_DAY_LABEL, formatMonthDay, type TimeOfDay } from "@/lib/time-of-day"
import type { AudioMarker } from "@/types/map"

export const audioMarkerStatusClass =
  "flex items-center gap-2 font-mono text-micro uppercase tracking-[0.18em]"

/** Horizon sun (Material wb_twilight). Dawn and dusk share it. */
function TwilightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 18h18" />
      <path d="M8 18a4 4 0 0 1 8 0" />
      <path d="M12 8v2M6.4 11.4l1.4 1.4M17.6 11.4l-1.4 1.4" />
    </svg>
  )
}

/** Denser sunburst (Material brightness). Afternoon, distinct from the plain midday sun. */
function BrightnessIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 6.6 12 2.4M14.7 7.3 16.8 3.7M16.7 9.3 20.3 7.2M17.4 12 21.6 12M16.7 14.7 20.3 16.8M14.7 16.7 16.8 20.3M12 17.4 12 21.6M9.3 16.7 7.2 20.3M7.3 14.7 3.7 16.8M6.6 12 2.4 12M7.3 9.3 3.7 7.2M9.3 7.3 7.2 3.7" />
    </svg>
  )
}

const TIME_OF_DAY_ICON = {
  dawn: TwilightIcon,
  morning: CloudSun,
  midday: SunMedium,
  afternoon: BrightnessIcon,
  evening: CloudMoon,
  dusk: TwilightIcon,
  night: Moon,
} satisfies Record<TimeOfDay, typeof SunMedium | typeof TwilightIcon>

interface AudioMarkerCardBodyProps {
  marker: AudioMarker
  /** Draw the rule the date aligns to. Off where the card is already busy. */
  showMetaRule?: boolean
  /** Map cards linger. Library cards keep the note, with quieter type. */
  variant?: "map" | "library"
  /** Library cards render the note in a desktop block / mobile expand instead. */
  showDescription?: boolean
}

/**
 * Shared innards of a recording card. Library keeps the note at catalog size.
 */
export function AudioMarkerCardBody({
  marker,
  showMetaRule = true,
  variant = "library",
  showDescription = true,
}: AudioMarkerCardBodyProps) {
  const mile = getMarkerMile(marker.id)
  const dateLabel = marker.recordingDate ? formatMonthDay(marker.recordingDate) : null
  const TimeIcon = marker.timeOfDay ? TIME_OF_DAY_ICON[marker.timeOfDay] : null
  const isLibrary = variant === "library"

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3
          className={`pct-display min-w-0 font-medium leading-[1.2] text-[#ede8dc] ${
            isLibrary ? "text-[18px] md:text-[22px]" : "text-[21px] md:text-[26px]"
          }`}
        >
          {marker.name}
        </h3>
        {isLibrary && dateLabel ? (
          <span className="mt-1 hidden shrink-0 items-center gap-1.5 font-mono text-micro uppercase tracking-[0.08em] text-[#9b8e7a] md:inline-flex">
            <CalendarDays className="h-3 w-3" />
            {dateLabel}
          </span>
        ) : null}
      </div>

      <div className={`${isLibrary ? "mt-1.5" : "mt-2.5"} flex items-center gap-2.5`}>
        <div
          className={`flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-micro uppercase text-[#9b8e7a] ${
            isLibrary ? "tracking-[0.08em]" : "tracking-[0.18em]"
          }`}
        >
          {mile !== null ? (
            <span className="flex items-center gap-1.5">
              <Milestone className="h-3 w-3" />
              MI {mile.toLocaleString("en-US")}
            </span>
          ) : null}
          {dateLabel ? (
            <span className={`items-center gap-1.5 ${isLibrary ? "inline-flex md:hidden" : "flex"}`}>
              <CalendarDays className="h-3 w-3" />
              {dateLabel}
            </span>
          ) : null}
          {marker.timeOfDay && TimeIcon ? (
            <span className="flex items-center gap-1.5">
              <TimeIcon className="h-3 w-3" />
              {TIME_OF_DAY_LABEL[marker.timeOfDay]}
            </span>
          ) : null}
        </div>
        {showMetaRule ? <div className="h-px flex-1 bg-white/15" /> : null}
      </div>

      {showDescription && marker.description ? (
        <p
          className={`pct-display mt-3 font-light leading-[1.6] text-[#ada396] ${
            isLibrary ? "text-copy" : "text-copy md:text-prose"
          }`}
        >
          {marker.description}
        </p>
      ) : null}
    </>
  )
}
