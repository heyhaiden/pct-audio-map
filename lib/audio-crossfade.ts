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

/** Ease-out ramp between two volumes. Used for play and pause fades. */
export function rampVolume(progress: number, from: number, to: number): number {
  const clamped = Math.max(0, Math.min(1, progress))
  const curved = Math.sin((clamped * Math.PI) / 2)
  return from + (to - from) * curved
}

/** Volume through the last `fadeMs` of a recording. Null until that window. */
export function endingFadeVolume(
  currentTime: number,
  duration: number,
  fadeMs: number,
): number | null {
  if (!(duration > 0) || !(fadeMs > 0)) return null
  const remainingMs = (duration - currentTime) * 1000
  if (remainingMs > fadeMs) return null
  const progress = 1 - Math.max(0, remainingMs) / fadeMs
  return fadeOutVolume(progress, 1)
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
