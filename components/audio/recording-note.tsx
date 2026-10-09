import { NativeLandPills } from "@/components/audio/native-land-pills"
import type { AudioMarker } from "@/types/map"

export function hasRecordingNote(marker: Pick<AudioMarker, "description" | "lands">) {
  return Boolean(marker.description) || Boolean(marker.lands?.length)
}

export function RecordingNote({
  marker,
  className,
}: {
  marker: AudioMarker
  className?: string
}) {
  if (!hasRecordingNote(marker)) return null

  return (
    <div className={className}>
      {marker.description ? (
        <p className="pct-display text-copy font-light leading-[1.6] text-[#ada396]">
          {marker.description}
        </p>
      ) : null}
      <NativeLandPills lands={marker.lands} className={marker.description ? "mt-3" : undefined} />
    </div>
  )
}
