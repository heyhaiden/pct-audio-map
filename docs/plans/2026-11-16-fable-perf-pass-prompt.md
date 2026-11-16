You're doing a performance pass on Offbeat (offbeathike.com), a Next.js 16 site where scrolling flies a Mapbox GL camera along the Pacific Crest Trail and tapping a marker plays a field recording. The repo is the current working directory. Start from the latest `dev` branch.

## The problem, in numbers

PostHog real-user data for the homepage, 14 days to 2026-11-16, at p75:

- Load is fine: LCP about 1,000 ms, FCP about 950 ms, CLS 0.004.
- Input is slow: INP is 248 ms on mobile and 376 ms on desktop. Google's "good" line is 200 ms.

INP attribution shows where:

| Interaction | Samples | INP p75 | Processing | Input delay | Presentation |
| --- | --- | --- | --- | --- | --- |
| "Begin Journey" button | 44 | 282 ms | 240 ms | 4 ms | 39 ms |
| Map canvas tap | 30 | 288 ms | 90 ms | 42 ms | 118 ms |
| Splash body | 7 | 296 ms | 7 ms | 67 ms | 231 ms |

Playback is the core use: 117 listeners opened 1,602 recordings, about 14 each. Nothing measures time-to-map-ready or tap-to-sound yet.

## Goal

Make taps and scrolling feel instant on phones and shorten tap-to-sound, without changing anything a listener hears.

Success means:
- Lab, mobile viewport with 4x CPU throttle: no main-thread task over 100 ms during the "Begin Journey" tap or a marker tap, and the scroll loop at 50 fps or better.
- Field, about 7 days after deploy: mobile INP p75 under 200 ms, desktop no worse.
- No regressions: `pnpm test` (164 tests today), `pnpm lint`, and `npx tsc --noEmit` all clean; LCP and CLS hold.

## Hard guardrail

Audio behavior stays exactly as it is: crossfade timing, looping, the iOS silent-switch workaround (`lib/media-playback-session.ts`), and the sound-blocked prompt for in-app browsers. Making playback start sooner or decode more cheaply is in scope. Changing what plays, when it fades, or how it loops is not. If a fix would touch any of that, stop and ask.

Everything else is open, including the intro sequence, camera feel, and desktop map quality, as long as the data justifies the change.

## Tools

- Chrome DevTools MCP for traces: `emulate` (viewport `390x844x3,mobile,touch`, `cpuThrottlingRate: 4`, `networkConditions: "Fast 4G"`), `performance_start_trace` / `performance_stop_trace` / `performance_analyze_insight`, `evaluate_script`.
- PostHog MCP (project 335511) for field data. The `$web_vitals` event carries INP attribution under `properties.$web_vitals_INP_event.attribution`.
- The dev server: `pnpm dev`. Tests: `pnpm test` (node test runner via tsx, files in `tests/`).

## How to work

Phase 0, context. Read `CLAUDE.md` first. It explains the scroll-to-camera pipeline across `hooks/use-trail-scroll.ts`, `lib/railing-camera.ts`, `lib/node-camera.ts`, `components/map/pct-map.tsx`, and `app/page.tsx`, plus tile warming in `lib/tile-prefetch.ts`. Then read `lib/trail-loop-engine.ts` and `hooks/use-audio-player.ts` for playback. Note that `CLAUDE.md` is out of date on two points: there is a test suite, and `proxy.ts` exists.

Phase 1, instrumentation (first PR). Add two PostHog events:
- `map_ready_ms`: navigation start until the trailhead is ready and "Begin Journey" unlocks.
- `first_sound_ms`: marker tap until the audio engine emits `playing`, with recording id, device type, and whether the clip was already decoded or cached.

Phase 2, measure. Run four scenarios on the throttled mobile profile, three times each, and report the median:
1. Cold load, tap "Begin Journey", wait for the intro to finish.
2. Steady scroll from mile 0 to about mile 300.
3. Tap a marker, wait for sound, close the player.
4. Step to the next and previous recording five times.

For each, record long tasks over 50 ms, frame rate, and the top functions by self time. Write them to `docs/perf/baseline.md` next to the PostHog attribution above.

Phase 3, findings, then stop. Post a ranked table: cause, evidence (trace or PostHog number), estimated gain, risk, proposed fix. Wait for my approval before changing code beyond Phase 1.

Phase 4, fixes. Highest gain first, one cause per PR. Confirm each candidate with data before fixing it. Candidates worth checking, none confirmed:
- Work done in the "Begin Journey" click handler that could wait until after the next paint.
- React state updates fired from the scroll loop that re-render large trees.
- Audio decoding or buffer work running on the main thread during a marker tap.

## Rules

- Branch from `dev`, open PRs into `dev`, one cause per PR. Never push to `main`.
- `lib/railing-camera.ts` constants drive both the passive scroll rail and the active marker punch-in. If you change one, verify both.
- `lib/tile-prefetch.ts` must never move the camera after the splash is dismissed. An earlier version did, causing GPU thrash and a visible flash of mid-trail.
- Cite the trace or PostHog number behind every change. No speculative tuning.
- Stop and ask before changing audio behavior, adding a dependency, or acting on a trace that contradicts the field data.
- Lab traces from a desktop CPU are an approximation. When lab and field disagree, field data wins.
- Mapbox's own render cost may dominate map taps. Report what app code can fix; don't fork or patch Mapbox.

## Each PR includes

- `pnpm test`, `pnpm lint`, and `npx tsc --noEmit` passing.
- A unit test in `tests/` for any new pure logic, following the existing files.
- The affected scenario rerun, with before and after medians.
- A short checklist for me to verify on a real phone: scroll feel, the "Begin Journey" tap, opening a recording, and crossfades sounding the same as before.

## When you're done

Give me a summary with lab before and after for each scenario, the list of PRs, and a reminder to recheck mobile INP and `first_sound_ms` in PostHog about 7 days after the last deploy.
