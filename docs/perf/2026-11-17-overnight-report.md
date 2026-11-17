# Overnight report, 2026-11-17

## 1. Steps

- Step 1, trace the slow terrain: done. PR #71.
- Step 2, fix the gate order: skipped. Step 1 shows the theory is wrong.
- Step 3, duplicate camera-path build: done. PR #69. The fallback ran in 0 of 15 lab loads.
- Step 4, self-hosted terrain: done, draft PR #70. No cold-load gain.
- Step 5, frame rates for C and D: done, 24 of 24 runs on mains power. PR #72.
- Not in the brief: a one-line candidate fix for the cause step 1 found (stop the desktop route-wide prefetch on the splash) was still being measured when this was first written.

## 2. Step 1 verdict

Click to trailhead terrain fully drawn, desktop 1440x900, cold cache, median of 3:

| | Click at unlock (A) | Wait 10 s, then click (B) |
| --- | --- | --- |
| Fast 4G | 25,984 ms | not within 78 s in any run |
| No throttle | 14,461 ms | 70,148 ms |

A quick click is the fast case, so the gate-order theory fails. Case A has 0 DEM requests in flight at the click. Waiting is slow because the desktop prefetch sweeps the whole route while the splash is up: 83 `preloadOnly` calls in 10 s, which leave 170 MB of tile requests running after the click (20 MB in A). The landing view's DEM tiles then wait 59 s in Mapbox's request queue. Network wait dominates; the main thread holds 59.9 fps with no long task.

## 3. PRs, in review order

1. #71, step 1 write-up. Docs only, no risk.
2. #69, step 3. Low risk: pose math moved to a pure module, and a test compares every prefetch sweep with the old Turf path. No load-time change, because the replaced code never ran.
3. #72, step 5 table. Docs only, no risk.
4. #70, step 4, draft. Not for merge as it stands. With the flag unset the map adds the same source object as today. It carries 1.6 MB of screenshots that should go before any merge.

## 4. Decisions waiting on you

- Hosting for step 4: I recommend not hosting. Same cold-load time (26,171 ms against 26,101 ms), 1.8 times the terrain bytes per view, and terrain is 1 MB of a 20 MB visit. Storage would be 163.6 MB (52.1 MB without zoom 11), egress about 4 GB a month.
- Step 5 table for Anna: C and D both reach 60 fps on the phone profile (A: 52.7). On desktop C is 36.8 fps, D is 35.6, B is 47.2, A is 25.4. C against D is a choice about looks. Only B fixes desktop.
- The terrain delay itself: the cause is the route-wide prefetch on the splash, not the gate order. A measured candidate fix is in progress.
- The prefetch never restarts after "Begin Journey" (0 `preloadOnly` calls after the click in all 12 timed runs). `CLAUDE.md` says it keeps warming ahead of the scroll. Decide whether to revive it or correct the doc; reviving it without a cap would bring the queueing problem into the scroll.

## 5. What broke, failed or looked wrong

- The disk filled once, at 01:39: `ENOSPC: no space left on device, open '.../lab/overnight/shots/terrain-selfhosted-mile400.png'`. The volume sat at 99% all night (1.4 to 3.1 GB free) and swap reached 6 GB while two browsers ran at once. No results were lost. After that, one browser at a time.
- A usage limit stopped all work from about 01:45 to 05:30.
- Three of my own wait commands hung and were killed (`pgrep -f` matched their own command line). No effect on results.
- One frame-rate run (desktop, all hidden, third round) took 355 s of wall time instead of about 55 s. Its result (47.3 fps) matches the other two.
- Unexplained: a landing-view DEM tile turns `loaded` 2.2 s after its last byte arrives, with the main thread and both workers idle.
- The intro fly-in lands at zoom 9.55, then the scroll rail eases to zoom 10.85 within half a second, so the tiles loaded for the landing are replaced at once.
- The map style has its own `mapbox.terrain-rgb` source besides the app's DEM source, so two elevation tilesets download.
- `CLAUDE.md` points to `.env.example`, which is not in the repo.

Cleanup: in progress when this was first written.
