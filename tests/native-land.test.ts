import assert from "node:assert/strict"
import test from "node:test"
import { cachedLands, parseNativeLandTerritories } from "../scripts/lib/native-land.ts"

const campoResponse = [
  {
    type: "Feature",
    properties: {
      Name: "Kumeyaay/Kumiais",
      Slug: "kumeyaay",
      description: "https://native-land.ca/maps/territories/kumeyaay",
    },
  },
  {
    type: "Feature",
    properties: {
      Name: "Cession 310",
      Slug: "cession-310",
      description: "https://native-land.ca/maps/treaties/cession-310",
    },
  },
  {
    type: "Feature",
    properties: {
      Name: "Kumeyaay/Kumiai-Tipai",
      Slug: "kumeyaay-2",
      description: "https://native-land.ca/maps/languages/kumeyaay-2",
    },
  },
]

test("parseNativeLandTerritories keeps territory polygons and drops languages and treaties", () => {
  assert.deepEqual(parseNativeLandTerritories(campoResponse), [
    { name: "Kumeyaay/Kumiais", slug: "kumeyaay" },
  ])
})

test("parseNativeLandTerritories keeps features that have no category URL", () => {
  assert.deepEqual(
    parseNativeLandTerritories([
      { properties: { Name: "Nüümü", Slug: "kawaiisu" } },
    ]),
    [{ name: "Nüümü", slug: "kawaiisu" }],
  )
})

test("cachedLands misses when the coordinate has moved", () => {
  const cache = {
    "marker-1": { lng: -116.47, lat: 32.6, lands: [{ name: "Kumeyaay/Kumiais", slug: "kumeyaay" }] },
  }
  assert.equal(cachedLands(cache, "marker-1", -116.47, 32.6)?.length, 1)
  assert.equal(cachedLands(cache, "marker-1", -116.5, 32.6), null)
})
