# Streaming Audio Player Architecture

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                        app/page.tsx                         │
│                    (Application Root)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ imports
                 │
┌────────────────▼────────────────────────────────────────────┐
│         components/audio/streaming-audio-player.tsx         │
│                    (UI Component)                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │  - Visual buffer indicator                         │     │
│  │  - Playback controls (play/pause/seek)             │     │
│  │  - Volume slider                                   │     │
│  │  - Playback rate selector                          │     │
│  │  - Error display                                   │     │
│  │  - Keyboard shortcuts                              │     │
│  │  - ARIA live regions                               │     │
│  └────────────────────────────────────────────────────┘     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ uses
                 │
┌────────────────▼────────────────────────────────────────────┐
│       hooks/use-streaming-audio-player.ts                   │
│           (State Management Hook)                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  StreamingPlayerState:                             │    │
│  │  - isPlaying, isLoading, isBuffering               │    │
│  │  - currentTime, duration, volume                   │    │
│  │  - bufferedRanges, bufferedPercentage              │    │
│  │  - error, retryCount, networkState                 │    │
│  │                                                    │    │
│  │  Controls:                                         │    │
│  │  - play(), pause(), seek()                         │    │
│  │  - setVolume(), setPlaybackRate()                  │    │
│  │  - skipForward(), skipBackward()                   │    │
│  │  - retry(), reset()                                │    │
│  └────────────────────────────────────────────────────┘    │
└───┬──────────────┬──────────────┬──────────────────────────┘
    │              │              │
    │ uses         │ uses         │ uses
    │              │              │
┌───▼──────────┐ ┌─▼────────────┐ ┌─▼─────────────────────────┐
│   lib/       │ │   hooks/     │ │   lib/                    │
│   audio-     │ │   use-audio- │ │   mobile-                 │
│   streaming  │ │   analytics  │ │   optimizations           │
└──────────────┘ └──────────────┘ └───────────────────────────┘
```

## Data Flow

```
User Action (Click/Keyboard)
        │
        ▼
┌───────────────────────┐
│  UI Component         │
│  (Event Handler)      │
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  Hook: controls.play()│
└───────┬───────────────┘
        │
        ├──────────────────────────┐
        │                          │
        ▼                          ▼
┌───────────────────┐    ┌────────────────────┐
│  HTML5 Audio API  │    │  Analytics Hook    │
│  (play audio)     │    │  (track event)     │
└───────┬───────────┘    └────────────────────┘
        │
        ▼
┌───────────────────────┐
│  Event Listeners      │
│  - timeupdate         │
│  - progress           │
│  - waiting            │
│  - playing            │
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  State Update         │
│  (React setState)     │
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  UI Re-render         │
│  (React render)       │
└───────────────────────┘
```

## Preloading Flow

```
Map Center Changes
        │
        ▼
┌───────────────────────────────────┐
│  useAudioPreloader                │
│  - Calculate nearby markers       │
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│  Check Device Capabilities        │
│  - Battery level > 20%?           │
│  - WiFi connection?               │
│  - Data saver off?                │
│  - Low power mode off?            │
└───────┬───────────────────────────┘
        │
        │ Yes (all checks pass)
        ▼
┌───────────────────────────────────┐
│  Distance Calculation             │
│  - Haversine formula              │
│  - Filter markers within 50km     │
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│  Concurrent Preload Queue         │
│  - Max 2-3 simultaneous           │
│  - AbortController per download   │
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│  Fetch with Progress Tracking     │
│  - Range requests                 │
│  - ReadableStream chunks          │
│  - Bandwidth estimation           │
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│  Cache with Expiration            │
│  - Blob storage                   │
│  - 1 hour TTL                     │
│  - Automatic cleanup              │
└───────────────────────────────────┘
```

## Analytics Pipeline

```
Audio Event (play, pause, seek, etc.)
        │
        ▼
┌───────────────────────────────────┐
│  useAudioAnalytics Hook           │
│  - Track event in memory          │
│  - Update running metrics         │
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│  Analytics State                  │
│  - totalPlayTime                  │
│  - seekCount                      │
│  - stallCount                     │
│  - bandwidth estimate             │
│  - etc.                           │
└───────┬───────────────────────────┘
        │
        │ On session end
        ▼
┌───────────────────────────────────┐
│  Callback: onSessionEnd()         │
│  - Pass analytics object          │
└───────┬───────────────────────────┘
        │
        │ (Optional)
        ▼
┌───────────────────────────────────┐
│  Send to Analytics Service        │
│  - POST /api/analytics/audio      │
│  - Or third-party service         │
└───────────────────────────────────┘
```

## Mobile Optimization Decision Tree

```
User opens audio player
        │
        ▼
┌───────────────────────┐
│ Check isMobile()      │
└───────┬───────────────┘
        │
        ├── No ──────────────────────────────┐
        │                                    │
        │ Yes                                │
        ▼                                    │
┌───────────────────────┐                   │
│ Check Battery Level   │                   │
└───────┬───────────────┘                   │
        │                                    │
        ├── < 20% and not charging          │
        │   │                                │
        │   └──> Disable preload             │
        │                                    │
        ├── Low power mode                  │
        │   │                                │
        │   └──> Disable preload             │
        │                                    │
        ▼                                    │
┌───────────────────────┐                   │
│ Check Connection      │                   │
└───────┬───────────────┘                   │
        │                                    │
        ├── 2G/Slow 2G                      │
        │   │                                │
        │   └──> Disable preload             │
        │                                    │
        ├── Data saver ON                   │
        │   │                                │
        │   └──> Disable preload             │
        │                                    │
        ├── Cellular (WiFi only mode)       │
        │   │                                │
        │   └──> Disable preload             │
        │                                    │
        ▼                                    │
┌───────────────────────┐                   │
│ Enable Preload        │◄──────────────────┘
└───────────────────────┘
```

## Error Handling Flow

```
Audio Error Occurs
        │
        ▼
┌───────────────────────────────────┐
│  Categorize Error                 │
│  - NETWORK_ERROR                  │
│  - DECODE_ERROR                   │
│  - NOT_SUPPORTED                  │
│  - ABORTED                        │
│  - STALLED                        │
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│  Determine if Recoverable         │
└───────┬───────────────────────────┘
        │
        ├── Yes (Network error, etc.)
        │   │
        │   ▼
        │  ┌─────────────────────────┐
        │  │ Check Retry Count       │
        │  └───┬─────────────────────┘
        │      │
        │      ├── < 3 attempts
        │      │   │
        │      │   ▼
        │      │  ┌──────────────────┐
        │      │  │ Wait (1s * count)│
        │      │  └───┬──────────────┘
        │      │      │
        │      │      ▼
        │      │  ┌──────────────────┐
        │      │  │ Retry Load       │
        │      │  └──────────────────┘
        │      │
        │      └── >= 3 attempts
        │          │
        │          ▼
        │      ┌──────────────────────┐
        │      │ Show Error Message   │
        │      │ (with retry button)  │
        │      └──────────────────────┘
        │
        └── No (Decode error, etc.)
            │
            ▼
        ┌──────────────────────┐
        │ Show Error Message   │
        │ (non-recoverable)    │
        └──────────────────────┘
```

## Keyboard Event Handling

```
Keydown Event
        │
        ▼
┌───────────────────────────────────┐
│  Check if input focused           │
└───────┬───────────────────────────┘
        │
        ├── Yes ──> Ignore (let user type)
        │
        └── No
            │
            ▼
┌───────────────────────────────────┐
│  Match Key Code                   │
└───────┬───────────────────────────┘
        │
        ├── Space/K ──────────────┐
        │                         │
        ├── J/ArrowLeft ──────────┤
        │                         │
        ├── L/ArrowRight ─────────┤
        │                         │
        ├── ArrowUp ──────────────┤
        │                         │
        ├── ArrowDown ────────────┤
        │                         │
        ├── M ────────────────────┤
        │                         │
        ├── > ────────────────────┤
        │                         │
        └── < ────────────────────┤
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ Execute Action   │
                        └────┬─────────────┘
                             │
                             ▼
                        ┌──────────────────┐
                        │ Update Live      │
                        │ Region for SR    │
                        └──────────────────┘
```

## Type System Overview

```
types/audio-streaming.ts
│
├── StreamingPlayerState
│   ├── playback state (isPlaying, currentTime, etc.)
│   ├── buffer state (bufferedRanges, bufferedPercentage)
│   ├── error state (error, retryCount)
│   └── network state (networkState, readyState)
│
├── AudioError
│   ├── code (AudioErrorCode enum)
│   ├── message
│   ├── timestamp
│   ├── recoverable
│   └── retryAfter
│
├── AudioAnalytics
│   ├── playback metrics (totalPlayTime, completionRate)
│   ├── performance metrics (TTFB, timeToPlay)
│   ├── network metrics (bandwidth, bytesTransferred)
│   └── session info (start, end, userAgent)
│
├── PreloadConfig
│   ├── enabled
│   ├── maxDistance
│   ├── maxConcurrent
│   ├── minBatteryLevel
│   └── wifiOnly
│
└── MobileOptimizations
    ├── device info (isMobile, isLowPowerMode)
    ├── battery info (level, charging)
    ├── network info (connectionType, effectiveType)
    └── preferences (saveData, reducedMotion)
```
