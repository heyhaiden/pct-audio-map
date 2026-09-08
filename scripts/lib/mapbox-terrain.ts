import { readPngPixel } from "./png-pixel.ts"

const TERRAIN_ZOOM = 15
const TILE_SIZE = 256

function lngLatToTilePixel(lng: number, lat: number, zoom: number) {
  const scale = Math.pow(2, zoom) * TILE_SIZE
  const x = ((lng + 180) / 360) * scale
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale

  const tileX = Math.floor(x / TILE_SIZE)
  const tileY = Math.floor(y / TILE_SIZE)
  const pixelX = Math.min(TILE_SIZE - 1, Math.max(0, Math.floor(x - tileX * TILE_SIZE)))
  const pixelY = Math.min(TILE_SIZE - 1, Math.max(0, Math.floor(y - tileY * TILE_SIZE)))

  return { tileX, tileY, pixelX, pixelY, zoom }
}

function terrainRgbToMeters(r: number, g: number, b: number): number {
  return -10000 + (r * 65536 + g * 256 + b) * 0.1
}

function metersToFeet(meters: number): number {
  return Math.round(meters * 3.28084)
}

export async function sampleElevationFeet(
  lng: number,
  lat: number,
  mapboxToken: string,
): Promise<number> {
  const { tileX, tileY, pixelX, pixelY, zoom } = lngLatToTilePixel(lng, lat, TERRAIN_ZOOM)
  const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${tileX}/${tileY}.pngraw?access_token=${mapboxToken}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Mapbox terrain tile failed (${response.status}) for ${lng},${lat}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const { r, g, b } = readPngPixel(buffer, pixelX, pixelY)
  return metersToFeet(terrainRgbToMeters(r, g, b))
}
