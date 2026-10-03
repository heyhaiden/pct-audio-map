import assert from "node:assert/strict"
import test from "node:test"
import {
  collapsedLibraryNote,
  libraryNoteNeedsExpand,
  previewDescription,
} from "../lib/preview-description.ts"

const long =
  "Power lines buzz overhead as I make my way out of Campo, rain drizzling nonstop for hours. It's dreary, and I don't see another soul almost the entire day. So it begins."

test("previewDescription keeps short copy intact", () => {
  assert.deepEqual(previewDescription("A waterfall cascades down granite boulders."), {
    preview: "A waterfall cascades down granite boulders.",
    truncated: false,
  })
})

test("previewDescription cuts on a word boundary", () => {
  const { preview, truncated } = previewDescription(long, 80)
  assert.equal(truncated, true)
  assert.match(preview, /\u2026$/)
  assert.equal(preview.includes("So it begins"), false)
  const cut = preview.slice(0, -1)
  assert.equal(long.startsWith(cut), true)
  assert.equal(cut.endsWith(" "), false)
})

test("collapsedLibraryNote adds an ellipsis when homelands are waiting", () => {
  assert.equal(
    collapsedLibraryNote("Young willow trees grow all along the water's edge.", { revealMore: true }),
    "Young willow trees grow all along the water's edge.\u2026",
  )
})

test("libraryNoteNeedsExpand is true for leftover copy or homelands", () => {
  assert.equal(libraryNoteNeedsExpand({ description: "Short." }), false)
  assert.equal(libraryNoteNeedsExpand({ description: long }), true)
  assert.equal(libraryNoteNeedsExpand({ description: "Short.", lands: [{ name: "Kumeyaay" }] }), true)
})
