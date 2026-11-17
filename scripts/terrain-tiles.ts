#!/usr/bin/env node
/**
 * Lists the Terrarium elevation tiles that cover a band around the trail, and
 * optionally downloads them to a git-ignored local folder.
 *
 *   node --import tsx scripts/terrain-tiles.ts              # count per zoom
 *   node --import tsx scripts/terrain-tiles.ts --sizes      # + sizes from HEAD requests
 *   node --import tsx scripts/terrain-tiles.ts --download   # fetch into .terrain-tiles/
 *
 * Source: AWS Terrain Tiles, the public `elevation-tiles-prod` bucket. Nothing
 * here uploads anywhere; where the tiles are hosted is a separate decision.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import {
  SELF_HOSTED_DEM_END_MILES,
  SELF_HOSTED_DEM_ZOOM_BUFFERS_KM,
} from "../lib/self-hosted-terrain.ts"
import { terrainTileCover, tileUrl, type TileId } from "./lib/terrain-tile-cover.ts"

const SOURCE_TEMPLATE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
const DEFAULT_OUT_DIR = ".terrain-tiles"

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const option = (name: string, fallback: string) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

const outDir = join(process.cwd(), option("out", DEFAULT_OUT_DIR))
const concurrency = Math.max(1, Number(option("concurrency", "24")))

const trail = JSON.parse(readFileSync(join(process.cwd(), "public/pct-trail.geojson"), "utf8"))
const coordinates: number[][] = (trail.features?.[0]?.geometry ?? trail.geometry).coordinates

const tiles = terrainTileCover(coordinates, {
  endMiles: SELF_HOSTED_DEM_END_MILES,
  zoomBuffersKm: SELF_HOSTED_DEM_ZOOM_BUFFERS_KM,
})

const tilePath = ({ z, x, y }: TileId) => join(outDir, String(z), String(x), `${y}.png`)

async function inParallel<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) await worker(items[next++])
    }),
  )
}

async function withRetry<T>(run: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt))
    }
  }
  throw lastError
}

/** Bytes per tile, keyed by "z/x/y". Missing means the tile could not be read. */
const sizes = new Map<string, number>()
const failures: string[] = []
const keyOf = ({ z, x, y }: TileId) => `${z}/${x}/${y}`

async function main() {
  if (flag("download")) {
    let done = 0
    await inParallel(tiles, async (tile) => {
      const path = tilePath(tile)
      try {
        if (!existsSync(path)) {
          const bytes = await withRetry(async () => {
            const response = await fetch(tileUrl(SOURCE_TEMPLATE, tile))
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return Buffer.from(await response.arrayBuffer())
          })
          mkdirSync(dirname(path), { recursive: true })
          writeFileSync(path, bytes)
        }
        sizes.set(keyOf(tile), statSync(path).size)
      } catch (error) {
        failures.push(`${keyOf(tile)}: ${String(error)}`)
      }
      if (++done % 250 === 0) console.error(`  ${done} / ${tiles.length}`)
    })
  } else if (flag("sizes")) {
    await inParallel(tiles, async (tile) => {
      try {
        const length = await withRetry(async () => {
          const response = await fetch(tileUrl(SOURCE_TEMPLATE, tile), { method: "HEAD" })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return Number(response.headers.get("content-length") ?? 0)
        })
        sizes.set(keyOf(tile), length)
      } catch (error) {
        failures.push(`${keyOf(tile)}: ${String(error)}`)
      }
    })
  } else {
    for (const tile of tiles) {
      const path = tilePath(tile)
      if (existsSync(path)) sizes.set(keyOf(tile), statSync(path).size)
    }
  }

  const megabytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)
  const haveSizes = sizes.size > 0
  console.log(`Trail strip, mile 0 to ${SELF_HOSTED_DEM_END_MILES}, Terrarium 256 px tiles`)
  console.log(haveSizes ? "zoom  buffer km   tiles   sized      MB" : "zoom  buffer km   tiles")
  let totalBytes = 0
  let totalSized = 0
  for (const [zoom, bufferKm] of SELF_HOSTED_DEM_ZOOM_BUFFERS_KM) {
    const atZoom = tiles.filter((tile) => tile.z === zoom)
    const sized = atZoom.filter((tile) => sizes.has(keyOf(tile)))
    const bytes = sized.reduce((sum, tile) => sum + (sizes.get(keyOf(tile)) ?? 0), 0)
    totalBytes += bytes
    totalSized += sized.length
    const row = `${String(zoom).padStart(4)}  ${String(bufferKm).padStart(9)}  ${String(atZoom.length).padStart(6)}`
    console.log(haveSizes ? `${row}  ${String(sized.length).padStart(6)}  ${megabytes(bytes).padStart(6)}` : row)
  }
  console.log(
    haveSizes
      ? `total            ${String(tiles.length).padStart(6)}  ${String(totalSized).padStart(6)}  ${megabytes(totalBytes).padStart(6)}`
      : `total            ${String(tiles.length).padStart(6)}`,
  )
  if (flag("download")) console.log(`Tiles are in ${outDir}`)
  if (!haveSizes) console.log("Run with --sizes for byte counts, or --download to fetch the tiles.")
  if (failures.length > 0) {
    console.error(`${failures.length} tile(s) failed:`)
    for (const failure of failures.slice(0, 20)) console.error(`  ${failure}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
