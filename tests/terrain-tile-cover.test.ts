import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { measureLine } from "../lib/camera-path.ts"
import {
  SELF_HOSTED_DEM_END_MILES,
  SELF_HOSTED_DEM_MAX_ZOOM,
  SELF_HOSTED_DEM_ZOOM_BUFFERS_KM,
} from "../lib/self-hosted-terrain.ts"
import { geoFractionForTrailMile } from "../lib/trail-mile-calibration.ts"
import {
  lngLatToTile,
  sampleTrail,
  terrainTileCover,
  tileBounds,
  tilesAroundPoints,
  tileUrl,
} from "../scripts/lib/terrain-tile-cover.ts"

const trail = JSON.parse(
  readFileSync(new URL("../public/pct-trail.geojson", import.meta.url), "utf8"),
)
const coordinates: number[][] = (trail.features?.[0]?.geometry ?? trail.geometry).coordinates
const keyOf = (tile: { z: number; x: number; y: number }) => `${tile.z}/${tile.x}/${tile.y}`

test("a point lands in the tile whose bounds contain it", () => {
  assert.deepEqual(lngLatToTile(0, 0, 1), { x: 1, y: 1 })
  assert.deepEqual(lngLatToTile(-180, 85, 0), { x: 0, y: 0 })

  for (const [lng, lat] of [coordinates[0], coordinates[4000], coordinates[9000]]) {
    for (const z of [3, 7, 11]) {
      const { x, y } = lngLatToTile(lng, lat, z)
      const [west, south, east, north] = tileBounds({ z, x, y })
      assert.ok(west <= lng && lng < east, `lng inside ${z}/${x}/${y}`)
      assert.ok(south < lat && lat <= north, `lat inside ${z}/${x}/${y}`)
    }
  }
})

test("tile indices stay inside the world at the poles and the antimeridian", () => {
  assert.deepEqual(lngLatToTile(179.9999, -89, 2), { x: 3, y: 3 })
  assert.deepEqual(lngLatToTile(-180, 89, 2), { x: 0, y: 0 })
})

test("trail samples run from the trailhead to the requested mile", () => {
  const line = measureLine(coordinates)
  const endKm = geoFractionForTrailMile(SELF_HOSTED_DEM_END_MILES) * line.totalKm
  const points = sampleTrail(coordinates, SELF_HOSTED_DEM_END_MILES, 2)

  assert.deepEqual(points[0], [coordinates[0][0], coordinates[0][1]])
  assert.deepEqual(points[points.length - 1], line.along(endKm))
  assert.equal(points.length, Math.ceil(endKm / 2) + 1)
  assert.deepEqual(sampleTrail([], 100, 2), [])
  assert.deepEqual(sampleTrail(coordinates, 100, 0), [])
})

test("a buffer of zero keeps only the tiles the points sit in", () => {
  const point: [number, number] = [-116.467, 32.5897]
  const { x, y } = lngLatToTile(point[0], point[1], 11)
  assert.deepEqual(tilesAroundPoints([point], 11, 0), [{ z: 11, x, y }])
})

test("a wider buffer keeps a superset, with no tile listed twice", () => {
  const points = sampleTrail(coordinates, 200, 2)
  const narrow = tilesAroundPoints(points, 10, 20)
  const wide = tilesAroundPoints(points, 10, 60)
  const wideKeys = new Set(wide.map(keyOf))

  assert.equal(wideKeys.size, wide.length)
  assert.ok(wide.length > narrow.length)
  for (const tile of narrow) assert.ok(wideKeys.has(keyOf(tile)))
})

test("the buffer reaches the stated distance either side of a point", () => {
  const point: [number, number] = [-119.5, 37.7]
  const tiles = tilesAroundPoints([point], 11, 45)
  const west = Math.min(...tiles.map((tile) => tileBounds(tile)[0]))
  const east = Math.max(...tiles.map((tile) => tileBounds(tile)[2]))
  const south = Math.min(...tiles.map((tile) => tileBounds(tile)[1]))
  const north = Math.max(...tiles.map((tile) => tileBounds(tile)[3]))
  const kmPerDegreeLng = 111.32 * Math.cos((point[1] * Math.PI) / 180)

  assert.ok((point[0] - west) * kmPerDegreeLng >= 45)
  assert.ok((east - point[0]) * kmPerDegreeLng >= 45)
  assert.ok((point[1] - south) * 110.574 >= 45)
  assert.ok((north - point[1]) * 110.574 >= 45)
})

test("the strip covers the trail at every zoom and stops at the content edge", () => {
  const tiles = terrainTileCover(coordinates, {
    endMiles: SELF_HOSTED_DEM_END_MILES,
    zoomBuffersKm: SELF_HOSTED_DEM_ZOOM_BUFFERS_KM,
  })
  const keys = new Set(tiles.map(keyOf))
  assert.equal(keys.size, tiles.length)

  for (const [lng, lat] of sampleTrail(coordinates, SELF_HOSTED_DEM_END_MILES, 5)) {
    for (const [z] of SELF_HOSTED_DEM_ZOOM_BUFFERS_KM) {
      const { x, y } = lngLatToTile(lng, lat, z)
      assert.ok(keys.has(`${z}/${x}/${y}`), `trail tile ${z}/${x}/${y}`)
    }
  }

  // The Canadian border is far past mile 1800: no deep tile for it.
  const terminus = coordinates[coordinates.length - 1]
  const end = lngLatToTile(terminus[0], terminus[1], SELF_HOSTED_DEM_MAX_ZOOM)
  assert.ok(!keys.has(`${SELF_HOSTED_DEM_MAX_ZOOM}/${end.x}/${end.y}`))
})

test("each shallower zoom keeps a band at least as wide as the one below it", () => {
  for (let i = 1; i < SELF_HOSTED_DEM_ZOOM_BUFFERS_KM.length; i++) {
    const [zoom, bufferKm] = SELF_HOSTED_DEM_ZOOM_BUFFERS_KM[i]
    const [shallowerZoom, shallowerBufferKm] = SELF_HOSTED_DEM_ZOOM_BUFFERS_KM[i - 1]
    assert.equal(zoom, shallowerZoom + 1)
    assert.ok(shallowerBufferKm >= bufferKm)
  }
})

test("a tile fills in the URL template", () => {
  assert.equal(
    tileUrl("https://tiles.example/{z}/{x}/{y}.png", { z: 9, x: 89, y: 206 }),
    "https://tiles.example/9/89/206.png",
  )
})
