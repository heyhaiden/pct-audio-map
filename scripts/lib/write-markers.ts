import type { CsvRow } from "./parse-csv.ts"
import { classifyTimeOfDay } from "../../lib/time-of-day.ts"

export interface EnrichedMarker extends CsvRow {
  elevation: number
  audioUrl: string
}

const CHAPTER_LABELS: Record<string, string> = {
  "southern-california": "Southern California",
  "sierra-nevada": "The Sierra",
  "northern-california": "Northern California",
  "oregon-cascades": "Oregon",
  "washington-cascades": "Washington",
}

function escapeTsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function chapterComment(chapter: string, index: number, markers: EnrichedMarker[]): string | null {
  if (index === 0 || markers[index - 1].chapter !== chapter) {
    return `  // ${CHAPTER_LABELS[chapter] ?? chapter}`
  }
  return null
}

export function formatAudioMarkersTs(markers: EnrichedMarker[]): string {
  const blocks = markers.map((marker, index) => {
    const comment = chapterComment(marker.chapter, index, markers)
    const timeOfDay = classifyTimeOfDay(marker.recordingTime)
    const lines = [
      comment,
      "  {",
      `    id: "${escapeTsString(marker.id)}",`,
      `    name: "${escapeTsString(marker.name)}",`,
      `    coordinates: [${marker.lng}, ${marker.lat}],`,
      `    elevation: ${marker.elevation},`,
      `    audioUrl: "${escapeTsString(marker.audioUrl)}",`,
      `    chapter: "${escapeTsString(marker.chapter)}",`,
      `    featured: ${marker.featured},`,
      marker.description
        ? `    description:\n      "${escapeTsString(marker.description)}",`
        : undefined,
      marker.recordingDate
        ? `    recordingDate: "${escapeTsString(marker.recordingDate)}",`
        : undefined,
      timeOfDay ? `    timeOfDay: "${timeOfDay}",` : undefined,
      "  },",
    ].filter(Boolean)

    return lines.join("\n")
  })

  return `import type { AudioMarker } from "@/types/map"

export const audioMarkers: AudioMarker[] = [
${blocks.join("\n")}
]
`
}

export function formatMarkerMilesTs(miles: Record<string, number>): string {
  const entries = Object.entries(miles)
    .sort(([, a], [, b]) => a - b)
    .map(([id, mile]) => `  "${id}": ${mile},`)
    .join("\n")

  return `/**
 * Trail mile for each recording, derived from \`public/pct-trail.geojson\`:
 * nearest trail vertex to the marker, cumulative great-circle distance to that
 * vertex, scaled so the full line reads 2,650 miles.
 *
 * Precomputed rather than measured at runtime — the library page would
 * otherwise have to load and walk 12,657 trail points just to print a number.
 * Regenerate if the trail geometry or marker coordinates change.
 */
export const MARKER_MILES: Record<string, number> = {
${entries}
}

export function getMarkerMile(markerId: string): number | null {
  return MARKER_MILES[markerId] ?? null
}
`
}
