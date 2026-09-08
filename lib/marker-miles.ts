/**
 * Trail mile for each recording, derived from `public/pct-trail.geojson`:
 * nearest trail vertex to the marker, cumulative great-circle distance to that
 * vertex, scaled so the full line reads 2,650 miles.
 *
 * Precomputed rather than measured at runtime — the library page would
 * otherwise have to load and walk 12,657 trail points just to print a number.
 * Regenerate if the trail geometry or marker coordinates change.
 */
export const MARKER_MILES: Record<string, number> = {
  "marker-1": 1,
  "marker-74": 694,
  "marker-77": 699,
  "marker-78": 706,
  "marker-80": 712,
  "marker-81": 723,
  "marker-82": 728,
  "marker-83": 740,
  "marker-87": 750,
  "marker-88": 750,
  "marker-89": 751,
  "marker-90": 757,
  "marker-91": 764,
  "marker-92": 764,
  "marker-93": 789,
  "marker-94": 825,
  "marker-95": 847,
  "marker-96": 865,
  "marker-97": 911,
  "marker-99": 923,
  "marker-100": 1002,
  "marker-101": 1008,
  "marker-102": 1017,
  "marker-103": 1017,
  "marker-104": 1069,
  "marker-105": 1100,
  "marker-106": 1106,
  "marker-107": 1110,
  "marker-111": 1375,
  "marker-112": 1393,
  "marker-113": 1406,
  "marker-114": 1408,
  "marker-115": 1438,
  "marker-116": 1439,
  "marker-117": 1444,
  "marker-120": 1505,
  "marker-123": 1527,
  "marker-124": 1679,
  "marker-126": 1693,
  "marker-128": 1757,
  "marker-129": 1770,
  "marker-130": 1777,
}

export function getMarkerMile(markerId: string): number | null {
  return MARKER_MILES[markerId] ?? null
}
