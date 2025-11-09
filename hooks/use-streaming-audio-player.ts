/**
 * Main streaming audio player hook with buffer management
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  StreamingPlayerState,
  AudioPlayerControls,
  AudioError,
  AudioErrorCode,
  NetworkState,
  AudioReadyState,
  SEEK_INCREMENT,
  VOLUME_INCREMENT,
  STALL_TIMEOUT,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY,
  PlaybackRate
} from '@/types/audio-streaming';
import { BandwidthEstimator } from '@/lib/audio-streaming';
import { useAudioAnalytics } from './use-audio-analytics';

interface UseStreamingAudioPlayerOptions {
  autoPlay?: boolean;
  volume?: number;
  playbackRate?: number;
  onEnded?: () => void;
  onError?: (error: AudioError) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  analyticsEnabled?: boolean;
}

export function useStreamingAudioPlayer(
  options: UseStreamingAudioPlayerOptions = {}
) {
  const {
    autoPlay = false,
    volume: initialVolume = 0.8,
    playbackRate: initialPlaybackRate = 1,
    onEnded,
    onError,
    onTimeUpdate,
    onLoadStart,
    onCanPlay,
    analyticsEnabled = true
  } = options;

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bandwidth estimator
  const bandwidthEstimatorRef = useRef(new BandwidthEstimator());

  // Stall detection timer
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimeUpdateRef = useRef<number>(0);

  // Stable callback refs to prevent infinite loops
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onLoadStartRef = useRef(onLoadStart);
  const onCanPlayRef = useRef(onCanPlay);

  // Update refs when callbacks change
  useEffect(() => {
    onEndedRef.current = onEnded;
    onErrorRef.current = onError;
    onTimeUpdateRef.current = onTimeUpdate;
    onLoadStartRef.current = onLoadStart;
    onCanPlayRef.current = onCanPlay;
  }, [onEnded, onError, onTimeUpdate, onLoadStart, onCanPlay]);

  // Load start timestamp for analytics
  const loadStartTimeRef = useRef<number>(0);

  // Memoize analytics callback to prevent infinite loops
  const handleSessionEnd = useCallback((data: any) => {
    console.log('Audio session ended:', data);
    // In production, send to your analytics service
  }, []);

  // Analytics hook
  const analytics = useAudioAnalytics({
    enabled: analyticsEnabled,
    onSessionEnd: handleSessionEnd
  });

  // Player state
  const [state, setState] = useState<StreamingPlayerState>({
    isPlaying: false,
    isLoading: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
    volume: initialVolume,
    playbackRate: initialPlaybackRate,
    bufferedRanges: null,
    bufferedPercentage: 0,
    error: null,
    retryCount: 0,
    networkState: NetworkState.EMPTY,
    readyState: AudioReadyState.HAVE_NOTHING,
    audioId: null,
    audioUrl: null
  });

  /**
   * Update buffered ranges and percentage
   */
  const updateBufferedRanges = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const buffered = audio.buffered;
    let bufferedPercentage = 0;

    if (buffered.length > 0 && audio.duration > 0) {
      // Find the buffered range that contains current time
      for (let i = 0; i < buffered.length; i++) {
        if (
          buffered.start(i) <= audio.currentTime &&
          buffered.end(i) >= audio.currentTime
        ) {
          bufferedPercentage = (buffered.end(i) / audio.duration) * 100;
          break;
        }
      }

      // Track buffer health in analytics
      analytics.trackBufferHealth(bufferedPercentage);
    }

    setState((prev) => ({
      ...prev,
      bufferedRanges: buffered,
      bufferedPercentage
    }));
  }, [analytics]);

  /**
   * Handle audio errors
   */
  const handleError = useCallback(
    (errorCode: AudioErrorCode, message: string, recoverable = true) => {
      const error: AudioError = {
        code: errorCode,
        message,
        timestamp: Date.now(),
        recoverable,
        retryAfter: recoverable ? RETRY_DELAY : undefined
      };

      setState((prev) => ({
        ...prev,
        error,
        isLoading: false,
        isBuffering: false
      }));

      analytics.trackError();

      if (onErrorRef.current) {
        onErrorRef.current(error);
      }

      console.error('Audio player error:', error);
    },
    [analytics]
  );

  /**
   * Clear stall detection timer
   */
  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  /**
   * Start stall detection
   */
  const startStallDetection = useCallback(() => {
    clearStallTimer();

    stallTimerRef.current = setTimeout(() => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;

      // Check if playback has stalled
      if (audio.currentTime === lastTimeUpdateRef.current) {
        setState((prev) => ({ ...prev, isBuffering: true }));
        analytics.trackStall();
      }

      // Restart detection
      startStallDetection();
    }, STALL_TIMEOUT);
  }, [clearStallTimer, analytics]);

  /**
   * Load audio source
   */
  const loadAudio = useCallback(
    async (audioId: string, audioUrl: string) => {
      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Reset state
      setState((prev) => ({
        ...prev,
        isLoading: true,
        isPlaying: false,
        isBuffering: false,
        currentTime: 0,
        duration: 0,
        error: null,
        retryCount: 0,
        audioId,
        audioUrl
      }));

      // Initialize analytics
      analytics.initializeSession(audioId, audioUrl);

      loadStartTimeRef.current = Date.now();

      if (onLoadStartRef.current) {
        onLoadStartRef.current();
      }

      // Create new audio element if needed
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;

      // Set initial properties
      audio.volume = state.volume;
      audio.playbackRate = state.playbackRate;
      audio.preload = 'auto';

      // Load the source
      audio.src = audioUrl;
      audio.load();
    },
    [analytics, onLoadStart, state.volume, state.playbackRate]
  );

  /**
   * Play audio
   */
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !state.audioUrl) return;

    try {
      await audio.play();

      setState((prev) => ({
        ...prev,
        isPlaying: true,
        error: null
      }));

      startStallDetection();

      // Track time to play on first play
      if (loadStartTimeRef.current > 0) {
        const timeToPlay = Date.now() - loadStartTimeRef.current;
        analytics.trackTimeToPlay(timeToPlay);
        loadStartTimeRef.current = 0;
      }
    } catch (error) {
      handleError(
        AudioErrorCode.ABORTED,
        error instanceof Error ? error.message : 'Failed to play audio',
        true
      );
    }
  }, [state.audioUrl, startStallDetection, analytics, handleError]);

  /**
   * Pause audio
   */
  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();

    setState((prev) => ({
      ...prev,
      isPlaying: false
    }));

    clearStallTimer();
  }, [clearStallTimer]);

  /**
   * Seek to time
   */
  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio || !audio.duration) return;

      const clampedTime = Math.max(0, Math.min(time, audio.duration));
      audio.currentTime = clampedTime;

      analytics.trackSeek();

      setState((prev) => ({
        ...prev,
        currentTime: clampedTime
      }));
    },
    [analytics]
  );

  /**
   * Set volume
   */
  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (audio) {
      audio.volume = clampedVolume;
    }

    setState((prev) => ({
      ...prev,
      volume: clampedVolume
    }));
  }, []);

  /**
   * Set playback rate
   */
  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    const audio = audioRef.current;

    if (audio) {
      audio.playbackRate = rate;
    }

    setState((prev) => ({
      ...prev,
      playbackRate: rate
    }));
  }, []);

  /**
   * Skip forward
   */
  const skipForward = useCallback(
    (seconds: number = SEEK_INCREMENT) => {
      const audio = audioRef.current;
      if (!audio) return;

      seek(audio.currentTime + seconds);
    },
    [seek]
  );

  /**
   * Skip backward
   */
  const skipBackward = useCallback(
    (seconds: number = SEEK_INCREMENT) => {
      const audio = audioRef.current;
      if (!audio) return;

      seek(audio.currentTime - seconds);
    },
    [seek]
  );

  /**
   * Retry after error
   */
  const retry = useCallback(async () => {
    if (state.retryCount >= MAX_RETRY_ATTEMPTS) {
      handleError(
        AudioErrorCode.NETWORK_ERROR,
        'Maximum retry attempts reached',
        false
      );
      return;
    }

    if (!state.audioId || !state.audioUrl) return;

    setState((prev) => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      error: null
    }));

    await loadAudio(state.audioId, state.audioUrl);
    if (autoPlay) {
      await play();
    }
  }, [state.retryCount, state.audioId, state.audioUrl, handleError, loadAudio, autoPlay, play]);

  /**
   * Reset player
   */
  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }

    clearStallTimer();
    bandwidthEstimatorRef.current.reset();
    analytics.endSession();

    setState({
      isPlaying: false,
      isLoading: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      volume: initialVolume,
      playbackRate: initialPlaybackRate,
      bufferedRanges: null,
      bufferedPercentage: 0,
      error: null,
      retryCount: 0,
      networkState: NetworkState.EMPTY,
      readyState: AudioReadyState.HAVE_NOTHING,
      audioId: null,
      audioUrl: null
    });
  }, [clearStallTimer, analytics, initialVolume, initialPlaybackRate]);

  /**
   * Set up audio event listeners
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setState((prev) => ({ ...prev, isLoading: true }));
    };

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
        readyState: audio.readyState as AudioReadyState,
        networkState: audio.networkState as NetworkState
      }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        readyState: audio.readyState as AudioReadyState
      }));

      if (onCanPlayRef.current) {
        onCanPlayRef.current();
      }
    };

    const handlePlaying = () => {
      setState((prev) => ({
        ...prev,
        isBuffering: false
      }));
    };

    const handleWaiting = () => {
      setState((prev) => ({
        ...prev,
        isBuffering: true
      }));
    };

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;

      setState((prev) => ({
        ...prev,
        currentTime
      }));

      lastTimeUpdateRef.current = currentTime;

      analytics.trackCompletion(currentTime, audio.duration);

      if (onTimeUpdateRef.current) {
        onTimeUpdateRef.current(currentTime);
      }
    };

    const handleProgress = () => {
      updateBufferedRanges();
    };

    const handleEnded = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false
      }));

      clearStallTimer();
      analytics.endSession();

      if (onEndedRef.current) {
        onEndedRef.current();
      }
    };

    const handleAudioError = () => {
      const error = audio.error;
      let errorCode = AudioErrorCode.UNKNOWN;
      let message = 'Unknown error occurred';

      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorCode = AudioErrorCode.ABORTED;
            message = 'Audio loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorCode = AudioErrorCode.NETWORK_ERROR;
            message = 'Network error occurred while loading audio';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorCode = AudioErrorCode.DECODE_ERROR;
            message = 'Audio decoding failed';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorCode = AudioErrorCode.NOT_SUPPORTED;
            message = 'Audio format not supported';
            break;
        }
      }

      handleError(errorCode, message, errorCode === AudioErrorCode.NETWORK_ERROR);
    };

    const handleStalled = () => {
      setState((prev) => ({
        ...prev,
        isBuffering: true
      }));
      analytics.trackStall();
    };

    // Attach listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleAudioError);
    audio.addEventListener('stalled', handleStalled);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleAudioError);
      audio.removeEventListener('stalled', handleStalled);
    };
  }, [
    updateBufferedRanges,
    clearStallTimer,
    analytics,
    handleError
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearStallTimer();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [clearStallTimer]);

  const controls: AudioPlayerControls = {
    play,
    pause,
    seek,
    setVolume,
    setPlaybackRate,
    skipForward,
    skipBackward,
    retry,
    reset
  };

  return {
    state,
    controls,
    audioRef,
    loadAudio
  };
}
