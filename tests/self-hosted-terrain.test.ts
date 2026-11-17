import assert from "node:assert/strict"
import test from "node:test"
import {
  MAPBOX_DEM_SOURCE,
  SELF_HOSTED_DEM_MAX_ZOOM,
  SELF_HOSTED_DEM_MIN_ZOOM,
  resolveTerrainDemSource,
} from "../lib/self-hosted-terrain.ts"

test("with the flag off the map adds today's Mapbox terrain source", () => {
  const today = {
    type: "raster-dem",
    url: "mapbox://mapbox.mapbox-terrain-dem-v1",
    tileSize: 512,
    maxzoom: 14,
  }
  assert.deepEqual(resolveTerrainDemSource(undefined), today)
  assert.deepEqual(resolveTerrainDemSource(""), today)
  assert.deepEqual(resolveTerrainDemSource("   "), today)
  assert.equal(resolveTerrainDemSource(undefined), MAPBOX_DEM_SOURCE)
})

test("a value that is not a tile template leaves the Mapbox source in place", () => {
  for (const value of ["true", "1", "http://localhost:3210/tiles", "localhost:3210/{z}/{x}/{y}.png", "/{z}/{x}.png"]) {
    assert.equal(resolveTerrainDemSource(value), MAPBOX_DEM_SOURCE, value)
  }
})

test("a tile template switches the source to Terrarium tiles", () => {
  const template = "http://localhost:3210/{z}/{x}/{y}.png"
  const source = resolveTerrainDemSource(` ${template} `)

  assert.notEqual(source, MAPBOX_DEM_SOURCE)
  assert.ok("tiles" in source)
  assert.deepEqual(source.tiles, [template])
  assert.equal(source.type, "raster-dem")
  assert.equal(source.encoding, "terrarium")
  assert.equal(source.tileSize, 256)
  assert.equal(source.minzoom, SELF_HOSTED_DEM_MIN_ZOOM)
  assert.equal(source.maxzoom, SELF_HOSTED_DEM_MAX_ZOOM)
  assert.match(source.attribution, /AWS Terrain Tiles/)
})

test("a same-origin path template is accepted", () => {
  const source = resolveTerrainDemSource("/terrain/{z}/{x}/{y}.png")
  assert.ok("tiles" in source)
})
