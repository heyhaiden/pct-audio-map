"use client"

import { useRef, useState, useCallback, useEffect } from "react"

interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isLoading: boolean
  error: string | null
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isLoading: false,
    error: null,
  })

  const [currentTrack, setCurrentTrack] = useState<string | null>(null)

  const loadTrack = useCallback(
    (audioUrl: string) => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      // Create new audio element
      const audio = new Audio()
      audio.preload = "metadata"
      audio.volume = state.volume
      audio.loop = true // Enable looped playback by default

      audio.addEventListener("loadedmetadata", () => {
        setState((prev) => ({
          ...prev,
          duration: audio.duration,
          isLoading: false,
        }))
      })

      audio.addEventListener("timeupdate", () => {
        setState((prev) => ({
          ...prev,
          currentTime: audio.currentTime,
        }))
      })

      audio.addEventListener("ended", () => {
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          currentTime: 0,
        }))
      })

      audio.addEventListener("error", () => {
        setState((prev) => ({
          ...prev,
          error: "Failed to load audio",
          isLoading: false,
        }))
      })

      audio.src = audioUrl
      audioRef.current = audio
      setCurrentTrack(audioUrl)
    },
    [state.volume],
  )

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current
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
    if (audioRef.current) {
      audioRef.current.pause()
      setState((prev) => ({ ...prev, isPlaying: false }))
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }))
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setState((prev) => ({ ...prev, currentTime: time }))
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume
    }
    setState((prev) => ({ ...prev, volume: clampedVolume }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  return {
    ...state,
    currentTrack,
    loadTrack,
    play,
    pause,
    stop,
    seek,
    setVolume,
  }
}
