import { bufferHasEnergy, chooseLoopFormat } from "@/lib/audio-format-probe"
import { crossfadeVolumes, fadeOutVolume } from "@/lib/audio-crossfade"
import { nextDecodedIds } from "@/lib/decoded-clip-cache"
import {
  clipPlaybackGain,
  loopWindow,
  normalizeManifest,
  type LoopManifest,
  type NormalizedClip,
} from "@/lib/audio-loop-manifest"
import { resolveLoopSources, type LoopSources } from "@/lib/audio-loop-sources"
import {
  armMediaPlaybackSession,
  shouldLockPlaybackWithHtmlAudio,
} from "@/lib/media-playback-session"
import { orphanedDecks } from "@/lib/trail-loop-decks"

type TrailLoopEvent =
  | { type: "loading"; id: string }
  | { type: "playing"; id: string }
  | { type: "stopped" }
  | { type: "error"; id: string; message: string }
  /** A tap tried to start Web Audio and the context still isn't running. */
  | { type: "blocked" }

export interface TrailLoopEngine {
  unlock: () => Promise<void>
  resume: () => Promise<void>
  /** Same-turn as the pin tap: start HTMLAudio so iOS keeps the media session. */
  prime: (audioUrl: string) => void
  play: (audioUrl: string, options?: { fadeMs?: number; volume?: number }) => Promise<void>
  prefetch: (audioUrls: string[]) => void
  stop: (fadeMs?: number) => void
  setMuted: (muted: boolean) => void
  suspend: () => Promise<void>
  on: (fn: (event: TrailLoopEvent) => void) => () => void
  /** Web Audio context state, or null before the first tap builds it. */
  contextState: () => AudioContextState | null
}

const DEFAULT_FADE_MS = 900
/** How long a tap gets to bring the context to "running" before we call it blocked. */
const BLOCKED_CHECK_MS = 1500
const FAILED_INCOMING_FADE_MS = 1400
const COMPRESSED_CACHE_MAX = 6
const MANIFEST_URL = "/audio/manifest.json"

type LoopFormat = "opus" | "mp3"

interface Deck {
  source: AudioBufferSourceNode
  gain: GainNode
  /** Fixed per-clip boost (manifest playbackGainDb), below the fade gain. */
  trim: GainNode
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
  let graphOnPlaybackSession = false
  let lockElement: HTMLAudioElement | null = null
  let lockSource: MediaElementAudioSourceNode | null = null
  let lockGain: GainNode | null = null
  let format: LoopFormat | null = null
  let manifest: LoopManifest | null = null
  let manifestPromise: Promise<LoopManifest> | null = null
  let generation = 0
  let fadeRaf = 0
  let fadeResolve: (() => void) | null = null
  let muted = false
  let volume = 0.7
  let active: Deck | null = null
  const liveDecks = new Set<Deck>()
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
    const sessionType = armMediaPlaybackSession()
    const onPlayback = sessionType === "playback"

    if (context && master && onPlayback && !graphOnPlaybackSession) {
      for (const deck of [...liveDecks]) disconnectDeck(deck)
      decoded.clear()
      decodedOrder.length = 0
      void context.close()
      context = null
      master = null
    }

    if (context && master) return
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    context = new AudioContextCtor()
    graphOnPlaybackSession = onPlayback
    master = context.createGain()
    master.connect(context.destination)
    applyMasterGain()
  }

  // resume() rejects with InvalidStateError when the OS won't start the audio
  // device (seen in the iOS Facebook in-app browser). Treat that as "still
  // suspended" — the next tap retries — instead of an unhandled rejection.
  const resumeContext = (ctx: AudioContext) => ctx.resume().catch(() => {})

  // Gesture paths only. resume() can also hang without settling, so check the
  // state after a beat instead of trusting the promise. Resumes from
  // visibilitychange skip this: they can fail for harmless reasons.
  let blockedCheck: ReturnType<typeof setTimeout> | null = null
  const resumeFromGesture = (ctx: AudioContext) => {
    if (blockedCheck) clearTimeout(blockedCheck)
    blockedCheck = setTimeout(() => {
      blockedCheck = null
      if (context === ctx && ctx.state !== "running") emit({ type: "blocked" })
    }, BLOCKED_CHECK_MS)
    return resumeContext(ctx)
  }

  const unlock = async () => {
    ensureGraph()
    if (context && context.state === "suspended") {
      await resumeFromGesture(context)
    }
  }

  const resume = async () => {
    if (lockElement) void lockElement.play().catch(() => {})
    if (!context) return
    if (context.state === "suspended") await resumeContext(context)
  }

  const suspend = async () => {
    lockElement?.pause()
    if (!context) return
    if (context.state === "running") await context.suspend().catch(() => {})
  }

  const cancelFade = () => {
    if (fadeRaf) {
      cancelAnimationFrame(fadeRaf)
      fadeRaf = 0
    }
    const resolve = fadeResolve
    fadeResolve = null
    resolve?.()
  }

  const disconnectDeck = (deck: Deck | null) => {
    if (!deck) return
    liveDecks.delete(deck)
    if (active === deck) active = null
    try {
      deck.source.stop()
    } catch {
      // already stopped
    }
    deck.source.disconnect()
    deck.gain.disconnect()
    deck.trim.disconnect()
  }

  const disconnectOrphans = (keep: Array<Deck | null>) => {
    for (const deck of orphanedDecks([...liveDecks], keep)) {
      disconnectDeck(deck)
    }
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

    const trim = context.createGain()
    trim.gain.value = clipPlaybackGain(manifest, clipId)
    trim.connect(master)

    const gain = context.createGain()
    gain.gain.setValueAtTime(gainValue, context.currentTime)
    gain.connect(trim)

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const window = loopWindow(clipEntry(clipId, buffer), format ?? "opus", buffer.sampleRate)
    source.loopStart = window.start
    source.loopEnd = window.end
    source.connect(gain)
    source.start()

    const deck = { source, gain, trim, clipId }
    liveDecks.add(deck)
    return deck
  }

  const fadeGains = (
    token: number,
    incoming: GainNode | null,
    outgoing: GainNode | null,
    incomingTarget: number,
    outgoingStart: number,
    fadeMs: number,
    mode: "crossfade" | "fade-out",
  ) => {
    cancelFade()
    return new Promise<void>((resolve) => {
      fadeResolve = resolve
      const finish = () => {
        if (fadeResolve !== resolve) return
        fadeResolve = null
        fadeRaf = 0
        resolve()
      }
      const startedAt = performance.now()

      const tick = (now: number) => {
        if (token !== generation) {
          finish()
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
          finish()
          return
        }

        fadeRaf = requestAnimationFrame(tick)
      }

      fadeRaf = requestAnimationFrame(tick)
    })
  }

  const tapLockIntoGraph = () => {
    if (!context || !lockElement || lockSource) return
    try {
      lockGain = context.createGain()
      lockGain.gain.value = 0
      lockSource = context.createMediaElementSource(lockElement)
      lockSource.connect(lockGain)
      lockGain.connect(context.destination)
    } catch {
      lockSource = null
      lockGain = null
    }
  }

  const releaseLock = () => {
    lockElement?.pause()
    lockSource?.disconnect()
    lockGain?.disconnect()
    lockSource = null
    lockGain = null
    if (lockElement) {
      lockElement.removeAttribute("src")
      lockElement.load()
    }
    lockElement = null
  }

  /** Must run in the pin-tap turn. HTMLAudio holds Playback; Web Audio is what you hear. */
  const prime = (audioUrl: string) => {
    armMediaPlaybackSession()
    ensureGraph()
    if (context?.state === "suspended") void resumeFromGesture(context)
    if (!shouldLockPlaybackWithHtmlAudio()) return

    const sources = resolveLoopSources(audioUrl, { blobBase })
    if (!sources) return

    if (!lockElement) {
      const audio = new Audio()
      audio.crossOrigin = "anonymous"
      audio.loop = true
      audio.preload = "auto"
      audio.setAttribute("playsinline", "true")
      lockElement = audio
    }

    if (!lockElement.src) {
      lockElement.src = sources.opusUrl
      const play = lockElement.play()
      if (play) {
        void play.catch(() => {
          if (!lockElement) return
          lockElement.src = sources.mp3Url
          void lockElement.play().catch(() => {})
        })
      }
    } else {
      void lockElement.play().catch(() => {})
    }

    tapLockIntoGraph()
  }

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
      tapLockIntoGraph()

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
      // Always start silent so a first pin click fades in the same way hops crossfade.
      const incoming = startLoop(sources.clipId, buffer, 0)
      if (token !== generation) {
        disconnectDeck(incoming)
        return
      }

      disconnectOrphans([outgoing, incoming])
      active = incoming
      emit({ type: "playing", id: sources.clipId })

      await fadeGains(
        token,
        incoming.gain,
        outgoing?.gain ?? null,
        targetVolume,
        outgoingStart,
        fadeMs,
        "crossfade",
      )
      if (outgoing && token === generation) disconnectDeck(outgoing)

      if (token !== generation) {
        if (active !== incoming) disconnectDeck(incoming)
        return
      }

      incoming.gain.gain.setValueAtTime(targetVolume, context!.currentTime)
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
    // The first play also needs the manifest; fetch it alongside the bytes.
    if (audioUrls.length > 0) void loadManifest()
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
    disconnectOrphans([outgoing])
    if (!outgoing) {
      releaseLock()
      emit({ type: "stopped" })
      return
    }

    void fadeGains(token, null, outgoing.gain, 0, outgoing.gain.gain.value, fadeMs, "fade-out").then(
      () => {
        if (token !== generation) return
        disconnectDeck(outgoing)
        releaseLock()
        emit({ type: "stopped" })
      },
    )
  }

  return {
    unlock,
    resume,
    prime,
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
    contextState: () => context?.state ?? null,
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
