import { CUSTOM_LABEL_NAMES } from "@/lib/trail-label-layer"

// Declutters labels that ship with the Studio style
// (heyhaiden/cmhrxqwyy004a01sd9ngkgljo). Done at runtime so the rule lives in
// the repo next to our own label layers.

const AIRPORT_LAYER_ID = "airport label"
const PEAK_LAYER_ID = "mountain peak labels"

// Base layers that can label the same place as one of our custom labels.
const DEDUPE_LAYER_IDS = [
  PEAK_LAYER_ID,
  "water label",
  "parks labels",
  "non-green POIs",
  "small city labels",
]

// Hides roughly the lowest 30% of named peaks near the trail. Sampled from
// Mapbox Streets v8 `natural_label` along the PCT: p30 ≈ 1,830 m. Peaks with no
// elevation stay visible.
export const MIN_PEAK_LABEL_ELEVATION_M = 1830

// Marks a filter we've already extended, so replays after `style.load` don't
// stack the same rule twice.
const APPLIED_MARKER = "__pct_base_label_filter__"

/** Idempotent; call on map load and again after any `style.load`. */
export function applyBaseLabelFilters(map: any): void {
  if (!map || map._removed) return

  if (map.getLayer(AIRPORT_LAYER_ID)) {
    map.setLayoutProperty(AIRPORT_LAYER_ID, "visibility", "none")
  }

  const notCustomName = [
    "!",
    ["in", ["coalesce", ["get", "name_en"], ["get", "name"]], ["literal", CUSTOM_LABEL_NAMES]],
  ]

  for (const layerId of DEDUPE_LAYER_IDS) {
    if (!map.getLayer(layerId)) continue
    const base = map.getFilter(layerId)
    if (JSON.stringify(base ?? []).includes(APPLIED_MARKER)) continue

    // A non-empty string is truthy, so this clause only tags the filter.
    const rules: unknown[] = [["to-boolean", APPLIED_MARKER], notCustomName]
    if (layerId === PEAK_LAYER_ID) {
      rules.push([">=", ["coalesce", ["get", "elevation_m"], 99999], MIN_PEAK_LABEL_ELEVATION_M])
    }
    map.setFilter(layerId, ["all", ...(base ? [base] : []), ...rules])
  }
}
