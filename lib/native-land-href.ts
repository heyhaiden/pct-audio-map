/** Territory page on Native Land Digital. Names in the UI should keep source casing. */
export function nativeLandHref(slug: string) {
  return `https://native-land.ca/maps/territories/${encodeURIComponent(slug)}`
}

/** Library cards keep a short row; Native Land can return many overlapping polygons. */
export const HOMELAND_PILL_LIMIT = 3

export function visibleHomelands<T>(lands: readonly T[] | undefined, limit = HOMELAND_PILL_LIMIT): T[] {
  return lands?.slice(0, limit) ?? []
}
