import assert from "node:assert/strict"
import test from "node:test"
import { orphanedDecks } from "../lib/trail-loop-decks.ts"

test("orphanedDecks keeps the incoming and outgoing fade pair", () => {
  const [a, b, leak] = [{ id: "a" }, { id: "b" }, { id: "leak" }]
  assert.deepEqual(orphanedDecks([a, b, leak], [a, b]), [leak])
})

test("orphanedDecks treats a close fade as only the active deck", () => {
  const [active, leftover] = [{ id: "active" }, { id: "leftover" }]
  assert.deepEqual(orphanedDecks([active, leftover], [active]), [leftover])
})
