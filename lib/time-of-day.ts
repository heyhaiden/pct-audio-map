export type TimeOfDay = "sunrise" | "day" | "dusk" | "night"

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  sunrise: "Sunrise",
  day: "Day",
  dusk: "Dusk",
  night: "Night",
}

/** Minutes from midnight, or null if the clock string is not parseable. */
export function minutesFromClock(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null

  let hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 12 || minutes > 59) {
    return null
  }

  if (hours === 12) hours = 0
  if (match[3].toUpperCase() === "PM") hours += 12
  return hours * 60 + minutes
}

/**
 * Trail-side buckets: sunrise 5–8am, day until 5pm, dusk until 8:30pm, else night.
 */
export function classifyTimeOfDay(value: string): TimeOfDay | null {
  const minutes = minutesFromClock(value)
  if (minutes == null) return null
  if (minutes >= 5 * 60 && minutes < 8 * 60) return "sunrise"
  if (minutes >= 8 * 60 && minutes < 17 * 60) return "day"
  if (minutes >= 17 * 60 && minutes < 20 * 60 + 30) return "dusk"
  return "night"
}

/** "June 8, 2025" / "April 15 2024" → "June 8" / "April 15". */
export function formatMonthDay(date: string): string {
  return date.replace(/,?\s*\d{4}\s*$/, "").trim()
}
