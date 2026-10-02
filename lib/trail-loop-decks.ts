/** Decks that are still wired but are not part of the current fade. */
export function orphanedDecks<T>(live: readonly T[], keep: readonly T[]): T[] {
  const kept = new Set(keep.filter((deck): deck is T => deck != null))
  return live.filter((deck) => !kept.has(deck))
}
