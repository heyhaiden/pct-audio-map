import assert from "node:assert/strict"
import test from "node:test"
import { audioMarkers } from "../data/audio-markers.ts"
import { chapterCollection } from "../lib/audio-marker-layer.ts"

test("chapterCollection places every spreadsheet marker, not only Campo", () => {
  const collection = chapterCollection("southern-california")
  const ids = collection.features.map((feature) => feature.properties.id)

  assert.ok(ids.includes("marker-1"), "Campo stays on the map")
  assert.ok(ids.includes("marker-77"), "South Sierra pin is present")
  assert.ok(ids.includes("marker-111"), "Hat Creek Rim pin is present")
  assert.ok(ids.includes("marker-130"), "Sky Lakes pin is present")
  assert.equal(collection.features.length, audioMarkers.length)

  const southSierra = collection.features.find((feature) => feature.properties.id === "marker-77")
  assert.deepEqual(southSierra?.geometry.coordinates, [-118.156603, 36.400765])
})
