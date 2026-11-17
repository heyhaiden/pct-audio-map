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

## Base-layer variants, timed (2026-11-17)

The four candidates in the base-layer screenshots (`.playwright-mcp/lab/shots/compare.html`, miles 105, 790 and 1460), now with frame rates. Yesterday only A and B were timed.

- Steady scroll from mile 0, yesterday's `harness.js` unchanged. Layers are hidden at runtime through the live map; no app code or style changed. Trail lines, trail labels and pins stay visible in every variant.
- Build: `dev` at `e52dc3e`, which has PRs #58 to #65 merged, so the baseline here is faster than the 47.5 fps recorded above.
- Three runs per cell. The four variants ran back to back in each round and the order rotated between rounds, so drift on the machine lands on every variant. On mains power, battery at 100%.
- Phone profile: 390x844 at DPR 3, touch, 4x CPU throttle, Fast 4G, mile 0 to 319. Desktop profile: 1920x1080 at DPR 1, 4x CPU throttle, no network throttle, 23 s of wheel input.

| Variant | Layers hidden | Phone fps (runs) | Phone frame p95 | Phone frames over 33 ms | Desktop fps (runs) | Desktop frame p50 | Desktop frames over 33 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. Current | 0 | 52.7 (53.4, 52.4, 52.7) | 33.6 ms | 6.1% | 25.4 (25.4, 25.2, 26.2) | 34.7 ms | 61.9% |
| B. No base vector layers | 57 | 60.0 (60.0, 60.0, 60.0) | 18.3 ms | 0% | 47.2 (44.9, 47.2, 47.3) | 17.2 ms | 11.5% |
| C. Base labels only (fills and lines hidden) | 35 | 60.0 (60.0, 59.8, 60.0) | 18.4 ms | 0.1% | 36.8 (37.0, 36.8, 35.7) | 32.0 ms | 28.7% |
| D. Tints and shadows only (lines and symbols hidden) | 43 | 59.9 (59.9, 59.6, 59.9) | 18.4 ms | 0.1% | 35.6 (35.6, 35.6, 34.6) | 32.6 ms | 30.5% |

On the phone profile C and D both reach the 60 fps cap, the same as hiding everything. Yesterday's single-type runs (fills, lines or symbols alone) gained nothing; hiding any two types is enough. The cap means this profile cannot rank B, C and D against each other.

On desktop C and D recover about half of what B does: 11.4 and 10.2 fps of the 21.8 fps between A and B. C and D are 1.2 fps apart, about the spread of a single variant's own runs.

The desktop scenario sends wheel input once per frame, so a faster variant also travels further in its 23 s (96 miles for A, 137 for B, 124 for C, 122 for D). The frame times are comparable; the terrain covered is not identical.

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

## Desktop terrain load (2026-11-17)

Why terrain is slow to appear on desktop, measured for the first time. Build: `dev` at `e52dc3e`, production build served locally.

### Method

- Chrome 157, headed, a fresh profile per run (cold HTTP cache, cold Mapbox tile cache, cold connections), driven over raw CDP.
- 1440x900 at DPR 2 (canvas 2880x1800), fine pointer, no CPU throttle.
- Network "Fast 4G": 9 Mbps down, 1.5 Mbps up, 165 ms latency, the same numbers as the mobile baseline. It is applied to the page and to each Mapbox worker, and each gets its own budget, as in DevTools. A real 9 Mbps link is shared, so it would be slower than this.
- Case A clicks "Begin Journey" the instant it unlocks (22 to 34 ms after). Case B waits 10 s after the unlock, then clicks. Three runs each, interleaved.
- "Fully drawn" is the first moment at or after the fly-in lands when the DEM source has no tile loading, no DEM request is on the wire, and `map.areTilesLoaded()` is true. Runs watch for 70 s after landing.
- Per-tile timing joins three clocks: when the tile entered the DEM source cache, when its request left and finished (CDP `Network` events), and when the tile turned `loaded`.
- The intro is fixed choreography: the fly-in lands 8.6 s after the click in every run.

### Results, Fast 4G (median of 3)

| Measure | A: click at unlock | B: wait 10 s, then click |
| --- | --- | --- |
| "Begin Journey" unlocks after navigation | 16,393 ms | 16,442 ms |
| Click to trailhead terrain fully drawn | 25,984 ms (runs: 25,984, 26,096, 25,975) | not within 78 s in any run |
| Of that, after the fly-in lands | 17,385 ms | more than 70 s |
| DEM requests in flight at the click | 0 | 3 |
| `preloadOnly` camera calls before the click | 3 | 83 |
| `preloadOnly` camera calls after the click | 0 | 0 |
| DEM downloaded after the click | 12 requests, 0.8 MB | 28 requests, 2.3 MB |
| Satellite downloaded after the click | 124 requests, 4.8 MB | 471 requests, 17.0 MB |
| Vector tiles downloaded after the click | 74 requests, 14.3 MB | 309 requests, 52.2 MB |
| DEM tile loading after landing, waiting in Mapbox's request queue | 5.9 s | 68.7 s |
| DEM tile loading after landing, on the wire | 2.3 s | 3.4 s |
| DEM tile loading after landing, bytes here and nothing else outstanding | 0.01 s | 0 s |
| Frame rate after landing | 59.9 fps | 59.4 fps |
| Long tasks after landing | none | 518 ms in total, longest 126 ms |

### Results, no network throttle (median of 3)

The same two cases on this laptop's own connection, to check that the result is not an artifact of the throttle.

| Measure | A: click at unlock | B: wait 10 s, then click |
| --- | --- | --- |
| "Begin Journey" unlocks after navigation | 6,908 ms | 7,637 ms |
| Click to trailhead terrain fully drawn | 14,461 ms (runs: 14,461, 14,547, 12,749) | 70,148 ms (runs: 70,148, 67,997, not within 80 s) |
| Of that, after the fly-in lands | 5,849 ms | 61,515 ms |
| DEM requests in flight at the click | 0 | 0 |
| `preloadOnly` camera calls before the click | 3 | 83 |
| Downloaded after the click (DEM / satellite / vector) | 0.8 / 4.8 / 14.6 MB | 5.2 / 42.9 / 122.1 MB |
| DEM tile loading after landing, waiting in the request queue | 0.4 s | 59.0 s |

### Verdict

The gate-order theory is wrong, and step 2 of the overnight plan was skipped. The theory said a quick click is the slow case because the trailhead is not warmed yet. The click-to-drawn time decided it: A is the fast case (26.0 s on Fast 4G, 14.5 s unthrottled), and B is the slow one (over 78 s, and 70.1 s). A has no DEM request in flight at the click in any of its six runs.

What makes B slow is the prefetch itself. On desktop `getMapPrefetchPolicy` sets `warmFullRoute`, so once the trailhead poses are done `lib/tile-prefetch.ts` sweeps the route to mile 1800. In 10 s on the splash it makes 83 `preloadOnly` calls. Clicking "Begin Journey" stops new calls, but the tile requests already issued keep running: unthrottled, 170 MB arrives after the click against 20 MB in case A. The live camera's tiles join the back of Mapbox's request queue, and a DEM tile for the landing view waits 59 s there before its request is sent.

Network wait dominates in both cases, not main-thread work. After landing in case A the page holds 59.9 fps with no long task while a DEM tile is loading for 8.3 s: 5.9 s queued behind other tile requests and 2.3 s on the wire. A profiled run put the two Mapbox workers at 9 to 10% busy during the fly-in and 1 to 2% after landing.

One gap is unexplained. A landing-view DEM tile turns `loaded` a median 2.2 s after its last byte arrives, with the main thread and the workers both idle. The wait is somewhere inside Mapbox's loader.

### What else the trace showed

- The prefetch never restarts after "Begin Journey". The intro calls `cancel()` on the prefetch controller, and `warmAhead` returns early on a cancelled controller. All 12 timed runs made 0 `preloadOnly` calls after the click, and each of them scrolled for 12 s afterwards, to about mile 50. The rolling window that `CLAUDE.md` describes does not run after the intro.
- The fly-in loads tiles it then discards. It lands at zoom 9.55, and within half a second the scroll rail eases to its mile-0 pose at zoom 10.85, which needs a different set of tiles. In case A 11 of the DEM tiles requested during the fly-in never finished.
- DEM is a small share of the bytes. After the click in case A: 0.8 MB of DEM, 4.8 MB of satellite and 14.3 MB of vector tiles. After landing the vector tiles finish in 0.3 s, the DEM in 8.4 s, satellite in 17.4 s and the style's own elevation tiles in 17.5 s.
- The style loads a second elevation tileset. Besides the app's `mapbox-terrain-dem` source, the style has its own `mapbox.terrain-rgb` source, and it is among the last sources to finish after landing.
- Terrain cannot start early. The DEM source is added in the map's `load` handler, and `load` fires 14.8 s after navigation on Fast 4G (5.7 s unthrottled), once the style and the overview tiles are in.
- Unlock is slow on this profile: 16.4 s on Fast 4G against 7.4 s on the mobile baseline. The desktop overview at DPR 2 covers more tiles.

The traces are in `.playwright-mcp/lab/overnight/terrain-results.jsonl` (labels `step1`, `step1-nothrottle`, `step4-mapbox`), produced by `terrain.mjs` in the same folder.
