type NodeLike = object

type CardLike = {
  contains: (node: NodeLike) => boolean
}

/** True when the pointer landed outside the active audio card (same as pressing X). */
export function isOutsideAudioCard(target: NodeLike | null, card: CardLike | null) {
  if (!card) return false
  if (target == null) return true
  return !card.contains(target)
}
