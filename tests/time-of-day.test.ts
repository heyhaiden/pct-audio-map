import assert from "node:assert/strict"
import test from "node:test"
import { classifyTimeOfDay, formatMonthDay } from "../lib/time-of-day.ts"

test("classifyTimeOfDay buckets sunrise, day, dusk, and night", () => {
  assert.equal(classifyTimeOfDay("6:44 AM"), "sunrise")
  assert.equal(classifyTimeOfDay("7:56 AM"), "sunrise")
  assert.equal(classifyTimeOfDay("8:17 AM"), "day")
  assert.equal(classifyTimeOfDay("12:30 PM"), "day")
  assert.equal(classifyTimeOfDay("4:25 PM"), "day")
  assert.equal(classifyTimeOfDay("5:12 PM"), "dusk")
  assert.equal(classifyTimeOfDay("7:45 PM"), "dusk")
  assert.equal(classifyTimeOfDay("9:20 PM"), "night")
  assert.equal(classifyTimeOfDay("3:11 AM"), "night")
})

test("formatMonthDay drops the year", () => {
  assert.equal(formatMonthDay("June 8, 2025"), "June 8")
  assert.equal(formatMonthDay("April 15, 2024"), "April 15")
  assert.equal(formatMonthDay("July 5 2025"), "July 5")
})
