#!/usr/bin/env node
/**
 * Local-only tile server for the self-hosted terrain prototype. Serves the
 * folder `scripts/terrain-tiles.ts --download` fills, with the permanent cache
 * headers a real host would send.
 *
 *   node scripts/serve-terrain-tiles.mjs [--port=3210] [--dir=.terrain-tiles] [--log-misses=<file>]
 *
 * Then build or run the app with
 *   NEXT_PUBLIC_SELF_HOSTED_DEM=http://localhost:3210/{z}/{x}/{y}.png
 */
import { appendFileSync, createReadStream, statSync } from "node:fs"
import http from "node:http"
import { join, resolve } from "node:path"

const option = (name, fallback) =>
  process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

const port = Number(option("port", "3210"))
const root = resolve(process.cwd(), option("dir", ".terrain-tiles"))
const missLog = option("log-misses", "")

let served = 0
let missed = 0

const server = http.createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*")
  const match = /^\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.png$/.exec((request.url ?? "").split("?")[0])
  if (!match || (request.method !== "GET" && request.method !== "HEAD")) {
    response.writeHead(match ? 405 : 404).end()
    return
  }

  const [, z, x, y] = match
  const path = join(root, z, x, `${y}.png`)
  let size
  try {
    size = statSync(path).size
  } catch {
    missed++
    if (missLog) appendFileSync(missLog, `${z}/${x}/${y}\n`)
    response.writeHead(404, { "Cache-Control": "no-store" }).end()
    return
  }

  served++
  response.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Length": size,
    "Cache-Control": "public, max-age=31536000, immutable",
  })
  if (request.method === "HEAD") response.end()
  else createReadStream(path).pipe(response)
})

server.listen(port, "127.0.0.1", () => {
  console.log(`Terrain tiles from ${root} on http://localhost:${port}/{z}/{x}/{y}.png`)
})

const stop = () => {
  console.log(`served ${served}, missing ${missed}`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 500).unref()
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
