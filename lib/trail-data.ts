type TrailResponse = {
  ok: boolean
  status?: number
  statusText?: string
  json: () => Promise<any>
}

/**
 * Keeps Strict Mode and quick route remounts on one GeoJSON request. The
 * resolved feature object is shared too, so React does not restart the map for
 * two equivalent-but-distinct parsed objects.
 */
export function createTrailDataLoader<T>(
  fetchTrail: () => Promise<TrailResponse>,
  fallback: T,
  options: { timeoutMs?: number } = {},
): () => Promise<T> {
  let pending: Promise<T> | null = null

  return () => {
    if (!pending) {
      const timeoutMs = options.timeoutMs ?? 8_000
      let timeout: ReturnType<typeof setTimeout> | undefined
      const timedFetch = Promise.race([
        fetchTrail(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error(`Trail data request timed out after ${timeoutMs}ms`)),
            timeoutMs,
          )
        }),
      ])

      pending = timedFetch
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(
              `Trail data request failed (${response.status ?? "unknown"} ${response.statusText ?? ""})`,
            )
          }

          const data = await response.json()
          const feature = data?.type === "FeatureCollection" ? data.features?.[0] : data
          if (!feature?.geometry?.coordinates?.length) {
            throw new Error("Trail data response did not contain a usable line")
          }
          return feature as T
        })
        .catch((error) => {
          console.error("[v0] Failed to load trail data; using fallback:", error)
          return fallback
        })
        .finally(() => {
          if (timeout) clearTimeout(timeout)
        })
    }

    return pending
  }
}
