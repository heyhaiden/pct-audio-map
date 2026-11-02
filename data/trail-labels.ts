// Custom place labels drawn on top of the Studio style. Each `kind` is styled
// to match the style's own layer for that class of feature (see
// lib/trail-label-layer.ts), so these read as part of the base map.
//
// Not listed: Big Bear and Wrightwood already render from the style's
// "small city labels" layer. Mission Creek and the Northern Terminus still
// need coordinates.

export type TrailLabelKind = "town" | "poi" | "road"

export interface TrailLabel {
  name: string
  /** [lng, lat] */
  coordinates: [number, number]
  kind: TrailLabelKind
  /** Sprite icon (from the Studio style's sprite) for POIs. */
  icon?: string
}

export const trailLabels: TrailLabel[] = [
  { name: "PCT Southern Terminus", coordinates: [-116.466988, 32.589729], kind: "poi", icon: "marker" },
  { name: "Campo", coordinates: [-116.469865, 32.607635], kind: "town" },
  { name: "Lake Morena Campground", coordinates: [-116.517556, 32.685956], kind: "town" },
  { name: "Mount Laguna", coordinates: [-116.41877, 32.867649], kind: "town" },
  { name: "Scissors Crossing", coordinates: [-116.470192, 33.098759], kind: "road" },
  { name: "Third Gate Water Cache", coordinates: [-116.542778, 33.167801], kind: "poi", icon: "drinking-water" },
  { name: "Montezuma Valley Road", coordinates: [-116.587929, 33.216782], kind: "road" },
  { name: "Warner Springs", coordinates: [-116.634186, 33.282887], kind: "town" },
  { name: "Little Bear Hostel", coordinates: [-116.59617, 33.51114], kind: "town" },
  { name: "Paradise Valley Cafe", coordinates: [-116.5914, 33.56905], kind: "town" },
  { name: "Idyllwild", coordinates: [-116.713173, 33.744789], kind: "town" },
  { name: "San Jacinto Peak", coordinates: [-116.67942, 33.814739], kind: "poi", icon: "mountain" },
  { name: "Cabazon", coordinates: [-116.783142, 33.917389], kind: "town" },
  { name: "Whitewater Preserve", coordinates: [-116.655861, 33.98914], kind: "poi", icon: "park" },
  { name: "Deep Creek Hot Springs", coordinates: [-117.176521, 34.33947], kind: "poi", icon: "water" },
  { name: "Silverwood Lake", coordinates: [-117.318865, 34.299834], kind: "poi", icon: "water" },
  { name: "Cajon Pass", coordinates: [-117.475082, 34.311806], kind: "town" },
]
