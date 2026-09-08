const TRAIL_TOTAL_MILES = 2650

function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const earthRadius = 6_371_000
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.sqrt(a))
}

function nearestTrailIndex(
  coordinates: [number, number][],
  lng: number,
  lat: number,
): number {
  let bestIndex = 0
  let bestDistance = Infinity

  for (let i = 0; i < coordinates.length; i++) {
    const [trailLng, trailLat] = coordinates[i]
    const distance = haversineMeters(lng, lat, trailLng, trailLat)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = i
    }
  }

  return bestIndex
}

export function computeMarkerMiles(
  trailCoordinates: [number, number][],
  markers: Array<{ id: string; lng: number; lat: number }>,
): Record<string, number> {
  const cumulativeMeters: number[] = [0]

  for (let i = 1; i < trailCoordinates.length; i++) {
    const [prevLng, prevLat] = trailCoordinates[i - 1]
    const [lng, lat] = trailCoordinates[i]
    cumulativeMeters.push(cumulativeMeters[i - 1] + haversineMeters(prevLng, prevLat, lng, lat))
  }

  const totalMeters = cumulativeMeters[cumulativeMeters.length - 1] || 1
  const miles: Record<string, number> = {}

  for (const marker of markers) {
    const index = nearestTrailIndex(trailCoordinates, marker.lng, marker.lat)
    const mile = Math.round((cumulativeMeters[index] / totalMeters) * TRAIL_TOTAL_MILES)
    miles[marker.id] = mile
  }

  return miles
}
