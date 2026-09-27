import assert from "node:assert/strict"
import test from "node:test"
import { classifyTimeOfDay, formatMonthDay } from "../lib/time-of-day.ts"

test("classifyTimeOfDay follows the dawn-to-night ranges", () => {
  assert.equal(classifyTimeOfDay("4:00 AM"), "night")
  assert.equal(classifyTimeOfDay("4:01 AM"), "dawn")
  assert.equal(classifyTimeOfDay("6:44 AM"), "dawn")
  assert.equal(classifyTimeOfDay("7:00 AM"), "dawn")
  assert.equal(classifyTimeOfDay("7:01 AM"), "morning")
  assert.equal(classifyTimeOfDay("7:56 AM"), "morning")
  assert.equal(classifyTimeOfDay("10:30 AM"), "morning")
  assert.equal(classifyTimeOfDay("10:31 AM"), "midday")
  assert.equal(classifyTimeOfDay("12:30 PM"), "midday")
  assert.equal(classifyTimeOfDay("1:30 PM"), "midday")
  assert.equal(classifyTimeOfDay("1:31 PM"), "afternoon")
  assert.equal(classifyTimeOfDay("4:25 PM"), "afternoon")
  assert.equal(classifyTimeOfDay("4:30 PM"), "afternoon")
  assert.equal(classifyTimeOfDay("4:31 PM"), "evening")
  assert.equal(classifyTimeOfDay("5:12 PM"), "evening")
  assert.equal(classifyTimeOfDay("7:00 PM"), "evening")
  assert.equal(classifyTimeOfDay("7:01 PM"), "dusk")
  assert.equal(classifyTimeOfDay("7:45 PM"), "dusk")
  assert.equal(classifyTimeOfDay("9:00 PM"), "dusk")
  assert.equal(classifyTimeOfDay("9:01 PM"), "night")
  assert.equal(classifyTimeOfDay("9:20 PM"), "night")
  assert.equal(classifyTimeOfDay("3:11 AM"), "night")
})

test("formatMonthDay drops the year", () => {
  assert.equal(formatMonthDay("June 8, 2025"), "June 8")
  assert.equal(formatMonthDay("April 15, 2024"), "April 15")
  assert.equal(formatMonthDay("July 5 2025"), "July 5")
})
