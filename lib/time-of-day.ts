export type TimeOfDay =
  | "dawn"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "dusk"
  | "night"

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  dawn: "Dawn",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
  dusk: "Dusk",
  night: "Night",
}

/** Minutes from midnight, or null if the clock string is not parseable. */
function minutesFromClock(value: string): number | null {
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
 * Recording clock → card period. Bounds are inclusive of the printed end
 * and exclusive of the next period's start (7:00am is dawn, 7:01am is morning).
 *
 * Dawn 4:01am–7:00am, morning –10:30am, midday –1:30pm, afternoon –4:30pm,
 * evening –7:00pm, dusk –9:00pm, night 9:01pm–4:00am.
 */
export function classifyTimeOfDay(value: string): TimeOfDay | null {
  const minutes = minutesFromClock(value)
  if (minutes == null) return null
  if (minutes >= 21 * 60 + 1 || minutes <= 4 * 60) return "night"
  if (minutes <= 7 * 60) return "dawn"
  if (minutes <= 10 * 60 + 30) return "morning"
  if (minutes <= 13 * 60 + 30) return "midday"
  if (minutes <= 16 * 60 + 30) return "afternoon"
  if (minutes <= 19 * 60) return "evening"
  return "dusk"
}

/** "June 8, 2025" / "April 15 2024" → "June 8" / "April 15". */
export function formatMonthDay(date: string): string {
  return date.replace(/,?\s*\d{4}\s*$/, "").trim()
}
