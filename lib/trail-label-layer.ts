import { trailLabels } from "@/data/trail-labels"

// Paint/layout values are copied from the Studio style
// (heyhaiden/cmhrxqwyy004a01sd9ngkgljo) so custom labels match the base map.
// Kind → Studio layer mapping follows Anna's Figma label-style board:
//   town → "small city labels"      poi      → "non-green POIs" (marker icon)
//   mountain → "mountain peak labels" tree   → "parks labels" (park icon)
//   water → "water label"           road/pass → "airport label"

export const TRAIL_LABEL_SOURCE_ID = "trail-labels"
const ROAD_LAYER_ID = "trail-labels-road"
const WATER_LAYER_ID = "trail-labels-water"
const POI_LAYER_ID = "trail-labels-poi"
const TREE_LAYER_ID = "trail-labels-tree"
const MOUNTAIN_LAYER_ID = "trail-labels-mountain"
const TOWN_LAYER_ID = "trail-labels-town"

/** Every name our custom labels cover, so the base map can skip its own copy. */
export const CUSTOM_LABEL_NAMES: string[] = Array.from(
  new Set(trailLabels.flatMap((label) => [label.name, ...(label.baseMapAliases ?? [])])),
)

function labelCollection() {
  return {
    type: "FeatureCollection" as const,
    features: trailLabels.map((label) => ({
      type: "Feature" as const,
      properties: {
        name: label.name,
        kind: label.kind,
        // Lower sorts win collisions; "ok to leave out if too busy" rows go last.
        sortKey: label.optional ? 1 : 0,
      },
      geometry: { type: "Point" as const, coordinates: label.coordinates },
    })),
  }
}

const kindFilter = (...kinds: string[]) => ["match", ["get", "kind"], kinds, true, false]

const sizedIcon = (icon: string) => ["step", ["zoom"], `${icon}-11`, 14, `${icon}-15`]

const iconLabelLayout = {
  "text-field": ["get", "name"],
  "text-offset": [0, 0.65],
  "text-anchor": "top",
  "text-rotation-alignment": "viewport",
  "symbol-sort-key": ["get", "sortKey"],
}

function layerSpecs() {
  return [
    {
      id: ROAD_LAYER_ID,
      filter: kindFilter("road", "pass"),
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Overpass Bold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["exponential", 1.2], ["zoom"], 6, 9, 8, 10, 12, 11],
        "text-max-width": 8,
        "symbol-sort-key": ["get", "sortKey"],
      },
      paint: {
        "text-color": "hsl(203, 14%, 35%)",
        "text-halo-width": ["interpolate", ["linear"], ["zoom"], 10, 0.75, 16, 1.25],
        "text-halo-color": "hsl(213, 20%, 98%)",
        "text-halo-blur": 0.4,
        "text-opacity": 0.75,
      },
    },
    {
      id: WATER_LAYER_ID,
      filter: kindFilter("water"),
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Alegreya Italic", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 7, 10, 10, 12, 16, 18],
        "text-transform": "lowercase",
        "text-max-width": 6,
        "symbol-sort-key": ["get", "sortKey"],
      },
      paint: {
        "text-color": "hsl(208, 65%, 33%)",
        "text-halo-width": 1,
        "text-halo-color": "hsl(213, 20%, 98%)",
        "text-halo-blur": 0.4,
      },
    },
    {
      id: POI_LAYER_ID,
      filter: kindFilter("poi"),
      layout: {
        ...iconLabelLayout,
        "text-font": ["Alegreya Bold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["exponential", 1.2], ["zoom"], 6, 9, 8, 10, 12, 11],
        "text-line-height": 0.9,
        "text-max-width": 8,
        "icon-image": sizedIcon("marker"),
      },
      paint: {
        "text-color": "hsl(203, 14%, 35%)",
        "text-opacity": 0.9,
        "text-halo-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14,
          "hsla(69, 9%, 88%, 0.88)",
          18,
          "hsla(0, 0%, 100%, 0.88)",
        ],
        "text-halo-blur": 0.25,
        "text-halo-width": ["interpolate", ["linear"], ["zoom"], 10, 0.75, 22, 1.5],
      },
    },
    {
      id: TREE_LAYER_ID,
      filter: kindFilter("tree"),
      layout: {
        ...iconLabelLayout,
        "text-font": ["Alegreya ExtraBold Italic", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["exponential", 1.2], ["zoom"], 6, 10, 8, 11, 12, 13],
        "text-line-height": 1,
        "text-letter-spacing": ["interpolate", ["linear"], ["zoom"], 6, 0, 8, 0.05],
        "text-max-width": 8.5,
        "icon-image": sizedIcon("park"),
      },
      paint: {
        "text-color": "hsl(90, 33%, 38%)",
        "text-opacity": 0.9,
        "text-halo-color": "hsl(88, 25%, 94%)",
        "text-halo-blur": 0,
        "text-halo-width": 1,
      },
    },
    {
      id: MOUNTAIN_LAYER_ID,
      filter: kindFilter("mountain"),
      layout: {
        ...iconLabelLayout,
        "text-font": ["Alegreya ExtraBold Italic", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["exponential", 1.2], ["zoom"], 6, 10, 8, 12, 12, 18],
        "text-line-height": 0.9,
        "text-max-width": 8,
        "icon-image": sizedIcon("mountain"),
      },
      paint: {
        "text-color": "hsl(203, 14%, 35%)",
        "text-opacity": 0.9,
        "text-halo-color": "hsl(67, 26%, 87%)",
        "text-halo-blur": 0.3,
        "text-halo-width": 1,
      },
    },
    {
      id: TOWN_LAYER_ID,
      filter: kindFilter("town"),
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Overpass ExtraBold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["exponential", 1.2], ["zoom"], 6, 8, 10, 13, 14, 30],
        "text-transform": "uppercase",
        "text-letter-spacing": -0.01,
        "text-max-width": 8,
        "symbol-sort-key": ["get", "sortKey"],
      },
      paint: {
        "text-color": "hsl(203, 14%, 65%)",
        "text-halo-color": "hsl(147, 52%, 94%)",
        "text-halo-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 1.25],
        "text-halo-blur": 0,
      },
    },
  ]
}

/** Idempotent; call on map load and again after any `style.load`. */
export function installTrailLabelLayers(map: any): void {
  if (!map || map._removed) return

  const source = map.getSource(TRAIL_LABEL_SOURCE_ID)
  if (source) {
    source.setData?.(labelCollection())
  } else {
    map.addSource(TRAIL_LABEL_SOURCE_ID, { type: "geojson", data: labelCollection() })
  }

  for (const spec of layerSpecs()) {
    if (map.getLayer(spec.id)) continue
    map.addLayer({ ...spec, type: "symbol", source: TRAIL_LABEL_SOURCE_ID })
  }
}
