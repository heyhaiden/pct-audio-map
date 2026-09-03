import { CalendarDays, MapPin, Milestone } from "lucide-react"
import { getMarkerMile } from "@/lib/marker-miles"
import type { AudioMarker } from "@/types/map"

export const audioMarkerStatusClass =
  "flex items-center gap-2 font-mono text-micro uppercase tracking-[0.18em]"

interface AudioMarkerCardBodyProps {
  marker: AudioMarker
  /** Extra classes on the title/date row (e.g. close-button gutter). */
  headerClassName?: string
  /** Draw the rule the date aligns to. Off where the card is already busy. */
  showMetaRule?: boolean
}

/**
 * Shared innards of a recording card: title, date, trail meta, description.
 * Used by the map playback card and the audio library so the two stay twins.
 */
export function AudioMarkerCardBody({
  marker,
  headerClassName = "",
  showMetaRule = true,
}: AudioMarkerCardBodyProps) {
  const mile = getMarkerMile(marker.id)

  return (
    <>
      {/* Date sits above the rule, its right edge flush with the rule's end. */}
      <div className={`flex items-start justify-between gap-3 ${headerClassName}`}>
        <h3 className="pct-display min-w-0 text-[21px] font-medium leading-[1.14] text-[#ede8dc] md:text-[26px]">
          {marker.name}
        </h3>
        {marker.recordingDate ? (
          <span className="mt-1 flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-micro uppercase tracking-[0.14em] text-[#9b8e7a]">
            <CalendarDays className="h-3 w-3" />
            {marker.recordingDate}
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
          {marker.elevation ? (
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
