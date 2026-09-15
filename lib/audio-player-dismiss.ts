type CardLike = {
  contains: (node: never) => boolean
}

type ChromeLike = {
  closest?: (selector: string) => unknown
  parentElement?: ChromeLike | null
}

export const AUDIO_FOCUS_CHROME_SELECTOR = "[data-keep-audio-focus]"

/** True when the pointer landed outside the active audio card (same as pressing X). */
export function isOutsideAudioCard(
  target: EventTarget | object | null,
  card: CardLike | null,
) {
  if (!card) return false
  if (target == null) return true
  return !card.contains(target as never)
}

function isAudioFocusChrome(target: EventTarget | object | null) {
  if (target == null || typeof target !== "object") return false
  let node: ChromeLike | null = target as ChromeLike
  while (node) {
    if (typeof node.closest === "function") {
      return node.closest(AUDIO_FOCUS_CHROME_SELECTOR) != null
    }
    node = node.parentElement ?? null
  }
  return false
}

/** Map chrome (mute, hamburger) sits outside the card but must not punch out. */
export function shouldDismissAudioCard(
  target: EventTarget | object | null,
  card: CardLike | null,
) {
  if (!isOutsideAudioCard(target, card)) return false
  if (isAudioFocusChrome(target)) return false
  return true
}
