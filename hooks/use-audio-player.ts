"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createTrailLoopEngine, type TrailLoopEngine } from "@/lib/trail-loop-engine"

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
  const engineRef = useRef<TrailLoopEngine | null>(null)
  const pendingTrackRef = useRef<string | null>(null)
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    volume: 0.7,
    isMuted: false,
    isLoading: false,
    error: null,
    currentTrack: null,
  })

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = createTrailLoopEngine({
        blobBase: process.env.NEXT_PUBLIC_AUDIO_CDN_URL,
      })
    }
    return engineRef.current
  }, [])

  useEffect(() => {
    const engine = getEngine()
    return engine.on((event) => {
      if (event.type === "loading") {
        setState((previous) => ({
          ...previous,
          isLoading: true,
          error: null,
          currentTrack: pendingTrackRef.current ?? previous.currentTrack,
        }))
        return
      }

      if (event.type === "playing") {
        setState((previous) => ({
          ...previous,
          isPlaying: true,
          isLoading: false,
          error: null,
          currentTrack: pendingTrackRef.current ?? previous.currentTrack,
        }))
        return
      }

      if (event.type === "stopped") {
        pendingTrackRef.current = null
        setState((previous) => ({
          ...previous,
          isPlaying: false,
          isLoading: false,
          currentTrack: null,
          error: null,
        }))
        return
      }

      setState((previous) => ({
        ...previous,
        isPlaying: false,
        isLoading: false,
        error: event.message,
      }))
    })
  }, [getEngine])

  const unlockAudio = useCallback(async () => {
    await getEngine().unlock()
  }, [getEngine])

  const resumeAudio = useCallback(async () => {
    await getEngine().resume()
  }, [getEngine])

  const suspendAudio = useCallback(async () => {
    await getEngine().suspend()
  }, [getEngine])

  const transitionToTrack = useCallback(
    async (track: AudioTrack, fadeMs = DEFAULT_FADE_MS) => {
      pendingTrackRef.current = track.id
      await getEngine().play(track.url, { fadeMs, volume: track.volume })
    },
    [getEngine],
  )

  const fadeOutAndStop = useCallback(
    (fadeMs = DEFAULT_FADE_MS) => {
      pendingTrackRef.current = null
      getEngine().stop(fadeMs)
    },
    [getEngine],
  )

  const prefetchLoop = useCallback(
    (...audioUrls: Array<string | undefined>) => {
      getEngine().prefetch(audioUrls.filter((url): url is string => Boolean(url)))
    },
    [getEngine],
  )

  const setVolume = useCallback(
    (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume))
      setState((previous) => ({ ...previous, volume: clamped }))
    },
    [],
  )

  const setMuted = useCallback(
    (muted: boolean) => {
      getEngine().setMuted(muted)
      setState((previous) => ({ ...previous, isMuted: muted }))
    },
    [getEngine],
  )

  return {
    ...state,
    transitionToTrack,
    fadeOutAndStop,
    unlockAudio,
    resumeAudio,
    suspendAudio,
    prefetchLoop,
    setVolume,
    setMuted,
  }
}
