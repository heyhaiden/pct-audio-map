/**
 * Library stays on HTMLAudio. iOS ignores element.volume, so fades go through
 * a Web Audio gain when we can attach one — the same curve the desktop
 * element.volume path already uses.
 */
export type LibraryAudioOutput = {
  element: HTMLAudioElement
  getVolume: () => number
  setVolume: (value: number) => void
  /** Fixed per-clip boost (manifest playbackGainDb). Needs the Web Audio path; element.volume caps at 1. */
  setTrim: (value: number) => void
  arm: () => void
  dispose: () => void
}

let sharedContext: AudioContext | null = null

function getSharedContext(): AudioContext | null {
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new Ctor()
  }
  void sharedContext.resume()
  return sharedContext
}

export function createLibraryAudioOutput(src: string): LibraryAudioOutput {
  const element = new Audio()
  element.crossOrigin = "anonymous"
  element.preload = "auto"
  element.src = src

  let volume = 0
  let trim = 1
  let gain: GainNode | null = null
  let source: MediaElementAudioSourceNode | null = null
  let disposed = false

  const apply = (value: number) => {
    volume = Math.max(0, Math.min(1, value))
    if (gain && sharedContext) {
      gain.gain.setValueAtTime(volume * trim, sharedContext.currentTime)
      return
    }
    element.volume = volume
  }

  apply(0)

  return {
    element,
    getVolume: () => volume,
    setVolume: apply,
    setTrim(value) {
      trim = Number.isFinite(value) && value > 0 ? value : 1
      apply(volume)
    },
    arm() {
      if (disposed || source) return
      const context = getSharedContext()
      if (!context) {
        apply(volume)
        return
      }
      try {
        gain = context.createGain()
        gain.gain.value = volume * trim
        source = context.createMediaElementSource(element)
        source.connect(gain)
        gain.connect(context.destination)
        element.volume = 1
        apply(volume)
      } catch {
        gain = null
        source = null
        element.volume = volume
      }
    },
    dispose() {
      disposed = true
      element.pause()
      source?.disconnect()
      gain?.disconnect()
      source = null
      gain = null
      element.removeAttribute("src")
      element.load()
    },
  }
}
