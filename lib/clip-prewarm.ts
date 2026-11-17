/**
 * Picks the recordings worth downloading before anyone taps them: the pins
 * closest to where the listener has stopped on the trail. A cold first tap
 * otherwise waits on the network for the whole clip (about 3.9 s on Fast 4G in
 * the lab baseline, against about 0.15 s once the bytes are cached).
 */

export interface PrewarmMarker {
  id: string
  audioUrl: string
  chapter: string
}

/** Roughly what the railing camera can show around the current position. */
export const PREWARM_WITHIN_MILES = 40
export const PREWARM_CLIP_COUNT = 2

/** Audio URLs of the nearest playable pins, nearest first. */
export function clipsToPrewarm(options: {
  markers: readonly PrewarmMarker[]
  markerMiles: Readonly<Record<string, number>>
  activeChapters: ReadonlySet<string>
  currentMiles: number
  count?: number
  withinMiles?: number
}): string[] {
  const count = options.count ?? PREWARM_CLIP_COUNT
  const withinMiles = options.withinMiles ?? PREWARM_WITHIN_MILES

  return options.markers
    .filter((marker) => marker.audioUrl && options.activeChapters.has(marker.chapter))
    .map((marker) => ({
      audioUrl: marker.audioUrl,
      distance: Math.abs((options.markerMiles[marker.id] ?? Infinity) - options.currentMiles),
    }))
    .filter((candidate) => candidate.distance <= withinMiles)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((candidate) => candidate.audioUrl)
}

/** Clips run 1 to 2.5 MB; don't spend them on a metered or very slow link. */
export function shouldPrewarmClips(
  connection: { saveData?: boolean; effectiveType?: string } | null | undefined,
): boolean {
  if (!connection) return true
  if (connection.saveData) return false
  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g"
}
