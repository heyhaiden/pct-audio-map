import assert from "node:assert/strict"
import test from "node:test"
import { formatTimecode } from "../lib/format-timecode.ts"

test("timecodes are M:SS with a zero-padded second", () => {
  assert.equal(formatTimecode(0), "0:00")
  assert.equal(formatTimecode(9), "0:09")
  assert.equal(formatTimecode(65), "1:05")
  assert.equal(formatTimecode(3599), "59:59")
})

test("hours appear only past 60 minutes", () => {
  assert.equal(formatTimecode(3600), "1:00:00")
  assert.equal(formatTimecode(3661), "1:01:01")
})

test("invalid values collapse to 0:00", () => {
  assert.equal(formatTimecode(Number.NaN), "0:00")
  assert.equal(formatTimecode(-4), "0:00")
})
