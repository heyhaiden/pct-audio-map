import { test } from "node:test"
import assert from "node:assert/strict"
import { isoDate, isoDuration, libraryJsonLd } from "../lib/library-structured-data"
import { buildAudioLibraryFolders } from "../lib/audio-library-folders"

test("isoDate parses the marker date labels without timezone drift", () => {
  assert.equal(isoDate("March 31, 2025"), "2025-03-31")
  assert.equal(isoDate("April 5, 2025"), "2025-04-05")
  assert.equal(isoDate("sometime in spring"), undefined)
  assert.equal(isoDate(undefined), undefined)
})

test("isoDuration formats whole seconds as ISO 8601", () => {
  assert.equal(isoDuration(14), "PT14S")
  assert.equal(isoDuration(65), "PT1M5S")
  assert.equal(isoDuration(120), "PT2M")
  assert.equal(isoDuration(0), undefined)
  assert.equal(isoDuration(undefined), undefined)
})

test("library JSON-LD lists one AudioObject per playable recording", () => {
  const folders = buildAudioLibraryFolders()
  const playable = folders.flatMap((folder) => folder.markers.filter((m) => m.audioUrl))
  const data = libraryJsonLd(folders, "desc")
  assert.equal(data.mainEntity.numberOfItems, playable.length)

  const first = data.mainEntity.itemListElement[0].item
  assert.equal(first["@type"], "AudioObject")
  assert.equal(first.dateCreated, "2025-03-31")
  assert.equal(first.contentLocation.geo.latitude, playable[0].coordinates[1])
  assert.match(first.contentUrl ?? "", /\/audio\/opus\/1-1\.opus/)
})
