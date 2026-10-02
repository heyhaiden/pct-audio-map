export function nextDecodedIds(options: {
  decoded: readonly string[]
  pinned: readonly string[]
  max: number
}): string[] {
  const pinned = new Set(options.pinned)
  const kept = [...options.decoded]

  for (let index = 0; index < kept.length && kept.length > options.max; ) {
    if (!pinned.has(kept[index])) {
      kept.splice(index, 1)
      continue
    }
    index += 1
  }

  if (kept.length > options.max) {
    return kept.slice(kept.length - options.max)
  }

  return kept
}
