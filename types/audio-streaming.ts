/**
 * Enhanced type definitions for streaming audio player
 */

export interface StreamingPlayerState {
  // Playback state
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;

  // Buffer state
  bufferedRanges: TimeRanges | null;
  bufferedPercentage: number;

  // Error handling
  error: AudioError | null;
  retryCount: number;

  // Network state
  networkState: NetworkState;
  readyState: AudioReadyState;

  // Metadata
  audioId: string | null;
  audioUrl: string | null;
}

export interface AudioError {
  code: AudioErrorCode;
  message: string;
  timestamp: number;
  recoverable: boolean;
  retryAfter?: number; // milliseconds
}

export enum AudioErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  DECODE_ERROR = 'DECODE_ERROR',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  ABORTED = 'ABORTED',
  STALLED = 'STALLED',
  UNKNOWN = 'UNKNOWN'
}

export enum NetworkState {
  EMPTY = 0,
  IDLE = 1,
  LOADING = 2,
  NO_SOURCE = 3
}

export enum AudioReadyState {
  HAVE_NOTHING = 0,
  HAVE_METADATA = 1,
  HAVE_CURRENT_DATA = 2,
  HAVE_FUTURE_DATA = 3,
  HAVE_ENOUGH_DATA = 4
}

export interface AudioAnalytics {
  audioId: string;
  audioUrl: string;

  // Playback metrics
  totalPlayTime: number; // seconds
  completionRate: number; // 0-1
  seekCount: number;
  stallCount: number;
  errorCount: number;

  // Performance metrics
  timeToFirstByte: number; // milliseconds
  timeToPlay: number; // milliseconds
  averageBufferHealth: number; // percentage

  // Network metrics
  estimatedBandwidth: number; // bytes per second
  totalBytesTransferred: number;

  // Session info
  sessionStart: number; // timestamp
  sessionEnd: number; // timestamp
  userAgent: string;
  connectionType: string;
}

export interface PreloadConfig {
  enabled: boolean;
  maxDistance: number; // km from current marker
  maxConcurrent: number; // max simultaneous preloads
  minBatteryLevel: number; // 0-1, don't preload below this
  wifiOnly: boolean; // only preload on WiFi
}

export interface PreloadedAudio {
  audioId: string;
  audioUrl: string;
  blob: Blob;
  expiresAt: number; // timestamp
  size: number; // bytes
}

export interface BandwidthEstimate {
  bytesPerSecond: number;
  confidence: number; // 0-1
  lastUpdated: number; // timestamp
  measurementCount: number;
}

export interface MobileOptimizations {
  isMobile: boolean;
  isLowPowerMode: boolean;
  batteryLevel: number; // 0-1
  isCharging: boolean;
  connectionType: ConnectionType;
  effectiveConnectionType: EffectiveConnectionType;
  saveData: boolean;
  reducedMotion: boolean;
}

export enum ConnectionType {
  WIFI = 'wifi',
  CELLULAR = 'cellular',
  ETHERNET = 'ethernet',
  UNKNOWN = 'unknown',
  NONE = 'none'
}

export enum EffectiveConnectionType {
  SLOW_2G = 'slow-2g',
  TWO_G = '2g',
  THREE_G = '3g',
  FOUR_G = '4g',
  UNKNOWN = 'unknown'
}

export interface AudioPlayerControls {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  retry: () => Promise<void>;
  reset: () => void;
}

export interface KeyboardShortcuts {
  playPause: string[]; // e.g., ['Space', 'k']
  seekForward: string[]; // e.g., ['l', 'ArrowRight']
  seekBackward: string[]; // e.g., ['j', 'ArrowLeft']
  volumeUp: string[]; // e.g., ['ArrowUp']
  volumeDown: string[]; // e.g., ['ArrowDown']
  speedUp: string[]; // e.g., ['>']
  speedDown: string[]; // e.g., ['<']
  mute: string[]; // e.g., ['m']
}

export interface AccessibilityState {
  liveRegionMessage: string;
  focusedControl: string | null;
  keyboardNavigationEnabled: boolean;
}

// Constants
export const DEFAULT_PRELOAD_CONFIG: PreloadConfig = {
  enabled: true,
  maxDistance: 50, // km
  maxConcurrent: 3,
  minBatteryLevel: 0.2, // 20%
  wifiOnly: false
};

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  playPause: ['Space', 'k'],
  seekForward: ['l', 'ArrowRight'],
  seekBackward: ['j', 'ArrowLeft'],
  volumeUp: ['ArrowUp'],
  volumeDown: ['ArrowDown'],
  speedUp: ['>'],
  speedDown: ['<'],
  mute: ['m']
};

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type PlaybackRate = typeof PLAYBACK_RATES[number];

export const SEEK_INCREMENT = 10; // seconds
export const VOLUME_INCREMENT = 0.1; // 10%
export const STALL_TIMEOUT = 3000; // milliseconds
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000; // milliseconds
