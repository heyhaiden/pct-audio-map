import type { AudioLibraryFolder } from "@/lib/audio-library-folders"
import { getMarkerMile } from "@/lib/marker-miles"
import { resolveLoopSources } from "@/lib/audio-loop-sources"
import { SITE_NAME, SITE_URL } from "@/lib/site"
import type { AudioMarker } from "@/types/map"

/**
 * schema.org markup for /library: one AudioObject per recording, with where
 * and when it was made. Search engines and AI answers can then cite a single
 * recording ("what does the PCT sound like at mile 151?") instead of only
 * the page. Mirrors what the page lists, so it never describes hidden content.
 */

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
]

/** "March 31, 2025" → "2025-03-31". Manual parse: Date() would apply the server timezone. */
export function isoDate(label: string | undefined): string | undefined {
  const match = label?.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/)
  if (!match) return undefined
  const month = MONTHS.indexOf(match[1].toLowerCase())
  if (month < 0) return undefined
  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[2].padStart(2, "0")}`
}

/** 65 → "PT1M5S" (ISO 8601 duration). */
export function isoDuration(seconds: number | undefined): string | undefined {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return undefined
  const whole = Math.round(seconds)
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  return `PT${minutes ? `${minutes}M` : ""}${rest || !minutes ? `${rest}S` : ""}`
}

function absolute(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url}`
}

function audioObject(marker: AudioMarker, chapterTitle: string) {
  const sources = resolveLoopSources(marker.audioUrl, {
    blobBase: process.env.NEXT_PUBLIC_AUDIO_CDN_URL,
  })
  const mile = getMarkerMile(marker.id)
  const [longitude, latitude] = marker.coordinates
  const where = mile != null ? `Pacific Crest Trail mile ${Math.round(mile)}` : "Pacific Crest Trail"

  return {
    "@type": "AudioObject",
    name: marker.name,
    description: marker.description,
    genre: "Field recording",
    about: chapterTitle,
    contentUrl: sources ? absolute(sources.opusUrl) : undefined,
    encodingFormat: sources ? "audio/ogg" : undefined,
    duration: isoDuration(marker.durationSeconds),
    dateCreated: isoDate(marker.recordingDate),
    creator: { "@type": "Person", name: "Anna Wozniewicz" },
    contentLocation: {
      "@type": "Place",
      name: `${marker.name} (${where})`,
      geo: {
        "@type": "GeoCoordinates",
        latitude,
        longitude,
        elevation: `${marker.elevation} ft`,
      },
    },
  }
}

export function libraryJsonLd(folders: AudioLibraryFolder[], description: string) {
  const items = folders.flatMap((folder) =>
    folder.markers
      .filter((marker) => marker.audioUrl)
      .map((marker) => audioObject(marker, folder.title)),
  )

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Audio Library",
    url: `${SITE_URL}/library`,
    description,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    about: { "@type": "TouristAttraction", name: "Pacific Crest Trail" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item,
      })),
    },
  }
}
