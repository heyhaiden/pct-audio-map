#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { del, put } from "@vercel/blob"
import { audioMarkers } from "../data/audio-markers.ts"
import {
  blobPathname,
  needsTranscode,
  probeDurationSeconds,
  publicAudioUrl,
  sourceBlobPathname,
  transcodeToMp3,
} from "./lib/deliver-audio.ts"
import { parseMarkerCsv } from "./lib/parse-csv.ts"
import { sampleElevationFeet } from "./lib/mapbox-terrain.ts"
import { computeMarkerMiles } from "./lib/compute-marker-miles.ts"
import {
  cachedLands,
  fetchTerritoriesAtPosition,
  type NativeLandCache,
} from "./lib/native-land.ts"
import {
  formatAudioMarkersTs,
  formatMarkerMilesTs,
  type EnrichedMarker,
} from "./lib/write-markers.ts"

const NATIVE_LAND_CACHE_PATH = join(process.cwd(), "data/native-lands.json")
const NATIVE_LAND_REQUEST_GAP_MS = 200

const BLOB_CACHE_MAX_AGE = 60 * 60 * 24 * 365

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const text = readFileSync(path, "utf8")
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function parseArgs(argv: string[]) {
  const options = {
    csv: "content/audio-markers.csv",
    audioDir: "content/audio",
    dryRun: false,
    skipUpload: false,
    skipElevation: false,
    skipLands: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--dry-run") options.dryRun = true
    else if (arg === "--skip-upload") options.skipUpload = true
    else if (arg === "--skip-elevation") options.skipElevation = true
    else if (arg === "--skip-lands") options.skipLands = true
    else if (arg === "--csv") options.csv = argv[++i]
    else if (arg === "--audio-dir") options.audioDir = argv[++i]
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: pnpm ingest:audio [options]

Options:
  --csv <path>        CSV file (default: content/audio-markers.csv)
  --audio-dir <path>  Local audio folder (default: content/audio)
  --skip-upload       Regenerate marker files only
  --skip-elevation    Reuse elevations already in data/audio-markers.ts
  --skip-lands        Reuse Indigenous territory names already in data/native-lands.json
  --dry-run           Validate without uploads or file writes

Uncompressed sources (.wav/.aiff/.flac) are transcoded to 128k MP3 before upload.
Blob MP3s are fallback-only. Prefer --skip-upload unless an older-browser MP3 is missing.
`)
      process.exit(0)
    }
  }

  return options
}

function audioContentType(filename: string): string {
  if (filename.toLowerCase().endsWith(".mp3")) return "audio/mpeg"
  if (filename.toLowerCase().endsWith(".m4a") || filename.toLowerCase().endsWith(".aac")) {
    return "audio/mp4"
  }
  if (filename.toLowerCase().endsWith(".ogg")) return "audio/ogg"
  return "application/octet-stream"
}

async function main() {
  loadEnvFile(join(process.cwd(), ".env.local"))
  loadEnvFile(join(process.cwd(), ".env"))

  const options = parseArgs(process.argv.slice(2))
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN

  if (!existsSync(options.csv)) {
    throw new Error(`CSV not found: ${options.csv}`)
  }

  const rows = parseMarkerCsv(readFileSync(options.csv, "utf8"))
  console.log(`Parsed ${rows.length} markers from ${options.csv}`)

  if (!mapboxToken && !options.skipElevation) {
    throw new Error("MAPBOX_ACCESS_TOKEN is required for elevation sampling (or pass --skip-elevation)")
  }

  const elevationById = Object.fromEntries(
    audioMarkers.map((marker) => [marker.id, marker.elevation]),
  )
  const durationById = Object.fromEntries(
    audioMarkers.flatMap((marker) =>
      marker.durationSeconds != null ? [[marker.id, marker.durationSeconds] as const] : [],
    ),
  )
  const landsCache = loadNativeLandCache()
  const nativeLandKey = process.env.NATIVE_LAND_API_KEY
  const needsLandLookup =
    !options.skipLands &&
    rows.some((row) => cachedLands(landsCache, row.id, row.lng, row.lat) == null)
  if (needsLandLookup && !nativeLandKey) {
    throw new Error("NATIVE_LAND_API_KEY is required for territory lookup (or pass --skip-lands)")
  }

  if (!options.skipUpload && !options.dryRun) {
    console.warn(
      "Blob upload is fallback-only. Map playback serves Opus from public/audio/opus/. Prefer --skip-upload unless an MP3 fallback is missing.",
    )
  }

  if (!options.skipUpload && !options.dryRun && !blobToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for uploads (or pass --skip-upload)")
  }

  const enriched: EnrichedMarker[] = []
  const transcodeDir = mkdtempSync(join(tmpdir(), "pct-audio-"))
  let landsCacheDirty = false

  try {
    for (const row of rows) {
      const localPath = row.filename ? join(options.audioDir, row.filename) : ""
      if (row.filename && !options.skipUpload && !existsSync(localPath)) {
        throw new Error(`Audio file not found: ${localPath}`)
      }

      let elevation = options.skipElevation ? elevationById[row.id] : undefined
      if (elevation == null) {
        if (!mapboxToken) {
          throw new Error(`No stored elevation for ${row.id}; MAPBOX_ACCESS_TOKEN is required`)
        }
        console.log(`Sampling elevation for ${row.id} (${row.name})…`)
        elevation = await sampleElevationFeet(row.lng, row.lat, mapboxToken)
      }

      const probedDuration =
        row.filename && existsSync(localPath) ? probeDurationSeconds(localPath) : null
      const durationSeconds = probedDuration ?? durationById[row.id]

      let lands = cachedLands(landsCache, row.id, row.lng, row.lat)
      if (!options.skipLands && lands == null) {
        if (!nativeLandKey) {
          throw new Error(`No stored territories for ${row.id}; NATIVE_LAND_API_KEY is required`)
        }
        console.log(`Looking up territories for ${row.id} (${row.name})…`)
        try {
          lands = await fetchTerritoriesAtPosition(row.lat, row.lng, nativeLandKey)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          throw new Error(`${row.id}: ${message}`)
        }
        landsCache[row.id] = { lng: row.lng, lat: row.lat, lands }
        landsCacheDirty = true
        await sleep(NATIVE_LAND_REQUEST_GAP_MS)
      }

      if (row.filename && !options.skipUpload && !options.dryRun) {
        const pathname = blobPathname(row.filename)
        let uploadPath = localPath
        if (needsTranscode(row.filename)) {
          uploadPath = join(transcodeDir, pathname.replaceAll("/", "_"))
          console.log(`Transcoding ${row.filename} → ${pathname}…`)
          transcodeToMp3(localPath, uploadPath)
        }
        const fileBuffer = readFileSync(uploadPath)
        console.log(`Uploading ${pathname} (${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)} MB)…`)
        await put(pathname, fileBuffer, {
          access: "public",
          token: blobToken,
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: BLOB_CACHE_MAX_AGE,
          contentType: audioContentType(pathname),
        })
        const leftover = sourceBlobPathname(row.filename)
        if (leftover) {
          console.log(`Deleting uncompressed ${leftover}…`)
          await del(leftover, { token: blobToken })
        }
      }

      enriched.push({
        ...row,
        elevation,
        audioUrl: row.filename ? publicAudioUrl(row.filename) : "",
        durationSeconds: durationSeconds ?? undefined,
        lands: lands ?? undefined,
      })
    }
  } finally {
    rmSync(transcodeDir, { recursive: true, force: true })
    if (landsCacheDirty && !options.dryRun) {
      writeFileSync(NATIVE_LAND_CACHE_PATH, `${JSON.stringify(landsCache, null, 2)}\n`)
    }
  }

  const trail = JSON.parse(readFileSync(join(process.cwd(), "public/pct-trail.geojson"), "utf8"))
  const trailFeature = trail?.type === "FeatureCollection" ? trail.features?.[0] : trail
  const trailCoordinates = trailFeature?.geometry?.coordinates as [number, number][]
  if (!trailCoordinates?.length) {
    throw new Error("Trail GeoJSON is missing LineString coordinates")
  }
  const markerMiles = computeMarkerMiles(
    trailCoordinates,
    enriched.map((marker) => ({ id: marker.id, lng: marker.lng, lat: marker.lat })),
  )

  if (options.dryRun) {
    console.log("\nDry run complete:")
    for (const marker of enriched) {
      console.log(
        `  ${marker.id}: ${marker.name} @ ${marker.elevation} ft, mile ${markerMiles[marker.id]}, ${marker.lands?.map((land) => land.name).join(", ") || "no territory"}, ${marker.audioUrl}`,
      )
    }
    return
  }

  const markersTs = formatAudioMarkersTs(enriched)
  const milesTs = formatMarkerMilesTs(markerMiles)

  writeFileSync(join(process.cwd(), "data/audio-markers.ts"), markersTs)
  writeFileSync(join(process.cwd(), "lib/marker-miles.ts"), milesTs)

  console.log(`\nWrote data/audio-markers.ts (${enriched.length} markers)`)
  console.log("Wrote lib/marker-miles.ts")
  console.log(
    options.skipUpload
      ? "Skipped Blob upload (--skip-upload)"
      : "Uploaded audio files to Vercel Blob",
  )
}

function loadNativeLandCache(): NativeLandCache {
  if (!existsSync(NATIVE_LAND_CACHE_PATH)) return {}
  const parsed = JSON.parse(readFileSync(NATIVE_LAND_CACHE_PATH, "utf8")) as NativeLandCache
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
  return parsed
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
