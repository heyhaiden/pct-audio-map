"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import {
  crossfadeVolumes,
  fadeOutVolume,
  isPlayAbortError,
  resolveOutgoingDeck,
} from "@/lib/audio-crossfade"

interface AudioPlayerState {
  isPlaying: boolean
  volume: number
  isMuted: boolean
  isLoading: boolean
  error: string | null
  currentTrack: string | null
}

export interface AudioTrack {
  id: string
  url: string
  volume?: number
  loop?: boolean
}

const DEFAULT_FADE_MS = 900
/** Extra tail when the next recording is missing — outgoing ducks gently to silence. */
const FAILED_INCOMING_FADE_MS = 1400

function prepareIncomingDeck(deck: HTMLAudioElement, track: AudioTrack, muted: boolean) {
  deck.pause()
  deck.src = track.url
  deck.load()
  deck.currentTime = 0
  deck.loop = track.loop ?? true
  deck.volume = 0
  deck.muted = muted
}

export function useAudioPlayer() {
  const decksRef = useRef<[HTMLAudioElement | null, HTMLAudioElement | null]>([null, null])
  const activeDeckRef = useRef(0)
  const currentTrackRef = useRef<string | null>(null)
  const currentTargetVolumeRef = useRef(0.7)
  const pendingTrackRef = useRef<string | null>(null)
  const transitionRef = useRef(0)
  const fadeRafRef = useRef(0)
  const volumeRef = useRef(0.7)
  const mutedRef = useRef(false)
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    volume: 0.7,
    isMuted: false,
    isLoading: false,
    error: null,
    currentTrack: null,
  })

  const cancelFade = useCallback(() => {
    if (!fadeRafRef.current) return
    cancelAnimationFrame(fadeRafRef.current)
    fadeRafRef.current = 0
  }, [])

  const getDeck = useCallback((index: number) => {
    let deck = decksRef.current[index]
    if (!deck) {
      deck = new Audio()
      deck.preload = "auto"
      decksRef.current[index] = deck
    }
    return deck
  }, [])

  const transitionToTrack = useCallback(
    async (track: AudioTrack, fadeMs = DEFAULT_FADE_MS) => {
      const transition = ++transitionRef.current
      pendingTrackRef.current = track.id
      cancelFade()

      const { index: outgoingIndex, deck: outgoing, startVolume: outgoingStartVolume } =
        resolveOutgoingDeck(decksRef.current, activeDeckRef.current, currentTargetVolumeRef.current)

      const incomingIndex = outgoingIndex === 0 ? 1 : 0
      const interrupted = decksRef.current[incomingIndex]

      if (interrupted && interrupted !== outgoing && interrupted.src) {
        interrupted.pause()
        interrupted.currentTime = 0
        interrupted.src = ""
      }

      const incoming = getDeck(incomingIndex)
      const targetVolume = Math.max(0, Math.min(1, track.volume ?? volumeRef.current))

      prepareIncomingDeck(incoming, track, mutedRef.current)

      setState((previous) => ({
        ...previous,
        isLoading: true,
        error: null,
        currentTrack: track.id,
      }))

      const startedAt = performance.now()
      let incomingReady = false
      let incomingFailed = false
      let fadeComplete = false
      let outgoingFadeStartedAt = startedAt
      let outgoingFadeMs = fadeMs

      const applyFadeFrame = (now: number) => {
        if (incomingReady) {
          const progress = Math.min(1, (now - startedAt) / Math.max(1, fadeMs))
          const { incoming: inVol, outgoing: outVol } = crossfadeVolumes(
            progress,
            targetVolume,
            outgoingStartVolume,
          )

          if (incomingReady) incoming.volume = inVol
          if (outgoing && outgoingStartVolume > 0) outgoing.volume = outVol

          return { mode: "crossfade" as const, progress }
        }

        if (incomingFailed) {
          const progress = Math.min(1, (now - outgoingFadeStartedAt) / Math.max(1, outgoingFadeMs))
          if (outgoing && outgoingStartVolume > 0) {
            outgoing.volume = fadeOutVolume(progress, outgoingStartVolume)
          }
          return { mode: "fade-out" as const, progress }
        }

        if (outgoing && outgoingStartVolume > 0) {
          outgoing.volume = outgoingStartVolume
        }

        return { mode: "loading" as const, progress: 0 }
      }

      const teardownOutgoing = () => {
        if (!outgoing) return
        outgoing.pause()
        outgoing.currentTime = 0
        outgoing.src = ""
      }

      const finishSuccess = () => {
        if (transition !== transitionRef.current) return

        fadeRafRef.current = 0
        incoming.volume = targetVolume
        teardownOutgoing()

        activeDeckRef.current = incomingIndex
        currentTrackRef.current = track.id
        currentTargetVolumeRef.current = targetVolume
        pendingTrackRef.current = null

        setState((previous) => ({
          ...previous,
          currentTrack: track.id,
          isPlaying: true,
          isLoading: false,
          error: null,
        }))
      }

      const finishFailure = () => {
        if (transition !== transitionRef.current) return

        fadeRafRef.current = 0
        incoming.pause()
        incoming.src = ""
        teardownOutgoing()

        currentTrackRef.current = track.id
        pendingTrackRef.current = null

        setState((previous) => ({
          ...previous,
          currentTrack: track.id,
          isPlaying: false,
          isLoading: false,
          error: "Audio unavailable",
        }))
      }

      const settleFade = () => {
        fadeComplete = true
        if (incomingReady) finishSuccess()
      }

      const fade = (now: number) => {
        if (transition !== transitionRef.current) return

        const frame = applyFadeFrame(now)

        if (frame.mode === "fade-out" && frame.progress >= 1) {
          finishFailure()
          return
        }

        if (frame.mode === "crossfade" && frame.progress >= 1) {
          settleFade()
          return
        }

        fadeRafRef.current = requestAnimationFrame(fade)
      }

      fadeRafRef.current = requestAnimationFrame(fade)

      const onIncomingError = () => {
        if (transition !== transitionRef.current) return
        incomingFailed = true
        outgoingFadeStartedAt = performance.now()
        outgoingFadeMs = Math.max(FAILED_INCOMING_FADE_MS, fadeMs)
        if (fadeComplete) finishFailure()
      }
      incoming.addEventListener("error", onIncomingError, { once: true })

      try {
        await incoming.play()
        if (transition !== transitionRef.current) return false

        incomingReady = true
        applyFadeFrame(performance.now())

        if (fadeComplete) finishSuccess()
      } catch (error) {
        if (transition !== transitionRef.current || isPlayAbortError(error)) return false

        incomingFailed = true
        outgoingFadeStartedAt = performance.now()
        outgoingFadeMs = Math.max(FAILED_INCOMING_FADE_MS, fadeMs)

        if (fadeComplete) finishFailure()
      }

      return !incomingFailed
    },
    [cancelFade, getDeck],
  )

  const play = useCallback(() => {
    const activeDeck = decksRef.current[activeDeckRef.current]
    if (activeDeck) {
      activeDeck
        .play()
        .then(() => {
          setState((prev) => ({ ...prev, isPlaying: true, error: null }))
        })
        .catch(() => {
          setState((prev) => ({ ...prev, error: "Audio unavailable" }))
        })
    }
  }, [])

  const pause = useCallback(() => {
    const activeDeck = decksRef.current[activeDeckRef.current]
    if (activeDeck) {
      activeDeck.pause()
      setState((prev) => ({ ...prev, isPlaying: false }))
    }
  }, [])

  const stop = useCallback(() => {
    transitionRef.current += 1
    cancelFade()
    decksRef.current.forEach((deck) => {
      if (!deck) return
      deck.pause()
      deck.currentTime = 0
      deck.src = ""
    })
    currentTrackRef.current = null
    pendingTrackRef.current = null
    setState((prev) => ({ ...prev, isPlaying: false, currentTrack: null, error: null }))
  }, [cancelFade])

  const fadeOutAndStop = useCallback(
    (fadeMs = DEFAULT_FADE_MS) => {
      const transition = ++transitionRef.current
      pendingTrackRef.current = null
      currentTrackRef.current = null
      cancelFade()

      const active = decksRef.current[activeDeckRef.current]
      setState((prev) => ({ ...prev, isPlaying: false, currentTrack: null, error: null }))

      if (!active || active.paused) {
        decksRef.current.forEach((deck) => {
          if (!deck) return
          deck.pause()
          deck.currentTime = 0
          deck.src = ""
        })
        return
      }

      const idle = decksRef.current[activeDeckRef.current === 0 ? 1 : 0]
      if (idle) {
        idle.pause()
        idle.src = ""
      }

      const startVolume = active.volume
      const startedAt = performance.now()

      const fade = (now: number) => {
        if (transition !== transitionRef.current) return

        const progress = Math.min(1, (now - startedAt) / Math.max(1, fadeMs))
        active.volume = startVolume * Math.cos((progress * Math.PI) / 2)

        if (progress < 1) {
          fadeRafRef.current = requestAnimationFrame(fade)
          return
        }

        fadeRafRef.current = 0
        active.pause()
        active.currentTime = 0
        active.src = ""
      }

      fadeRafRef.current = requestAnimationFrame(fade)
    },
    [cancelFade],
  )

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    volumeRef.current = clampedVolume
    const activeDeck = decksRef.current[activeDeckRef.current]
    if (activeDeck) {
      activeDeck.volume = clampedVolume
    }
    setState((prev) => ({ ...prev, volume: clampedVolume }))
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted
    decksRef.current.forEach((deck) => {
      if (deck) deck.muted = muted
    })
    setState((prev) => ({ ...prev, isMuted: muted }))
  }, [])

  useEffect(() => {
    return () => {
      transitionRef.current += 1
      pendingTrackRef.current = null
      cancelFade()
      decksRef.current.forEach((deck) => {
        if (!deck) return
        deck.pause()
        deck.src = ""
      })
    }
  }, [cancelFade])

  return {
    ...state,
    transitionToTrack,
    play,
    pause,
    stop,
    fadeOutAndStop,
    setVolume,
    setMuted,
  }
}
