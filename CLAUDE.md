# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A scroll-driven 3D map experience of the Pacific Crest Trail (PCT), built with Next.js App Router. Scrolling the page drives a virtual camera flight along the trail (rendered with Mapbox GL JS + terrain-RGB DEM), synced to distance-along-trail ("miles"). Audio markers along the route open a player when clicked. The repo is synced from v0.app deployments (see README.md) — changes made in the v0.app UI are auto-pushed here and deployed via Vercel.

## Commands

```bash
pnpm dev      # start dev server
pnpm build    # production build
pnpm start    # run production build
pnpm lint     # next lint
```

Package manager is `pnpm` (see `pnpm-lock.yaml`). There is no test suite/framework configured in this repo. `next.config.mjs` sets `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` to `true`, so `pnpm build` will succeed even with type/lint errors — don't rely on a clean build as proof of correctness; check `pnpm lint` and `tsc` (via editor/tsserver) directly.

## Environment

Required env vars (see `.env.example`):
- `MAPBOX_ACCESS_TOKEN` — read server-side only, via the server action `getMapboxToken()` in `lib/mapbox-config.ts` (marked `"use server"`). Never expose this as `NEXT_PUBLIC_*`.
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage for audio file streaming.

There are no API routes under `app/`; the only server-side logic is the `getMapboxToken` server action.

## Architecture

### The scroll → camera pipeline

This is the core mechanic of the app and spans several files that must be understood together:

1. **`data/pct-segments.ts`** — defines `pctSegments` (5 chapters: SoCal, Sierra Nevada, NorCal, Oregon, Washington) each with a named flyTo camera and a fallback trail geometry (`pctTrailGeometry`). The real trail line is loaded at runtime from `public/pct-trail.geojson`; `pctTrailGeometry` is only a fallback if that fetch fails.
2. **`lib/railing-camera.ts`** — pure math: builds a `CameraPathPoint[]` (500 samples along the trail via Turf.js `along`/`bearing`), and derives a "railing" `FreeCameraPose` (lng/lat/altitude/pitch/bearing) at any progress value using distance-based easing constants (`OPENING_TRANSITION_MILES`, `END_TRANSITION_MILES`, `CRUISING_ALTITUDE_METERS`, `PEAK_PITCH`, punch-in altitude factor for zooming into a marker). No React/Mapbox dependency — this is the shared vocabulary between scroll-driven and manual camera moves.
3. **`hooks/use-trail-scroll.ts`** — the per-frame `requestAnimationFrame` loop. Reads `window.scrollY` each frame, maps it to trail progress (0–1) and miles, computes the target railing pose, and exponentially smooths the live camera state (`cameraStateRef`) toward it before writing to Mapbox's `FreeCameraOptions`. Contains perf-sensitive logic: UI state (`setScrollProgress`/`setCurrentMiles`) is throttled to ~10/s while the GL camera write stays close to 60Hz; camera writes are skipped once the camera has "settled" (within epsilon of target and not scrolling) so the map can go idle; writes are decimated (every other frame) only when a prior frame ran over its time budget. Also exposes `pauseScrollAnimation`/`resumeScrollAnimation` (used when a marker's audio player takes over the camera) and `syncScrollToPosition` (snaps scroll position to match an arbitrary coordinate, e.g. after closing the player).
4. **`lib/node-camera.ts`** — imperative, non-scroll camera moves: read the current `FreeCameraOptions` off the map, animate between two `FreeCameraPose`s with easing (used for "punch in" to a marker and "return to railing" on close). Fully independent of the scroll RAF loop; the two are coordinated by pause/resume + `setBlocked`.
5. **`components/map/pct-map.tsx`** — owns the Mapbox instance itself: loads `mapbox-gl` and `turf` from CDN `<script>` tags (not npm packages — see `MAPBOX_GL_JS`/`TURF_JS` constants), builds map layers (terrain-RGB DEM, glow/trail line layers, position cursor), and runs the intro sequence (`introPhase`: `waiting → overview → flying → done` — jumps to a bird's-eye `OVERVIEW_CAMERA`, holds, then flies to `TRAILHEAD_CAMERA` at the Mexico border). It wires `useTrailScroll` and exposes its returned controls up to `app/page.tsx` via `onScrollControlReady`.
6. **`app/page.tsx`** — top-level orchestration: splash screen gating, chapter-index derivation from `currentMiles` (via `CHAPTER_MILE_RANGES` in `data/chapter-ranges.ts`), marker click → punch-in camera flow, WIP boundary (`WIP_MILE`), and scroll-lock while a marker's audio player is open or the node-camera is mid-animation.

When touching camera/scroll behavior, trace through all of these — a change to easing or altitude constants in `railing-camera.ts` affects both the passive scroll rail and the active marker punch-in.

### Tile warming / perceived performance

`lib/tile-prefetch.ts` (`startPathTilePrefetch`) pre-warms Mapbox tiles before the user starts scrolling, to avoid a flash of unloaded terrain:
- **Trailhead warm** (first `TRAILHEAD_WARM_MILES`): a short *actual* free-camera walk (moves the map) so both style tiles and DEM are truly resident, gated by `canMoveCamera()` (only allowed while still under the splash screen / `introPhase === "waiting"`).
- **Beyond that, up to `PREFETCH_END_MILES`** (early Oregon — where content currently ends): DEM-only warming via bare `Image()` requests to the terrain-RGB tile URLs, deliberately *not* moving the camera (previously caused GPU thrash and a "flash of mid-trail" when the splash dismissed).
- `warmAhead(currentMiles)` is called continuously as the user scrolls to keep warming ~100 miles ahead.
- `lib/trail-prep-cache.ts` persists a `sessionStorage` flag once the trailhead has warmed once, so returning to the home page later in the same tab session skips the splash gate/timeout (tiles are already in the browser HTTP cache).

`TRAILHEAD_READY_TIMEOUT_MS` is a soft cap so a slow network/failed Mapbox init never gates the "Begin Journey" button forever — track this if changing timeout-related UX.

### Chapters, markers, and content boundary

- `data/chapter-ranges.ts` (`CHAPTER_MILE_RANGES`) maps mile ranges to chapter index; `data/pct-segments.ts` order must stay in sync with it.
- `data/audio-markers.ts` defines `AudioMarker`s (coordinates, chapter, audio URL, etc.), rendered by `components/map/audio-markers.tsx` and consumed by `components/audio/audio-player.tsx` + `hooks/use-audio-player.ts`.
- `app/page.tsx` defines `ACTIVE_CHAPTERS` — only markers in these chapters are clickable/navigable (`navigableMarkers`); this gates content that isn't finished yet.
- `WIP_MILE` (currently 1800, "early Oregon") is where the trail's produced content currently ends — scrolling/chapter-jumping past this shows `components/completion/wip-screen.tsx` instead of continuing. When more chapters get real content, extend `ACTIVE_CHAPTERS` and push `WIP_MILE` forward together.

### Mapbox loading strategy

Mapbox GL JS and Turf.js are npm dependencies, imported directly (`import mapboxgl from "mapbox-gl"` plus `mapbox-gl/dist/mapbox-gl.css` in `pct-map.tsx`; individual `@turf/*` packages where needed). They were previously loaded from CDN `<script>` tags via `window.mapboxgl`/`window.turf` — that is no longer the case, so import them rather than guarding on globals.

### Mobile vs. desktop

Distinct components exist for mobile (`components/mobile/mobile-stats-bar.tsx`, `mobile-chapter-toast.tsx`) vs. desktop-oriented (`components/stats/trail-stats.tsx`, `components/chapters/chapter-card.tsx`) presentations of the same underlying state (`currentMiles`, `currentChapter`) — shown/hidden via Tailwind responsive classes rather than JS branching. `preferReducedGpu()` in `pct-map.tsx` reduces `antialias`/`pixelRatio`/tile cache size on touch/narrow-viewport devices. Those map-construction options are fixed for the life of the map instance. The camera half is not: a debounced `resize`/`orientationchange` listener re-runs `configureRailingCameraForViewport()` when the viewport crosses the breakpoint, so cruise altitude and framing follow a mid-session resize.

## UI stack

Tailwind CSS v4 (via `@tailwindcss/postcss`), shadcn/ui-style Radix primitives (config in `components.json`), `lucide-react` icons, `next-themes` for theming. Path alias `@/*` maps to the repo root (see `tsconfig.json`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
