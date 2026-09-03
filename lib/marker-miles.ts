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
  "marker-2": 43,
  "marker-3": 44,
  "marker-4": 51,
  "marker-5": 57,
  "marker-6": 59,
  "marker-7": 60,
  "marker-8": 61,
  "marker-9": 62,
  "marker-10": 64,
  "marker-11": 66,
  "marker-12": 80,
  "marker-13": 85,
  "marker-14": 89,
  "marker-15": 90,
  "marker-16": 96,
  "marker-17": 97,
  "marker-18": 104,
  "marker-19": 119,
  "marker-20": 141,
  "marker-21": 161,
  "marker-22": 166,
  "marker-23": 173,
  "marker-24": 176,
  "marker-25": 194,
  "marker-26": 235,
  "marker-27": 248,
  "marker-28": 265,
  "marker-29": 269,
  "alpine-wind": 728,
  "mountain-streams": 802,
  "granite-echoes": 925,
  "forest-streams": 1315,
  "volcanic-winds": 1482,
  "bird-chorus": 1713,
  "lake-lapping": 1746,
  "forest-rain": 1845,
  "owl-calls": 2064,
  "glacier-melt": 2464,
  "rainforest-ambience": 2582,
  "mountain-silence": 2650,
}

export function getMarkerMile(markerId: string): number | null {
  return MARKER_MILES[markerId] ?? null
}
