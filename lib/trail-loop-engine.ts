import { bufferHasEnergy, chooseLoopFormat } from "@/lib/audio-format-probe"
import { crossfadeVolumes, fadeOutVolume } from "@/lib/audio-crossfade"
import { nextDecodedIds } from "@/lib/decoded-clip-cache"
import {
  loopWindow,
  normalizeManifest,
  type LoopManifest,
  type NormalizedClip,
} from "@/lib/audio-loop-manifest"
import { resolveLoopSources, type LoopSources } from "@/lib/audio-loop-sources"

export type TrailLoopEvent =
  | { type: "loading"; id: string }
  | { type: "playing"; id: string }
  | { type: "stopped" }
  | { type: "error"; id: string; message: string }

export interface TrailLoopEngine {
  unlock: () => Promise<void>
  resume: () => Promise<void>
  play: (audioUrl: string, options?: { fadeMs?: number; volume?: number }) => Promise<void>
  prefetch: (audioUrls: string[]) => void
  stop: (fadeMs?: number) => void
  setMuted: (muted: boolean) => void
  suspend: () => Promise<void>
  on: (fn: (event: TrailLoopEvent) => void) => () => void
}

const DEFAULT_FADE_MS = 900
const FAILED_INCOMING_FADE_MS = 1400
const COMPRESSED_CACHE_MAX = 6
const MANIFEST_URL = "/audio/manifest.json"

type LoopFormat = "opus" | "mp3"

interface Deck {
  source: AudioBufferSourceNode
  gain: GainNode
  clipId: string
}

export function createTrailLoopEngine(options: {
  blobBase?: string
  keepDecoded?: number
} = {}): TrailLoopEngine {
  const keepDecoded = options.keepDecoded ?? 3
  const blobBase = options.blobBase

  let context: AudioContext | null = null
  let master: GainNode | null = null
  let format: LoopFormat | null = null
  let manifest: LoopManifest | null = null
  let manifestPromise: Promise<LoopManifest> | null = null
  let generation = 0
  let fadeRaf = 0
  let muted = false
  let volume = 0.7
  let active: Deck | null = null
  const listeners = new Set<(event: TrailLoopEvent) => void>()
  const decoded = new Map<string, AudioBuffer>()
  const decodedOrder: string[] = []
  const compressed = new Map<string, ArrayBuffer>()
  const compressedOrder: string[] = []
  const inflight = new Map<string, Promise<ArrayBuffer>>()
  let pinned = new Set<string>()

  const emit = (event: TrailLoopEvent) => {
    for (const listener of listeners) listener(event)
  }

  const applyMasterGain = () => {
    if (!master || !context) return
    master.gain.setValueAtTime(muted ? 0 : volume, context.currentTime)
  }

  const ensureGraph = () => {
    if (context && master) return
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    context = context ?? new AudioContextCtor()
    master = context.createGain()
    master.connect(context.destination)
    applyMasterGain()
  }

  const unlock = async () => {
    ensureGraph()
    if (context && context.state === "suspended") {
      await context.resume()
    }
  }

  const resume = async () => {
    if (!context) return
    if (context.state === "suspended") await context.resume()
  }

  const suspend = async () => {
    if (!context) return
    if (context.state === "running") await context.suspend()
  }

  const cancelFade = () => {
    if (!fadeRaf) return
    cancelAnimationFrame(fadeRaf)
    fadeRaf = 0
  }

  const disconnectDeck = (deck: Deck | null) => {
    if (!deck) return
    try {
      deck.source.stop()
    } catch {
      // already stopped
    }
    deck.source.disconnect()
    deck.gain.disconnect()
  }

  const loadManifest = async () => {
    if (manifest) return manifest
    if (manifestPromise) return manifestPromise

    manifestPromise = fetch(MANIFEST_URL)
      .then(async (response) => {
        if (!response.ok) return {}
        return normalizeManifest(await response.json())
      })
      .catch(() => ({}))
      .then((loaded) => {
        manifest = loaded
        return loaded
      })

    return manifestPromise
  }

  const rememberCompressed = (url: string, buffer: ArrayBuffer) => {
    if (!compressed.has(url)) compressedOrder.push(url)
    compressed.set(url, buffer)
    while (compressedOrder.length > COMPRESSED_CACHE_MAX) {
      const evicted = compressedOrder.shift()
      if (evicted && evicted !== url) compressed.delete(evicted)
    }
  }

  const fetchCompressed = (url: string) => {
    const cached = compressed.get(url)
    if (cached) return Promise.resolve(cached)

    const pending = inflight.get(url)
    if (pending) return pending

    const request = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Audio unavailable (${response.status})`)
        }
        const buffer = await response.arrayBuffer()
        rememberCompressed(url, buffer)
        return buffer
      })
      .finally(() => {
        inflight.delete(url)
      })

    inflight.set(url, request)
    return request
  }

  const rememberDecoded = (clipId: string, buffer: AudioBuffer) => {
    if (!decoded.has(clipId)) decodedOrder.push(clipId)
    decoded.set(clipId, buffer)

    const kept = nextDecodedIds({
      decoded: decodedOrder,
      pinned: [...pinned],
      max: keepDecoded,
    })
    const keep = new Set(kept)
    for (const id of [...decodedOrder]) {
      if (keep.has(id)) continue
      decoded.delete(id)
      const index = decodedOrder.indexOf(id)
      if (index >= 0) decodedOrder.splice(index, 1)
    }
  }

  const probeOpus = async (sources: LoopSources) => {
    if (!context) throw new Error("Audio is locked")
    try {
      const bytes = await fetchCompressed(sources.opusUrl)
      const buffer = await context.decodeAudioData(bytes.slice(0))
      const channel = buffer.getChannelData(0)
      const energy = bufferHasEnergy(channel)
      format = chooseLoopFormat({ opusHasEnergy: energy })
      if (format === "opus") rememberDecoded(sources.clipId, buffer)
    } catch {
      format = "mp3"
    }
  }

  const clipEntry = (clipId: string, buffer: AudioBuffer): NormalizedClip => {
    return manifest?.[clipId] ?? { sampleCount: buffer.length }
  }

  const startLoop = (clipId: string, buffer: AudioBuffer, gainValue: number) => {
    if (!context || !master) throw new Error("Audio is locked")

    const gain = context.createGain()
    gain.gain.setValueAtTime(gainValue, context.currentTime)
    gain.connect(master)

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const window = loopWindow(clipEntry(clipId, buffer), format ?? "opus", buffer.sampleRate)
    source.loopStart = window.start
    source.loopEnd = window.end
    source.connect(gain)
    source.start()

    return { source, gain, clipId }
  }

  const fadeGains = (
    token: number,
    incoming: GainNode | null,
    outgoing: GainNode | null,
    incomingTarget: number,
    outgoingStart: number,
    fadeMs: number,
    mode: "crossfade" | "fade-out",
  ) =>
    new Promise<void>((resolve) => {
      const startedAt = performance.now()

      const tick = (now: number) => {
        if (token !== generation) {
          resolve()
          return
        }

        const progress = Math.min(1, (now - startedAt) / Math.max(1, fadeMs))

        if (mode === "crossfade" && incoming) {
          const { incoming: inVol, outgoing: outVol } = crossfadeVolumes(
            progress,
            incomingTarget,
            outgoingStart,
          )
          incoming.gain.setValueAtTime(inVol, context!.currentTime)
          if (outgoing) outgoing.gain.setValueAtTime(outVol, context!.currentTime)
        } else if (outgoing) {
          outgoing.gain.setValueAtTime(fadeOutVolume(progress, outgoingStart), context!.currentTime)
        }

        if (progress >= 1) {
          fadeRaf = 0
          resolve()
          return
        }

        fadeRaf = requestAnimationFrame(tick)
      }

      fadeRaf = requestAnimationFrame(tick)
    })

  const play = async (audioUrl: string, playOptions?: { fadeMs?: number; volume?: number }) => {
    const token = ++generation
    const fadeMs = playOptions?.fadeMs ?? DEFAULT_FADE_MS
    const targetVolume = Math.max(0, Math.min(1, playOptions?.volume ?? volume))
    volume = targetVolume
    applyMasterGain()

    const sources = resolveLoopSources(audioUrl, { blobBase })
    if (!sources) {
      emit({ type: "error", id: audioUrl, message: "Audio unavailable" })
      return
    }

    pinned = new Set([sources.clipId, ...pinned].slice(0, keepDecoded))
    emit({ type: "loading", id: sources.clipId })

    try {
      await unlock()
      if (token !== generation) return

      await loadManifest()
      if (token !== generation) return

      if (!format) {
        await probeOpus(sources)
        if (token !== generation) return
      }

      const url = format === "mp3" ? sources.mp3Url : sources.opusUrl
      let buffer = decoded.get(sources.clipId)
      if (!buffer) {
        const bytes = await fetchCompressed(url)
        if (token !== generation) return
        buffer = await context!.decodeAudioData(bytes.slice(0))
        rememberDecoded(sources.clipId, buffer)
      }
      if (token !== generation) return

      const outgoing = active
      const outgoingStart = outgoing?.gain.gain.value ?? 0
      const incoming = startLoop(sources.clipId, buffer, outgoing ? 0 : targetVolume)
      active = incoming

      if (outgoing) {
        await fadeGains(token, incoming.gain, outgoing.gain, targetVolume, outgoingStart, fadeMs, "crossfade")
        if (token === generation) disconnectDeck(outgoing)
      }

      if (token !== generation) {
        disconnectDeck(incoming)
        return
      }

      incoming.gain.gain.setValueAtTime(targetVolume, context!.currentTime)
      emit({ type: "playing", id: sources.clipId })
    } catch {
      if (token !== generation) return
      const outgoing = active
      if (outgoing) {
        await fadeGains(
          token,
          null,
          outgoing.gain,
          0,
          outgoing.gain.gain.value,
          Math.max(FAILED_INCOMING_FADE_MS, fadeMs),
          "fade-out",
        )
        if (token === generation) {
          disconnectDeck(outgoing)
          active = null
        }
      }
      if (token === generation) {
        emit({ type: "error", id: sources.clipId, message: "Audio unavailable" })
      }
    }
  }

  const prefetch = (audioUrls: string[]) => {
    const nextPinned = new Set(pinned)
    for (const audioUrl of audioUrls) {
      const sources = resolveLoopSources(audioUrl, { blobBase })
      if (!sources) continue
      nextPinned.add(sources.clipId)
      const url = format === "mp3" ? sources.mp3Url : sources.opusUrl
      void fetchCompressed(url).catch(() => {
        // Neighbor warmup is best-effort.
      })
    }
    pinned = new Set([...nextPinned].slice(-keepDecoded))
  }

  const stop = (fadeMs = DEFAULT_FADE_MS) => {
    const token = ++generation
    cancelFade()
    const outgoing = active
    if (!outgoing) {
      emit({ type: "stopped" })
      return
    }

    void fadeGains(token, null, outgoing.gain, 0, outgoing.gain.gain.value, fadeMs, "fade-out").then(
      () => {
        if (token !== generation) return
        disconnectDeck(outgoing)
        active = null
        emit({ type: "stopped" })
      },
    )
  }

  return {
    unlock,
    resume,
    play,
    prefetch,
    stop,
    setMuted: (nextMuted) => {
      muted = nextMuted
      applyMasterGain()
    },
    suspend,
    on: (fn) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
