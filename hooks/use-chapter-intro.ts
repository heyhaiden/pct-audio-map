/**
 * Chapter intro cards fade by miles into the chapter, not a timer, so scroll
 * speed cannot distort them. Mobile and desktop pass different hold/fade windows.
 */
export function introOpacity(milesIn: number, hold: number, fade: number): number {
  if (milesIn <= hold) return 1
  if (milesIn <= hold + fade) return 1 - (milesIn - hold) / fade
  return 0
}
