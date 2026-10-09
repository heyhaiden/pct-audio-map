import assert from "node:assert/strict"
import test from "node:test"
import { nativeLandHref, visibleHomelands } from "../lib/native-land-href.ts"

test("nativeLandHref points at the Native Land territory page", () => {
  assert.equal(nativeLandHref("kumeyaay"), "https://native-land.ca/maps/territories/kumeyaay")
})

test("nativeLandHref encodes slugs with reserved characters", () => {
  assert.equal(
    nativeLandHref("coquille-umpqua-chetco-tolowa-tututni"),
    "https://native-land.ca/maps/territories/coquille-umpqua-chetco-tolowa-tututni",
  )
})

test("visibleHomelands keeps at most three territories", () => {
  const lands = ["a", "b", "c", "d", "e"]
  assert.deepEqual(visibleHomelands(lands), ["a", "b", "c"])
  assert.deepEqual(visibleHomelands(["a", "b"]), ["a", "b"])
  assert.deepEqual(visibleHomelands(undefined), [])
})
