/**
 * Native Land position lookup.
 * https://native-land.ca/api/index.php?maps=territories&position=<lat>,<lng>&key=...
 *
 * Marker coordinates in this repo are [lng, lat]. The API wants latitude first.
 * A point can overlap more than one territory, so the result is a list.
 */

export interface NativeLand {
  name: string
  slug: string
}

interface NativeLandCacheEntry {
  lng: number
  lat: number
  lands: NativeLand[]
}

export type NativeLandCache = Record<string, NativeLandCacheEntry>

const POSITION_URL = "https://native-land.ca/api/index.php"

export function parseNativeLandTerritories(body: unknown): NativeLand[] {
  if (!Array.isArray(body)) {
    throw new Error("Native Land response was not a feature array")
  }

  const lands: NativeLand[] = []
  const seen = new Set<string>()

  for (const feature of body) {
    if (!feature || typeof feature !== "object") continue
    const properties = (feature as { properties?: unknown }).properties
    if (!properties || typeof properties !== "object") continue
    const record = properties as Record<string, unknown>
    const description = typeof record.description === "string" ? record.description : ""
    if (description && !description.includes("/maps/territories/")) continue

    const name = record.Name
    const slug = record.Slug
    if (typeof name !== "string" || typeof slug !== "string" || seen.has(slug)) continue
    seen.add(slug)
    lands.push({ name, slug })
  }

  return lands
}

export function cachedLands(
  cache: NativeLandCache,
  id: string,
  lng: number,
  lat: number,
): NativeLand[] | null {
  const entry = cache[id]
  if (!entry || entry.lng !== lng || entry.lat !== lat) return null
  return entry.lands
}

export async function fetchTerritoriesAtPosition(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<NativeLand[]> {
  const url = new URL(POSITION_URL)
  url.searchParams.set("maps", "territories")
  url.searchParams.set("position", `${lat},${lng}`)
  url.searchParams.set("key", apiKey)

  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? ` (${String(error.cause)})` : ""
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Native Land request failed: ${message}${cause}`)
  }

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Native Land API ${response.status}: ${detail.slice(0, 180)}`)
  }

  return parseNativeLandTerritories(await response.json())
}
