/** Equal-power crossfade curve for two decks (0 → 1 progress). */
export function crossfadeVolumes(
  progress: number,
  targetVolume: number,
  outgoingStartVolume: number,
): { incoming: number; outgoing: number } {
  const clamped = Math.max(0, Math.min(1, progress))
  const angle = (clamped * Math.PI) / 2
  return {
    incoming: targetVolume * Math.sin(angle),
    outgoing: outgoingStartVolume * Math.cos(angle),
  }
}

export function fadeOutVolume(progress: number, startVolume: number): number {
  const clamped = Math.max(0, Math.min(1, progress))
  return startVolume * Math.cos((clamped * Math.PI) / 2)
}

export function isPlayAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

/** Deck that should duck during a crossfade — whichever is audible right now. */
export function resolveOutgoingDeck(
  decks: readonly [HTMLAudioElement | null, HTMLAudioElement | null],
  activeIndex: number,
  fallbackVolume: number,
): { index: number; deck: HTMLAudioElement | null; startVolume: number } {
  for (const index of [0, 1] as const) {
    const deck = decks[index]
    if (!deck?.src || deck.paused || deck.volume <= 0.001) continue
    return { index, deck, startVolume: deck.volume }
  }

  const deck = decks[activeIndex]
  const startVolume =
    deck && deck.src && !deck.paused ? deck.volume : deck?.src ? fallbackVolume : 0

  return { index: activeIndex, deck, startVolume }
}
