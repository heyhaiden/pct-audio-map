/**
 * Map neighbor warmup now lives on the trail loop engine (`prefetchLoop`).
 * This helper stays as a no-op so leftover imports do not hit Blob for headers.
 */
export function prefetchAudio(_audioPath: string): void {}
