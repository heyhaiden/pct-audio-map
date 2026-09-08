"use client"

import { useRef, useState, useCallback, useEffect } from "react"

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
      if (currentTrackRef.current === track.id) {
        if (pendingTrackRef.current && pendingTrackRef.current !== track.id) {
          transitionRef.current += 1
          pendingTrackRef.current = null
          const inactiveDeck = decksRef.current[activeDeckRef.current === 0 ? 1 : 0]
          if (inactiveDeck) {
            inactiveDeck.pause()
            inactiveDeck.src = ""
          }
          const activeDeck = decksRef.current[activeDeckRef.current]
          if (activeDeck) activeDeck.volume = currentTargetVolumeRef.current
          setState((previous) => ({ ...previous, isLoading: false, error: null }))
        }
        return true
      }

      const transition = ++transitionRef.current
      pendingTrackRef.current = track.id
      cancelFade()

      const outgoingIndex = activeDeckRef.current
      const incomingIndex = outgoingIndex === 0 ? 1 : 0
      const outgoing = decksRef.current[outgoingIndex]
      const incoming = getDeck(incomingIndex)
      const targetVolume = Math.max(0, Math.min(1, track.volume ?? volumeRef.current))

      incoming.pause()
      incoming.src = track.url
      incoming.currentTime = 0
      incoming.loop = track.loop ?? true
      incoming.volume = 0
      incoming.muted = mutedRef.current

      setState((previous) => ({ ...previous, isLoading: true, error: null }))

      try {
        await incoming.play()
      } catch {
        if (transition === transitionRef.current) {
          pendingTrackRef.current = null
          setState((previous) => ({
            ...previous,
            isLoading: false,
            error: "Failed to play audio",
          }))
        }
        incoming.src = ""
        return false
      }

      if (transition !== transitionRef.current) {
        incoming.pause()
        incoming.src = ""
        return false
      }

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

      const outgoingStartVolume = outgoing && !outgoing.paused ? outgoing.volume : 0
      const startedAt = performance.now()

      const fade = (now: number) => {
        if (transition !== transitionRef.current) return

        const progress = Math.min(1, (now - startedAt) / Math.max(1, fadeMs))
        incoming.volume = targetVolume * Math.sin((progress * Math.PI) / 2)
        if (outgoing) {
          outgoing.volume = outgoingStartVolume * Math.cos((progress * Math.PI) / 2)
        }

        if (progress < 1) {
          fadeRafRef.current = requestAnimationFrame(fade)
          return
        }

        fadeRafRef.current = 0
        incoming.volume = targetVolume
        if (outgoing) {
          outgoing.pause()
          outgoing.currentTime = 0
          outgoing.src = ""
        }
      }

      fadeRafRef.current = requestAnimationFrame(fade)
      return true
    },
    [cancelFade, getDeck],
  )

  const play = useCallback(() => {
    const activeDeck = decksRef.current[activeDeckRef.current]
    if (activeDeck) {
      activeDeck
        .play()
        .then(() => {
          setState((prev) => ({ ...prev, isPlaying: true }))
        })
        .catch(() => {
          setState((prev) => ({ ...prev, error: "Failed to play audio" }))
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
    setState((prev) => ({ ...prev, isPlaying: false, currentTrack: null }))
  }, [cancelFade])

  /**
   * Ease the current recording out instead of cutting it. Used on close, timed
   * to the camera's return to the scroll rail so sound and view land together.
   */
  const fadeOutAndStop = useCallback(
    (fadeMs = DEFAULT_FADE_MS) => {
      const transition = ++transitionRef.current
      pendingTrackRef.current = null
      currentTrackRef.current = null
      cancelFade()

      const active = decksRef.current[activeDeckRef.current]
      setState((prev) => ({ ...prev, isPlaying: false, currentTrack: null }))

      if (!active || active.paused) {
        decksRef.current.forEach((deck) => {
          if (!deck) return
          deck.pause()
          deck.currentTime = 0
          deck.src = ""
        })
        return
      }

      // The other deck may still be finishing a crossfade — cut it now.
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
