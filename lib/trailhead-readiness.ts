export function createTrailheadNotifier(options: {
  onReady?: () => void
  onWarm?: () => void
  onProgress?: (progress: number) => void
}) {
  let readyNotified = false
  let warmNotified = false

  return (warmed: boolean) => {
    if (warmed && !warmNotified) {
      warmNotified = true
      options.onWarm?.()
    }
    if (!readyNotified) {
      readyNotified = true
      options.onProgress?.(1)
      options.onReady?.()
    }
  }
}
