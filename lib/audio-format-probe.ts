const ENERGY_THRESHOLD = 1e-4

export function bufferHasEnergy(
  samples: ArrayLike<number>,
  threshold = ENERGY_THRESHOLD,
): boolean {
  for (let index = 0; index < samples.length; index += 1) {
    if (Math.abs(samples[index]) >= threshold) return true
  }
  return false
}

export function chooseLoopFormat(probe: { opusHasEnergy: boolean | null }): "opus" | "mp3" {
  return probe.opusHasEnergy === true ? "opus" : "mp3"
}
