You're doing an unattended overnight pass on Offbeat (offbeathike.com), a Next.js 16 site where scrolling flies a Mapbox GL camera along the Pacific Crest Trail and tapping a marker plays a field recording. The repo is the current working directory. Start from the latest `dev` branch.

Nobody will answer questions until morning. Where these instructions say "stop", that means: don't do that step, write down why in the morning report, and move on to the next step. Never wait for input.

## Background

Yesterday's performance pass (PRs #58 to #65) is merged into `dev`. Read `docs/perf/baseline.md` for the lab numbers and `docs/plans/2026-11-16-fable-perf-pass-design.md` for how that pass was run. PR #68 (`dev` into `main`) is open and stays untouched.

The open problem: terrain takes a long time to appear on desktop. The owner saw it on the PR #58 preview, and nobody has measured it. The current theory comes from reading the code, not from a trace. Tile prefetch in `lib/tile-prefetch.ts` starts at the same moment the "Begin Journey" button unlocks (around `components/map/pct-map.tsx:680`) and pauses during the intro fly-in. On a first visit with a quick click, the trailhead terrain may not be warmed before the camera lands on it.

## Tonight's work, in order

### Step 1. Trace the slow terrain (about 1 hour)

Desktop viewport (1440x900, no CPU throttle, "Fast 4G" network), cold cache, production build. Three runs each of two cases:
- A. Click "Begin Journey" the instant it unlocks.
- B. Wait 10 seconds after it unlocks, then click.

For each run, record: time from click until the trailhead terrain is fully drawn (watch the DEM source's tile loads plus `map.areTilesLoaded()`), DEM tile requests still in flight at click time, and whether the time goes to network wait or to decode and render on the main thread.

Write the results into `docs/perf/baseline.md` under a new "Desktop terrain load" heading. Then decide, and state which number decided it:
- If A is much slower than B and the gap is in-flight DEM requests, the gate-order theory holds. Do step 2.
- If A and B look alike, the theory is wrong. Skip step 2 and say so.
- Record whether network wait or main-thread render dominates. Step 4 depends on it.

### Step 2. Fix the gate order (about 1 hour, only if step 1 confirms it)

Warm the trailhead DEM before enabling "Begin Journey". `TRAILHEAD_READY_TIMEOUT_MS` (12 s) stays the hard cap, so a slow network never blocks the button forever. Keep the behavior where a returning visitor in the same tab (`lib/trail-prep-cache.ts`) skips the gate. Rerun step 1's case A and report before and after medians, including how much later the button unlocks on a cold load. If the button unlocks more than 1.5 s later at the median, open the PR as a draft and flag the tradeoff.

### Step 3. Remove the duplicate camera-path build (about 30 minutes)

`lib/tile-prefetch.ts` (around line 64) still builds the camera path the old way with Turf `along` per sample. PR #60 replaced that in the scroll hook with a single-pass build. Make tile-prefetch reuse the single-pass builder. Add a test in `tests/` showing the prefetch poses match the old output within a tight tolerance, the way PR #60's test did. Find out how often the fallback runs at all and report it.

### Step 4. Prototype self-hosted terrain (3 to 4 hours, only if step 1 shows network wait matters)

If step 1 shows main-thread render dominates, skip this step and say so in the report.

The trail is fixed, so terrain can come from open elevation data cut to a strip around the trail and served with permanent cache headers, instead of Mapbox's DEM tiles. Use AWS Terrain Tiles (the public `elevation-tiles-prod` bucket, Terrarium encoding). Mapbox GL's `raster-dem` source accepts `encoding: "terrarium"`.

Build:
- A script in `scripts/` that lists the tiles covering a buffer around the trail line in `public/pct-trail.geojson` up to mile 1800, at the zoom levels the map uses. It reports the tile count and total size. Download them to a git-ignored local folder only.
- A flag, off by default (for example `NEXT_PUBLIC_SELF_HOSTED_DEM`), that points the map's DEM source at those local tiles. When the flag is off, the map behaves exactly as it does today.
- A lab comparison of step 1's case A, Mapbox DEM against the local tiles, three runs each.

Limits on this step:
- Don't upload tiles anywhere: not Vercel Blob, not a CDN, not git. Hosting is the owner's decision. Serve them from the local dev server only.
- Don't add a runtime dependency. A dev-only script dependency is acceptable if nothing in the browser bundle changes; name it in the PR. If the job needs a native tool such as GDAL, stop and write up the plan instead.
- Open the PR as a draft. Its description gives tile count, storage size, an estimate of monthly egress, and the before and after numbers, so the owner can decide on hosting in the morning.
- If the terrain looks different (resolution, seams, or exaggeration), take before and after screenshots at miles 0, 400, 800 and 1500 and put them in the PR.

### Step 5. Frame-rate numbers for the base-layer decision (lab only, nothing merged)

The #4 decision (hiding some of the 57 base style layers) is waiting on Anna. Yesterday only "hide all 57" was timed: 47.5 to 58.4 fps on the throttled mobile profile, and close to double on desktop. Variants C and D, which hide two layer types each, were screenshotted but never timed. The harness is in `.playwright-mcp/lab/` (`harness.js`, `exp-*.js`, `agg.py`, `results.jsonl`).

Run the steady-scroll scenario (mile 0 to about 300) for baseline, all-hidden, C and D, on both the mobile profile and desktop, three runs each, interleaved so machine noise hits every variant equally. Add a table to `docs/perf/baseline.md` that sits next to the existing screenshots. Don't change the map style in app code.

## Rules

- Check the battery first with `pmset -g batt`. Below 20%, Chrome caps rendering at 30 fps, which ruined a set of runs yesterday. If the laptop is on battery, run steps 1 to 3 and skip the frame-rate runs in step 5, and say so.
- Branch from `dev`, one PR per step into `dev`. Never push to `main`, never merge anything, never touch PR #68 or PR #64.
- Audio is off limits: `lib/trail-loop-engine.ts`, `hooks/use-audio-player.ts`, `lib/media-playback-session.ts`, and the audio files.
- `lib/tile-prefetch.ts` must never move the camera after the splash is dismissed. An earlier version did, which caused GPU thrash and a visible flash of mid-trail.
- No change to how the map looks, except behind step 4's flag, which is off by default.
- Cite the trace or number behind every change. No speculative tuning.
- `.playwright-mcp/` stays untracked. Don't commit it and don't delete it.
- Stop any dev or lab servers you start before you finish. Leave the owner's server on port 3000 alone.
- Another process may share this working tree. If the branch changes under you, use `git worktree add` for your own checkout.

## Each PR includes

- `pnpm test`, `pnpm lint`, and `npx tsc --noEmit` passing.
- A unit test in `tests/` for any new pure logic.
- Before and after medians for the affected scenario.
- A short phone checklist: cold load and the "Begin Journey" unlock, the intro fly-in, scroll feel, and terrain at the trailhead.

## Morning report

Write it to `docs/perf/2026-11-17-overnight-report.md`, commit it on its own branch, and open a PR into `dev`. Keep it under one screen:

1. One line per step: done, skipped or stopped, and why.
2. The step 1 verdict, with the numbers that decided it.
3. The PRs in the order to review them, with one line of risk each.
4. Decisions waiting on the owner (hosting for step 4, the step 5 table for Anna), each with a recommendation.
5. Anything that broke, failed or looked wrong, with the exact error.
