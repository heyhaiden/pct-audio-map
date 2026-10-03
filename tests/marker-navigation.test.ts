import assert from "node:assert/strict"
import test from "node:test"
import { CHAPTER_GATE_LANDING_MILES } from "../lib/chapter-scroll-gate.ts"
import { adjacentPlayable, canAdvanceToWip, chapterGateAfterMarker, nodeQueuedAfterChapterGate } from "../lib/marker-navigation.ts"
import { audioMarkers } from "../data/audio-markers.ts"
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

test("the last playable recording can advance to the WIP notice", () => {
  const markers = [
    marker("campo", "southern-california", "/audio/campo.mp3"),
    marker("hat-creek", "northern-california", "/audio/3-1.wav"),
  ]

  assert.equal(canAdvanceToWip(markers, chapters, "campo"), false)
  assert.equal(canAdvanceToWip(markers, chapters, "hat-creek"), true)
  assert.equal(canAdvanceToWip(markers, chapters, "missing"), false)
})

test("Christi's Spring is the last playable pin on the current trail", () => {
  const active = new Set([
    "southern-california",
    "sierra-nevada",
    "northern-california",
    "oregon-cascades",
  ])
  assert.equal(canAdvanceToWip(audioMarkers, active, "marker-129"), false)
  assert.equal(canAdvanceToWip(audioMarkers, active, "marker-130"), true)
})

test("Next on the last pin of a chapter lands on the next overlay", () => {
  const active = new Set([
    "southern-california",
    "sierra-nevada",
    "northern-california",
    "oregon-cascades",
  ])
  // Last SoCal recording — not Golden Trout, whose mile is still south of 703.
  assert.equal(chapterGateAfterMarker(audioMarkers, active, "marker-73"), 703 + CHAPTER_GATE_LANDING_MILES)
  assert.equal(chapterGateAfterMarker(audioMarkers, active, "marker-77"), null)
  assert.equal(chapterGateAfterMarker(audioMarkers, active, "marker-107"), 1158 + CHAPTER_GATE_LANDING_MILES)
  assert.equal(chapterGateAfterMarker(audioMarkers, active, "marker-123"), 1693 + CHAPTER_GATE_LANDING_MILES)
  assert.equal(chapterGateAfterMarker(audioMarkers, active, "marker-130"), null)
})

test("dismissing a gated overlay continues to the pin Next was heading toward", () => {
  const active = new Set([
    "southern-california",
    "sierra-nevada",
    "northern-california",
    "oregon-cascades",
  ])
  assert.equal(nodeQueuedAfterChapterGate(audioMarkers, active, "marker-73")?.id, "marker-77")
  assert.equal(nodeQueuedAfterChapterGate(audioMarkers, active, "marker-77"), null)
  assert.equal(nodeQueuedAfterChapterGate(audioMarkers, active, "marker-107")?.id, "marker-111")
  assert.equal(nodeQueuedAfterChapterGate(audioMarkers, active, "marker-123")?.id, "marker-124")
  assert.equal(nodeQueuedAfterChapterGate(audioMarkers, active, "marker-130"), null)
})
