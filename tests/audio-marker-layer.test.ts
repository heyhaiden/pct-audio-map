import assert from "node:assert/strict"
import test from "node:test"
import { audioMarkers } from "../data/audio-markers.ts"
import * as markerLayer from "../lib/audio-marker-layer.ts"

test("chapterCollection places every spreadsheet marker, not only Campo", () => {
  const collection = markerLayer.chapterCollection()
  const ids = collection.features.map((feature) => feature.properties.id)

  assert.ok(ids.includes("marker-1"), "Campo stays on the map")
  assert.ok(ids.includes("marker-73"), "Owens Peak pin is present")
  assert.ok(ids.includes("marker-77"), "South Sierra pin is present")
  assert.ok(ids.includes("marker-111"), "Hat Creek Rim pin is present")
  assert.ok(ids.includes("marker-130"), "Sky Lakes pin is present")
  assert.equal(collection.features.length, audioMarkers.length)

  const southSierra = collection.features.find((feature) => feature.properties.id === "marker-77")
  assert.deepEqual(southSierra?.geometry.coordinates, [-118.156603, 36.400765])
})

test("the selected audio pin renders larger than the resting pins", () => {
  const iconSize = (
    markerLayer as typeof markerLayer & {
      markerIconSize: (activeMarkerId: string | null) => unknown
    }
  ).markerIconSize

  assert.equal(typeof iconSize, "function")
  assert.deepEqual(iconSize(null), 0.9)
  assert.deepEqual(iconSize("marker-77"), [
    "case",
    ["==", ["get", "id"], "marker-77"],
    1.7,
    0.9,
  ])
})

test("markerIconSizeSwap grows the next pin while the last pin shrinks", () => {
  assert.deepEqual(markerLayer.markerIconSizeSwap("marker-2", 1.3, "marker-1", 1.2), [
    "case",
    ["==", ["get", "id"], "marker-2"],
    1.3,
    ["==", ["get", "id"], "marker-1"],
    1.2,
    0.9,
  ])
})

test("easeMarkerSize eases out from rest to full", () => {
  assert.equal(markerLayer.easeMarkerSize(0), 0)
  assert.equal(markerLayer.easeMarkerSize(1), 1)
  assert.ok(markerLayer.easeMarkerSize(0.5) > 0.5)
})
