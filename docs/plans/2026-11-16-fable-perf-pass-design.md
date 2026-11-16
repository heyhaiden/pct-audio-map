# Fable perf pass: design

Date: 2026-11-16
Status: approved, not started

## Why

Real-user data from PostHog (14 days to 2026-11-16, homepage) says the page loads fast but reacts slowly to input:

| Metric (p75) | Mobile | Desktop | Google "good" |
| --- | --- | --- | --- |
| LCP | 1,026 ms | 976 ms | under 2,500 ms |
| FCP | 936 ms | 954 ms | under 1,800 ms |
| CLS | 0.004 | 0 | under 0.1 |
| INP | 248 ms | 376 ms | under 200 ms |

INP attribution names the slow interactions:

| Interaction | Samples | INP p75 | Processing | Input delay | Presentation |
| --- | --- | --- | --- | --- | --- |
| "Begin Journey" button | 44 | 282 ms | 240 ms | 4 ms | 39 ms |
| Map canvas tap | 30 | 288 ms | 90 ms | 42 ms | 118 ms |
| Splash body | 7 | 296 ms | 7 ms | 67 ms | 231 ms |

Usage puts playback at the center: 162 people started the journey, and 117 of them opened 1,602 recordings between them, about 14 each. LCP probably measures the splash, not the moment the map is usable, and nothing measures time-to-map-ready or tap-to-sound yet.

## Goal

Make taps and scrolling feel instant on phones and shorten tap-to-sound, without changing anything a listener hears.

## Scope

In scope: the "Begin Journey" tap, map taps that open a recording, the per-frame scroll and camera loop, the intro sequence, camera feel, desktop map quality, and playback speed (decode, cache, prefetch).

Guardrail: audio behavior stays exactly as it is. That covers crossfade timing, looping, the iOS silent-switch workaround, and the in-app-browser sound prompt. A fix that would alter any of these stops for approval.

## Success criteria

- Lab, mobile viewport, 4x CPU throttle: no main-thread task over 100 ms during the "Begin Journey" tap or a marker tap, and the scroll loop holds 50 fps or better.
- Field, about 7 days after deploy: mobile INP p75 under 200 ms with desktop no worse, and a recorded baseline for tap-to-sound.
- No regressions: 164 tests plus any new ones pass, lint and `tsc` stay at 0, LCP and CLS hold.

## Approach

One phased run, one PR per cause.

1. Phase 0, context. Read `CLAUDE.md` and the scroll-to-camera pipeline it describes, plus `lib/trail-loop-engine.ts`.
2. Phase 1, instrumentation PR. Add `map_ready_ms` (navigation start to the trailhead-ready unlock) and `first_sound_ms` (marker tap to the engine's `playing` event, tagged with recording id, device, and cache hit).
3. Phase 2, measure. Four scenarios, three runs each, median reported: cold load to "Begin Journey" to intro end; steady scroll from mile 0 to 300; marker tap to sound to close; five next/previous recording hops. Results go in `docs/perf/baseline.md`.
4. Phase 3, findings. A ranked table of cause, evidence, estimated gain, risk, and proposed fix. Work pauses here for approval.
5. Phase 4, fixes. Highest gain first, each PR rerunning its scenario with before and after numbers.

## Rules

- Branch from `dev`, open PRs into `dev`, never push to `main`.
- `railing-camera.ts` constants drive both the scroll rail and the marker punch-in; change one and check both.
- `tile-prefetch.ts` must not move the camera after the splash. An earlier version did and caused GPU thrash and a flash of mid-trail.
- Every change cites the trace or PostHog number behind it.
- Stop and ask before changing audio, adding a dependency, or acting on a trace that contradicts field data.

## Testing per PR

`pnpm test`, `pnpm lint`, and `tsc --noEmit` clean; a unit test in `tests/` for any new pure logic; the affected scenario rerun with before and after numbers; a short checklist for a real-phone check.

## Risks

Lab traces on a desktop CPU don't match real phones, so PostHog field data breaks ties and the owner's phone check is the final gate. Mapbox's own render cost may dominate map taps; the run reports what app code can fix and does not patch Mapbox.
