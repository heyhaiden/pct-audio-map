#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, extname, basename } from "node:path"
import { put } from "@vercel/blob"
import { parseMarkerCsv } from "./lib/parse-csv.ts"
import { sampleElevationFeet } from "./lib/mapbox-terrain.ts"
import { computeMarkerMiles } from "./lib/compute-marker-miles.ts"
import {
  formatAudioMarkersTs,
  formatMarkerMilesTs,
  type EnrichedMarker,
} from "./lib/write-markers.ts"

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
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--dry-run") options.dryRun = true
    else if (arg === "--skip-upload") options.skipUpload = true
    else if (arg === "--csv") options.csv = argv[++i]
    else if (arg === "--audio-dir") options.audioDir = argv[++i]
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: pnpm ingest:audio [options]

Options:
  --csv <path>        CSV file (default: content/audio-markers.csv)
  --audio-dir <path>  Local audio folder (default: content/audio)
  --skip-upload       Regenerate marker files only
  --dry-run           Validate without uploads or file writes
`)
      process.exit(0)
    }
  }

  return options
}

function audioContentType(filename: string): string {
  const ext = extname(filename).toLowerCase()
  if (ext === ".mp3") return "audio/mpeg"
  if (ext === ".m4a" || ext === ".aac") return "audio/mp4"
  if (ext === ".wav") return "audio/wav"
  if (ext === ".ogg") return "audio/ogg"
  return "application/octet-stream"
}

function normalizeAudioUrl(filename: string): string {
  const base = basename(filename)
  return `/audio/${base}`
}

function blobPathname(filename: string): string {
  return `audio/${basename(filename)}`
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

  if (!mapboxToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN is required for elevation sampling")
  }

  if (!options.skipUpload && !options.dryRun && !blobToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for uploads (or pass --skip-upload)")
  }

  const enriched: EnrichedMarker[] = []

  for (const row of rows) {
    const localPath = row.filename ? join(options.audioDir, row.filename) : ""
    if (row.filename && !options.skipUpload && !existsSync(localPath)) {
      throw new Error(`Audio file not found: ${localPath}`)
    }

    console.log(`Sampling elevation for ${row.id} (${row.name})…`)
    const elevation = await sampleElevationFeet(row.lng, row.lat, mapboxToken)

    if (row.filename && !options.skipUpload && !options.dryRun) {
      const fileBuffer = readFileSync(localPath)
      const pathname = blobPathname(row.filename)
      console.log(`Uploading ${pathname}…`)
      await put(pathname, fileBuffer, {
        access: "public",
        token: blobToken,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: audioContentType(row.filename),
      })
    }

    enriched.push({
      ...row,
      elevation,
      audioUrl: row.filename ? normalizeAudioUrl(row.filename) : "",
    })
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
        `  ${marker.id}: ${marker.name} @ ${marker.elevation} ft, mile ${markerMiles[marker.id]}, ${marker.audioUrl}`,
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
