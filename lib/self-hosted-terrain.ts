/**
 * Prototype: serve terrain elevation from our own copy of open data instead of
 * Mapbox's DEM tiles. The trail never moves, so the tiles it needs are a fixed
 * strip that can sit behind permanent cache headers.
 *
 * Off unless `NEXT_PUBLIC_SELF_HOSTED_DEM` holds a tile URL template. With the
 * flag unset the map adds exactly the Mapbox source it always has.
 *
 * Tiles are AWS Terrain Tiles (the public `elevation-tiles-prod` bucket) in
 * Terrarium encoding, 256 px. `scripts/terrain-tiles.ts` lists and downloads
 * the strip described by the constants below; keep the two in step.
 */

/** Today's terrain source. */
export const MAPBOX_DEM_SOURCE = {
  type: "raster-dem",
  url: "mapbox://mapbox.mapbox-terrain-dem-v1",
  tileSize: 512,
  maxzoom: 14,
} as const

/** Produced content ends in early Oregon; the strip stops there too. */
export const SELF_HOSTED_DEM_END_MILES = 1800

/**
 * How far either side of the trail each zoom level is kept, in kilometres.
 *
 * Mapbox picks a 256 px DEM tile one zoom below the map zoom, and at a pitched
 * view it drops to lower zooms toward the horizon. So the deepest zooms only
 * need the ground near the camera, and each shallower zoom needs a wider band.
 * The low zooms cover the whole region the opening overview shows, out to the
 * horizon of its pitched view.
 */
export const SELF_HOSTED_DEM_ZOOM_BUFFERS_KM: ReadonlyArray<readonly [zoom: number, bufferKm: number]> = [
  [3, 4000],
  [4, 3000],
  [5, 1200],
  [6, 800],
  [7, 400],
  [8, 220],
  [9, 120],
  [10, 70],
  [11, 45],
]

export const SELF_HOSTED_DEM_MIN_ZOOM = SELF_HOSTED_DEM_ZOOM_BUFFERS_KM[0][0]
export const SELF_HOSTED_DEM_MAX_ZOOM =
  SELF_HOSTED_DEM_ZOOM_BUFFERS_KM[SELF_HOSTED_DEM_ZOOM_BUFFERS_KM.length - 1][0]

export type SelfHostedDemSource = {
  type: "raster-dem"
  tiles: string[]
  tileSize: 256
  minzoom: number
  maxzoom: number
  encoding: "terrarium"
  attribution: string
}

/** AWS Terrain Tiles asks for this credit wherever the data is shown. */
const TERRARIUM_ATTRIBUTION =
  "Terrain: Mapzen, USGS 3DEP, SRTM, GMTED2010, ETOPO1 via AWS Terrain Tiles"

function isTileTemplate(value: string): boolean {
  return (
    /^(https?:\/\/|\/)/.test(value) &&
    value.includes("{z}") &&
    value.includes("{x}") &&
    value.includes("{y}")
  )
}

/**
 * The `raster-dem` source the map should add. Anything other than a usable
 * `{z}/{x}/{y}` template — unset, empty, a typo — keeps the Mapbox source.
 */
export function resolveTerrainDemSource(
  template: string | undefined,
): typeof MAPBOX_DEM_SOURCE | SelfHostedDemSource {
  const tiles = template?.trim()
  if (!tiles || !isTileTemplate(tiles)) return MAPBOX_DEM_SOURCE

  return {
    type: "raster-dem",
    tiles: [tiles],
    tileSize: 256,
    minzoom: SELF_HOSTED_DEM_MIN_ZOOM,
    // Past this zoom Mapbox stretches the deepest tile instead of asking for more.
    maxzoom: SELF_HOSTED_DEM_MAX_ZOOM,
    encoding: "terrarium",
    attribution: TERRARIUM_ATTRIBUTION,
  }
}
