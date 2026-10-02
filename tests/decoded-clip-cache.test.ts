import assert from "node:assert/strict"
import test from "node:test"
import { nextDecodedIds } from "../lib/decoded-clip-cache.ts"

test("nextDecodedIds keeps pinned clips and evicts the oldest extras", () => {
  const kept = nextDecodedIds({
    decoded: ["1-1", "1-2", "1-3", "1-4"],
    pinned: ["1-3", "1-4", "1-5"],
    max: 3,
  })
  assert.deepEqual(kept, ["1-2", "1-3", "1-4"])
})

test("nextDecodedIds never drops a pinned clip even if over max", () => {
  const kept = nextDecodedIds({
    decoded: ["1-1", "1-2"],
    pinned: ["1-1", "1-2", "1-3"],
    max: 3,
  })
  assert.deepEqual(kept, ["1-1", "1-2"])
})
