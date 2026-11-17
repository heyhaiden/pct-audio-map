# Perf baseline

Date: 2026-11-16. Code: `dev` at `4a9b4ba` plus the instrumentation in PR #58.

## Method

- Production build (`next build --no-mangling`) served locally, PostHog pointed at a dead local port so no lab events reach project 335511.
- Chrome 157 driven over CDP through Playwright: viewport 390x844 at DPR 3 with touch, CPU throttle 4x, network Fast 4G (9 Mbps down, 1.5 Mbps up, 165 ms latency), cold cache and storage per run.
- The Chrome DevTools MCP browser was held by another session, so traces came from the same CDP domains directly: `longtask`, `long-animation-frame` and `event` performance entries, a `requestAnimationFrame` frame clock, and the CDP CPU profiler.
- Three unprofiled runs per scenario, median reported. Profiles come from separate runs so sampling doesn't skew the timings.
- Host is an Apple M3. GPU cost on a phone is not represented; main-thread JavaScript at 4x is.

## Field data (PostHog, 14 days to 2026-11-16, homepage, p75)

| Interaction | Samples | INP | Processing | Input delay | Presentation |
| --- | --- | --- | --- | --- | --- |
| "Begin Journey" button | 44 | 282 ms | 240 ms | 4 ms | 39 ms |
| Map canvas tap | 30 | 288 ms | 90 ms | 42 ms | 118 ms |
| Splash body | 7 | 296 ms | 7 ms | 67 ms | 231 ms |

Split by platform, the "Begin Journey" processing time is not uniform:

| Platform | Samples | Processing p50 | Processing p75 | Presentation p75 |
| --- | --- | --- | --- | --- |
| iOS, Facebook in-app | 18 | 132 ms | 193 ms | 9 ms |
| iOS, Safari | 9 | 258 ms | 283 ms | 12 ms |
| Android, Chrome | 6 | 42 ms | 45 ms | 39 ms |
| Windows, Chrome | 3 | n/a | 349 ms | 88 ms |
| macOS, Chrome | 3 | n/a | 15 ms | 322 ms |

Map canvas taps on desktop Chrome (3 samples) have 2 ms of processing and 327 to 602 ms of presentation delay.

## Lab results (median of 3)

### 1. Cold load, "Begin Journey", intro

| Measure | Value |
| --- | --- |
| `map_ready_ms` (6 runs) | 7,396 ms |
| `trailhead_ready_ms` (6 runs) | 6,310 ms |
| FCP | about 1,250 ms |
| Longest task during load | 2,244 ms |
| Longest task in the 1.5 s after the tap | none over 50 ms |
| Tap interaction | 88 ms (15 delay, 0 processing, 73 presentation) |
| Intro frame rate | 59.6 fps |

The button unlocks 1,086 ms after the trailhead is ready: that gap is the button's fill sweep, not map work.

### 2. Touch scroll, mile 0 to 318 (26 s)

| Measure | Value |
| --- | --- |
| Frame rate | 47.5 fps (runs: 47.5, 46.1, 47.6) |
| Frame time p95 | 34 ms |
| Frames over 33 ms | 10.6% |
| Long tasks over 50 ms | 0 |
| Main-thread idle (profiled run) | 5.7% |

### 3. Marker tap, sound, close

| Measure | Value |
| --- | --- |
| `first_sound_ms`, first tap (`cache_state: network`, `first_play: true`) | 3,875 ms |
| Longest task after the tap | none over 50 ms |
| Tap interaction | 72 ms |
| Punch-in frame rate | 58 fps |
| Close tap interaction | 80 ms |
| Return frame rate | 60 fps |

### 4. Five hops (Next x3, Previous x2)

| Measure | Value |
| --- | --- |
| Hop interaction | 88 ms |
| Long tasks | none over 50 ms |
| Frame rate over each 3 s camera move | 54.6 fps median, 48.9 worst |
| `first_sound_ms`, `decoded` | 6 to 9 ms |
| `first_sound_ms`, `compressed` | 136 to 146 ms |
| `first_sound_ms`, `inflight` (third Next) | 1,274 ms |

## Top functions

### Load (to button unlock, 7.5 s profiled)

| Function | Inclusive |
| --- | --- |
| React passive effect (`performWorkUntilDeadline`) | 2,292 ms |
| `along` (Turf), called from `buildCameraPath` in `hooks/use-trail-scroll.ts` | 2,171 ms |
| `distance` (Turf) | 2,137 ms |
| `degreesToRadians` | 938 ms self |
| Mapbox `_render` | 474 ms |

`buildCameraPath` makes 1,002 `along()` calls over a 12,657-point line, and each call walks the line from its start.

### Scroll (28.2 s profiled)

| Bucket | Time | Share |
| --- | --- | --- |
| Mapbox `_render` | 16,324 ms | 58% |
| of which terrain drape `renderBatch` | 5,914 ms | 21% |
| of which `updateSources` / `coveringTiles` | 3,275 / 2,788 ms | 12% / 10% |
| of which `line` / `fill` / `symbol` draws | 2,190 / 2,059 / 1,980 ms | 8% / 7% / 7% |
| Native (`(program)`: GL calls, compositing) | 5,156 ms | 18% |
| React work from the scroll loop's state updates | 1,164 ms | 4.1% |
| `onTouchMove`, mostly `getComputedStyle` in `isNativeScrollTarget` | 531 ms | 1.9% |
| PostHog scroll listener (reads `scrollY`) | 485 ms | 1.7% |
| Idle | 1,599 ms | 5.7% |

The style has 71 layers (14 fill, 25 line, 28 symbol) and the canvas is 1170x2532: the map is built without a `pixelRatio` cap on phones.

## Lab against field

The lab does not reproduce the slow "Begin Journey" processing, and the field explains why: it is slow on iOS and Windows and fast on Android and macOS Chrome. Field data wins. PR #58 adds `audio_unlock_sync_ms`, `handler_sync_ms` and `render_sync_ms` to `journey_started` so the field can say which part of the handler holds the main thread.

## Scroll experiments (one run each, same profile)

Base style layers were hidden at runtime through the live map, with no code change, to see how much of the scroll cost they carry. Trail lines, trail labels and pins stayed visible.

| Variant | Layers hidden | Frame rate | Frame time p95 | Frames over 33 ms |
| --- | --- | --- | --- | --- |
| Baseline (median of 3) | 0 | 47.5 fps | 34 ms | 10.6% |
| Base fills hidden | 14 | 46.2 fps | 34.3 ms | 14.1% |
| Base lines hidden | 21 | 46.5 fps | 34.3 ms | 11.8% |
| Base symbols hidden | 22 | 46.5 fps | 34.4 ms | 13.6% |
| All base vector layers hidden | 57 | 58.4 fps | 17.6 ms | 0.7% |
| Pixel ratio 2 instead of 3 | 0 | 38.6 fps | 50 ms | 23.5% |

Hiding one layer type does nothing; hiding all three reaches 58 fps. The cost is not additive, so a partial trim has to be tested subset by subset. The pixel-ratio run came out slower than baseline, which makes no physical sense on its own and is a single run on a desktop GPU; treat it as inconclusive.

A Chrome DevTools MCP trace of the cold load on the same profile gave LCP 1,449 ms (TTFB 166 ms, render delay 1,284 ms) and CLS 0.00, in line with the harness.

## Desktop viewport trace (2026-11-16)

1920x1080 at DPR 1, fine pointer (the app's desktop map profile), mouse and wheel input, 4x CPU throttle, no network throttle. Build: `dev` with PRs #58, #60 to #65 stacked. One profiled run and one timed run, so these are single readings, not medians.

| Measure | Desktop | Mobile baseline |
| --- | --- | --- |
| Wheel scroll frame rate | 20 to 25 fps | 47.5 fps |
| Scroll frame time p50 / p95 | 50 / 67 ms | 17 / 34 ms |
| Mapbox `_render` share of main thread during scroll | 78% | 58% |
| Main-thread idle during scroll | 0.9% | 5.7% |
| Intro frame rate | 33 fps | 59.6 fps |
| Camera move between recordings | 24 to 29 fps | 54.6 fps |
| Marker click interaction | 64 ms (2 delay, 19 processing, 44 presentation) | 72 ms |
| "Begin Journey" click interaction | 88 and 216 ms, 77 and 194 ms of it presentation | 88 ms |
| Longest frame after a marker click | 67 to 100 ms | 34 ms |

Per rendered frame, Mapbox costs about 43 ms of main-thread time on desktop against about 13 ms on mobile at the same throttle. The style and layer count are the same (71 layers); the desktop view covers more tiles, and each tile is drawn once per layer.

That matches the field data for desktop map taps: almost no processing and a long presentation delay. A click waits for the next frame, and on desktop that frame is slow. On a machine slower than the lab's, 100 ms frames at 4x throttle become the 300 to 600 ms waits PostHog recorded.

Scroll experiments, one run each from mile 0:

| Variant | Frame rate | Frame time p50 | Frames over 33 ms |
| --- | --- | --- | --- |
| Control | 25.3 fps | 34 ms | 62% |
| Fog range pulled in from [1.5, 10] to [1, 6] | 26.2 fps | 34 ms | 61% |
| All 57 base vector layers hidden | 47.3 fps | 17 ms | 10% |

Fog range does not help. The base style layers are the cost on desktop, as on mobile, and the gain from removing them is larger here.
