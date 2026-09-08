import assert from "node:assert/strict"
import test from "node:test"
import { adjacentPlayable } from "../lib/marker-navigation.ts"
import type { AudioMarker } from "../types/map.ts"

const chapters = new Set(["southern-california", "sierra-nevada", "northern-california"])

function marker(
  id: string,
  chapter: string,
  audioUrl = "",
): AudioMarker {
  return {
    id,
    name: id,
    coordinates: [0, 0],
    elevation: 0,
    audioUrl,
    chapter,
    featured: false,
  }
}

test("arrows skip markers that do not have audio yet", () => {
  const markers = [
    marker("campo", "southern-california", "/audio/campo.mp3"),
    marker("silent-sierra", "sierra-nevada"),
    marker("hat-creek", "northern-california", "/audio/3-1.wav"),
  ]

  const fromCampo = adjacentPlayable(markers, chapters, "campo")
  assert.equal(fromCampo.previous, null)
  assert.equal(fromCampo.next?.id, "hat-creek")

  const fromSilent = adjacentPlayable(markers, chapters, "silent-sierra")
  assert.equal(fromSilent.previous?.id, "campo")
  assert.equal(fromSilent.next?.id, "hat-creek")
})
