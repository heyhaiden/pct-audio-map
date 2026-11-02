import { trailLabels } from "@/data/trail-labels"

// Paint/layout values are copied from the Studio style
// (heyhaiden/cmhrxqwyy004a01sd9ngkgljo) so custom labels match the base map:
//   town → "small city labels", poi → "non-green POIs", road → "road-label-large"
// (road labels use point placement here since we only have a coordinate).

export const TRAIL_LABEL_SOURCE_ID = "trail-labels"
const TOWN_LAYER_ID = "trail-labels-town"
const POI_LAYER_ID = "trail-labels-poi"
const ROAD_LAYER_ID = "trail-labels-road"

function labelCollection() {
  return {
    type: "FeatureCollection" as const,
    features: trailLabels.map((label) => ({
      type: "Feature" as const,
      properties: { name: label.name, kind: label.kind, icon: label.icon ?? "marker" },
      geometry: { type: "Point" as const, coordinates: label.coordinates },
    })),
  }
}

/** Idempotent; call on map load and again after any `style.load`. */
export function installTrailLabelLayers(map: any): void {
  if (!map || map._removed) return

  if (!map.getSource(TRAIL_LABEL_SOURCE_ID)) {
    map.addSource(TRAIL_LABEL_SOURCE_ID, { type: "geojson", data: labelCollection() })
  }

  if (!map.getLayer(ROAD_LAYER_ID)) {
    map.addLayer({
      id: ROAD_LAYER_ID,
      type: "symbol",
      source: TRAIL_LABEL_SOURCE_ID,
      filter: ["==", ["get", "kind"], "road"],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Overpass Bold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 9, 20, 14],
        "text-letter-spacing": 0.01,
        "text-padding": 1,
        "text-max-width": 8,
      },
      paint: {
        "text-color": "hsl(0, 0%, 35%)",
        "text-halo-color": "hsla(0, 0%, 100%, 0.75)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
      },
    })
  }

  if (!map.getLayer(POI_LAYER_ID)) {
    map.addLayer({
      id: POI_LAYER_ID,
      type: "symbol",
      source: TRAIL_LABEL_SOURCE_ID,
      filter: ["==", ["get", "kind"], "poi"],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Alegreya Bold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["exponential", 1.2], ["zoom"], 6, 9, 8, 10, 12, 11],
        "text-line-height": 0.9,
        "text-offset": [0, 0.65],
        "text-anchor": "top",
        "text-rotation-alignment": "viewport",
        "text-max-width": 8,
        "icon-image": [
          "step",
          ["zoom"],
          ["concat", ["get", "icon"], "-11"],
          14,
          ["concat", ["get", "icon"], "-15"],
        ],
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
    })
  }

  if (!map.getLayer(TOWN_LAYER_ID)) {
    map.addLayer({
      id: TOWN_LAYER_ID,
      type: "symbol",
      source: TRAIL_LABEL_SOURCE_ID,
      filter: ["==", ["get", "kind"], "town"],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Overpass ExtraBold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["exponential", 1.2], ["zoom"], 6, 8, 10, 13, 14, 30],
        "text-transform": "uppercase",
        "text-letter-spacing": -0.01,
        "text-max-width": 8,
      },
      paint: {
        "text-color": "hsl(203, 14%, 65%)",
        "text-halo-color": "hsl(147, 52%, 94%)",
        "text-halo-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 1.25],
        "text-halo-blur": 0,
      },
    })
  }
}
