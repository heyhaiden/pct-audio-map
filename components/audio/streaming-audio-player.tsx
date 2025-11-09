/**
 * Enhanced streaming audio player component with accessibility and mobile optimizations
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useStreamingAudioPlayer } from "@/hooks/use-streaming-audio-player";
import type { AudioMarker } from "@/types/map";
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  PLAYBACK_RATES,
  SEEK_INCREMENT,
  VOLUME_INCREMENT,
  type PlaybackRate
} from "@/types/audio-streaming";
import { formatTime } from "@/lib/audio-streaming";
import { prefersReducedMotion } from "@/lib/mobile-optimizations";

interface StreamingAudioPlayerProps {
  marker: AudioMarker | null;
  onClose: () => void;
}

export function StreamingAudioPlayer({
  marker,
  onClose
}: StreamingAudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPlaybackRateMenu, setShowPlaybackRateMenu] = useState(false);
  const [liveRegion, setLiveRegion] = useState("");
  const reducedMotion = prefersReducedMotion();

  const { state, controls, loadAudio } = useStreamingAudioPlayer({
    autoPlay: false,
    volume: 0.8,
    playbackRate: 1,
    analyticsEnabled: true,
    onEnded: () => {
      setLiveRegion("Audio playback ended");
    },
    onError: (error) => {
      setLiveRegion(`Error: ${error.message}`);
    },
    onTimeUpdate: () => {
      // Optional: update live region periodically
    }
  });

  // Load audio when marker changes
  useEffect(() => {
    if (marker) {
      loadAudio(marker.id, marker.audioUrl);
    }
  }, [marker, loadAudio]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const shortcuts = DEFAULT_KEYBOARD_SHORTCUTS;

      // Play/Pause
      if (shortcuts.playPause.includes(e.code) || shortcuts.playPause.includes(e.key)) {
        e.preventDefault();
        if (state.isPlaying) {
          controls.pause();
          setLiveRegion("Paused");
        } else {
          controls.play();
          setLiveRegion("Playing");
        }
      }

      // Seek forward
      else if (shortcuts.seekForward.includes(e.code) || shortcuts.seekForward.includes(e.key)) {
        e.preventDefault();
        controls.skipForward(SEEK_INCREMENT);
        setLiveRegion(`Forward ${SEEK_INCREMENT} seconds`);
      }

      // Seek backward
      else if (shortcuts.seekBackward.includes(e.code) || shortcuts.seekBackward.includes(e.key)) {
        e.preventDefault();
        controls.skipBackward(SEEK_INCREMENT);
        setLiveRegion(`Backward ${SEEK_INCREMENT} seconds`);
      }

      // Volume up
      else if (shortcuts.volumeUp.includes(e.code)) {
        e.preventDefault();
        const newVolume = Math.min(1, state.volume + VOLUME_INCREMENT);
        controls.setVolume(newVolume);
        setLiveRegion(`Volume ${Math.round(newVolume * 100)}%`);
      }

      // Volume down
      else if (shortcuts.volumeDown.includes(e.code)) {
        e.preventDefault();
        const newVolume = Math.max(0, state.volume - VOLUME_INCREMENT);
        controls.setVolume(newVolume);
        setLiveRegion(`Volume ${Math.round(newVolume * 100)}%`);
      }

      // Mute
      else if (shortcuts.mute.includes(e.key)) {
        e.preventDefault();
        controls.setVolume(state.volume > 0 ? 0 : 0.8);
        setLiveRegion(state.volume > 0 ? "Muted" : "Unmuted");
      }

      // Speed up
      else if (shortcuts.speedUp.includes(e.key)) {
        e.preventDefault();
        const currentIndex = PLAYBACK_RATES.indexOf(state.playbackRate as PlaybackRate);
        if (currentIndex < PLAYBACK_RATES.length - 1) {
          const newRate = PLAYBACK_RATES[currentIndex + 1];
          controls.setPlaybackRate(newRate);
          setLiveRegion(`Speed ${newRate}x`);
        }
      }

      // Speed down
      else if (shortcuts.speedDown.includes(e.key)) {
        e.preventDefault();
        const currentIndex = PLAYBACK_RATES.indexOf(state.playbackRate as PlaybackRate);
        if (currentIndex > 0) {
          const newRate = PLAYBACK_RATES[currentIndex - 1];
          controls.setPlaybackRate(newRate);
          setLiveRegion(`Speed ${newRate}x`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, controls]);

  // Focus management - focus container when opened
  useEffect(() => {
    if (marker && containerRef.current) {
      containerRef.current.focus();
    }
  }, [marker]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * state.duration;
      controls.seek(newTime);
      setLiveRegion(`Seeking to ${formatTime(newTime)}`);
    },
    [controls, state.duration]
  );

  const handleVolumeChange = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      controls.setVolume(percentage);
      setLiveRegion(`Volume ${Math.round(percentage * 100)}%`);
    },
    [controls]
  );

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  if (!marker) return null;

  return (
    <>
      {/* Screen reader live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveRegion}
      </div>

      <div
        ref={containerRef}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
        role="region"
        aria-label="Audio player"
        tabIndex={-1}
      >
        <div className="bg-black/90 backdrop-blur-sm rounded-xl p-6 text-white shadow-2xl border border-white/10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-balance" id="audio-title">
                {marker.name}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Elevation: {marker.elevation.toLocaleString()} ft
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close audio player"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <time aria-label="Current time">{formatTime(state.currentTime)}</time>
              <time aria-label="Duration">{formatTime(state.duration)}</time>
            </div>
            <div
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={state.duration}
              aria-valuenow={state.currentTime}
              aria-valuetext={`${formatTime(state.currentTime)} of ${formatTime(state.duration)}`}
              tabIndex={0}
              className="w-full h-2 bg-white/20 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 relative"
              onClick={handleSeek}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  controls.skipBackward(5);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  controls.skipForward(5);
                }
              }}
            >
              {/* Buffered indicator */}
              <div
                className="absolute inset-0 bg-white/10 rounded-full"
                style={{ width: `${state.bufferedPercentage}%` }}
                aria-hidden="true"
              />
              {/* Progress indicator */}
              <div
                className={`absolute inset-0 bg-[#ff6b9d] rounded-full ${
                  reducedMotion ? "" : "transition-all duration-150"
                }`}
                style={{ width: `${progress}%` }}
                aria-hidden="true"
              />
            </div>

            {/* Buffer indicator text */}
            {state.isBuffering && (
              <p className="text-xs text-gray-400 mt-1 text-center">
                Buffering... {Math.round(state.bufferedPercentage)}%
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Playback rate */}
            <div className="relative">
              <button
                onClick={() => setShowPlaybackRateMenu(!showPlaybackRateMenu)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label={`Playback speed: ${state.playbackRate}x`}
                aria-expanded={showPlaybackRateMenu}
                aria-haspopup="menu"
              >
                <span className="text-xs font-medium">{state.playbackRate}x</span>
              </button>

              {/* Playback rate menu */}
              {showPlaybackRateMenu && (
                <div
                  role="menu"
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/95 rounded-lg py-1 min-w-[60px] border border-white/10"
                >
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      role="menuitem"
                      onClick={() => {
                        controls.setPlaybackRate(rate);
                        setShowPlaybackRateMenu(false);
                        setLiveRegion(`Speed ${rate}x`);
                      }}
                      className={`w-full px-3 py-1 text-sm hover:bg-white/10 transition-colors text-center ${
                        state.playbackRate === rate ? "text-[#ff6b9d]" : ""
                      }`}
                      aria-current={state.playbackRate === rate}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Skip backward */}
            <button
              onClick={() => {
                controls.skipBackward(SEEK_INCREMENT);
                setLiveRegion(`Backward ${SEEK_INCREMENT} seconds`);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label={`Rewind ${SEEK_INCREMENT} seconds`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => {
                if (state.isPlaying) {
                  controls.pause();
                  setLiveRegion("Paused");
                } else {
                  controls.play();
                  setLiveRegion("Playing");
                }
              }}
              disabled={state.isLoading}
              className="p-3 bg-[#ff6b9d] hover:bg-[#ff5a8a] rounded-full transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label={state.isPlaying ? "Pause" : "Play"}
            >
              {state.isLoading || state.isBuffering ? (
                <div
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
              ) : state.isPlaying ? (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={() => {
                controls.skipForward(SEEK_INCREMENT);
                setLiveRegion(`Forward ${SEEK_INCREMENT} seconds`);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label={`Forward ${SEEK_INCREMENT} seconds`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                />
              </svg>
            </button>

            {/* Retry button (shown on error) */}
            {state.error && state.error.recoverable && (
              <button
                onClick={() => {
                  controls.retry();
                  setLiveRegion("Retrying...");
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Retry"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => controls.setVolume(state.volume > 0 ? 0 : 0.8)}
              className="focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
              aria-label={state.volume > 0 ? "Mute" : "Unmute"}
            >
              <svg
                className="w-4 h-4 text-gray-400"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {state.volume === 0 ? (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                ) : (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                )}
              </svg>
            </button>
            <div
              role="slider"
              aria-label="Volume"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(state.volume * 100)}
              aria-valuetext={`${Math.round(state.volume * 100)}%`}
              tabIndex={0}
              className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 relative"
              onClick={handleVolumeChange}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  controls.setVolume(Math.max(0, state.volume - VOLUME_INCREMENT));
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  controls.setVolume(Math.min(1, state.volume + VOLUME_INCREMENT));
                }
              }}
            >
              <div
                className={`h-full bg-white rounded-full ${
                  reducedMotion ? "" : "transition-all duration-150"
                }`}
                style={{ width: `${state.volume * 100}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right" aria-hidden="true">
              {Math.round(state.volume * 100)}
            </span>
          </div>

          {/* Error message */}
          {state.error && (
            <div
              role="alert"
              className="mt-3 text-sm text-red-400 text-center p-2 bg-red-500/10 rounded"
            >
              {state.error.message}
              {state.error.recoverable && state.retryCount < 3 && (
                <span className="block mt-1 text-xs">
                  Click retry or it will retry automatically
                </span>
              )}
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <details className="mt-3 text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded">
              Keyboard shortcuts
            </summary>
            <dl className="mt-2 space-y-1 pl-4">
              <div className="flex gap-2">
                <dt className="font-mono">Space/K:</dt>
                <dd>Play/Pause</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-mono">J/←:</dt>
                <dd>Skip back</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-mono">L/→:</dt>
                <dd>Skip forward</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-mono">↑/↓:</dt>
                <dd>Volume</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-mono">&lt;/&gt;:</dt>
                <dd>Speed</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-mono">M:</dt>
                <dd>Mute</dd>
              </div>
            </dl>
          </details>
        </div>
      </div>
    </>
  );
}
