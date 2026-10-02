import assert from "node:assert/strict"
import test from "node:test"
import * as libraryFolders from "../lib/audio-library-folders.ts"

test("library folders follow the map chapter mile ranges", () => {
  const buildFolders = (
    libraryFolders as typeof libraryFolders & {
      buildAudioLibraryFolders: () => Array<{
        id: string
        title: string
        markers: Array<{ id: string }>
      }>
    }
  ).buildAudioLibraryFolders

  assert.equal(typeof buildFolders, "function")

  const folders = buildFolders()
  const southernCalifornia = folders.find(({ id }) => id === "southern-california")
  const northernCalifornia = folders.find(({ id }) => id === "northern-california")
  const oregon = folders.find(({ id }) => id === "oregon-cascades")

  assert.ok(southernCalifornia?.markers.some(({ id }) => id === "marker-73"))
  assert.equal(northernCalifornia?.title, "Northern California")
  assert.ok(northernCalifornia?.markers.some(({ id }) => id === "marker-124"))
  assert.ok(!oregon?.markers.some(({ id }) => id === "marker-124"))
  assert.ok(oregon?.markers.some(({ id }) => id === "marker-126"))
})
