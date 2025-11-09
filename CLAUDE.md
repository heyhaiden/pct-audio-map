# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application that creates an immersive Pacific Crest Trail (PCT) audio experience using Mapbox's storytelling features. The app presents ambient sound recordings collected along the 2,650-mile trail through an interactive, scroll-driven map interface with cinematic camera movements and 3D terrain visualization.

**Key Technology**: Mapbox GL JS with 3D terrain, scrollytelling, and free camera path animations following the PCT route from Mexico to Canada.

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Run development server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Run production build locally
pnpm start

# Run linting
pnpm lint
```

## Environment Setup

**Required**: Create a `.env.local` file with your Mapbox access token:

```
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

The token must have terrain and storytelling features enabled. Without it, the map will fail to load.

## Architecture

### Core Concept: Scroll-Driven Map Storytelling

The application uses a **fixed map background** with **scrollable overlay content**. As users scroll through "chapters" (trail segments), the camera smoothly animates to different positions along the PCT, revealing audio recording markers at each location.

### Key Architectural Patterns

1. **Dual-Layer Scroll Architecture** (app/page.tsx:34-51)
   - Fixed layer (z-0): Mapbox map that stays in place
   - Scrollable layer (z-10): Story content that triggers camera movements
   - Audio markers and UI controls float above both layers

2. **Camera Animation System**
   - `hooks/use-camera-path.ts`: Custom easing functions and interpolation logic for cinematic camera movements
   - `components/map/camera-controller.tsx`: Orchestrates multi-segment camera tours
   - `utils/camera-path.ts`: Generates smooth paths between waypoints
   - Camera movements include: center (lng/lat), zoom, pitch, bearing, with configurable duration

3. **State Management Pattern**
   - React useState for local UI state (no global state library)
   - Map state passed down from page.tsx to child components
   - Current chapter and selected audio marker tracked at root level
   - Scroll position tracked via Intersection Observer (use-scroll-story hook)

### Component Structure

```
app/
├── page.tsx                      # Root: manages map, chapter, audio state
└── layout.tsx                    # Global layout with fonts & analytics

components/
├── map/
│   ├── pct-map.tsx              # Main Mapbox map with 3D terrain
│   ├── camera-controller.tsx    # Cinematic tour controls
│   └── audio-markers.tsx        # Clickable audio location markers
├── scroll/
│   ├── storytelling-scroll.tsx  # Scroll sections that trigger camera
│   └── scroll-indicator.tsx     # Visual progress indicator
└── audio/
    └── audio-player.tsx         # Floating audio player with controls

data/
├── audio-markers.ts             # 15 audio locations with coordinates/elevation
└── pct-segments.ts              # Trail segments with camera positions

hooks/
├── use-camera-path.ts           # Camera interpolation & easing
├── use-scroll-story.ts          # Scroll progress tracking
└── use-audio-player.ts          # Audio playback state

types/map.ts                      # TypeScript interfaces for camera & markers
```

### Data Model

**PCTChapter** (types/map.ts:1-16):
- Trail segment with camera position (center, zoom, pitch, bearing, duration)
- Optional terrain exaggeration
- References to audio markers in this segment

**AudioMarker** (types/map.ts:18-26):
- Unique location with coordinates, elevation, audio file URL
- Belongs to a chapter
- `featured` flag determines visual prominence

**CameraPosition** (types/map.ts:28-34):
- All parameters needed to position the Mapbox camera
- Duration determines animation speed

### Mapbox Integration Details

The map is configured in `components/map/pct-map.tsx`:
- Style: `mapbox://styles/mapbox/satellite-v9` (dark satellite base)
- Terrain source: `mapbox-terrain-rgb` with 1.5x exaggeration
- Custom layer for PCT trail line (pink/red #ff6b9d with glow)
- Camera API: Uses `map.jumpTo()` in animation loop for smooth control

Token retrieval: `lib/mapbox-config.ts` exports a server action `getMapboxToken()` that validates the environment variable.

### Scroll-to-Camera Flow

1. User scrolls → Intersection Observer detects chapter visibility (storytelling-scroll.tsx)
2. Chapter becomes active → onChapterChange callback fires
3. Parent (page.tsx) updates currentChapter state
4. Camera controller or scroll handler reads new chapter's camera position
5. `useCameraPath` hook interpolates from current → target position
6. Animation runs at 60fps using `requestAnimationFrame`
7. Audio markers for that chapter become visible/prominent

### Audio System

- Audio files expected in `/public/audio/` directory (referenced in audio-markers.ts)
- Click marker → opens floating audio player (audio-player.tsx)
- Player uses standard HTML5 audio element with custom controls
- Closing player doesn't affect map state

## Important Configuration

### TypeScript Paths (tsconfig.json:21-23)

Uses `@/*` alias for imports:
```typescript
import { AudioMarker } from "@/types/map"
import { audioMarkers } from "@/data/audio-markers"
```

### Shadcn UI Components (components.json)

Project uses shadcn/ui with:
- Style: "new-york"
- Base color: "neutral"
- Aliases: `@/components`, `@/lib/utils`, etc.

### Build Configuration (next.config.mjs)

Intentionally ignores ESLint and TypeScript errors during builds (for rapid v0.app iteration). May want to re-enable for production hardening.

## Common Development Tasks

### Adding a New Audio Marker

1. Add audio file to `/public/audio/your-file.mp3`
2. Add entry to `data/audio-markers.ts`:
```typescript
{
  id: "unique-id",
  name: "Display Name",
  coordinates: [-118.29, 36.58], // [lng, lat]
  elevation: 13000, // feet
  audioUrl: "/audio/your-file.mp3",
  chapter: "sierra-nevada", // must match a segment id
  featured: true
}
```
3. Markers auto-appear when their chapter is active

### Adding a New Trail Segment

Edit `data/pct-segments.ts` and add a new chapter with camera position:
```typescript
{
  id: "new-segment",
  title: "Segment Title",
  description: "Rich text description...",
  camera: {
    center: [-120.0, 42.0],
    zoom: 9,
    pitch: 60,  // 0-85 degrees
    bearing: 15, // 0-360 degrees
    duration: 3000 // milliseconds
  },
  terrain: {
    exaggeration: 1.5 // optional, default 1.5
  }
}
```

### Adjusting Camera Easing

Easing functions are in `hooks/use-camera-path.ts:17-32`:
- `easeInOutCubic`: Smooth, balanced
- `easeOutQuart`: Gentle start, strong finish
- `easeOutBack`: Slight overshoot (cinematic)

Change the default easing in camera-controller.tsx:37 or pass different easing to `animateToPosition()`.

### Debugging Map Issues

If map doesn't load:
1. Check browser console for Mapbox errors
2. Verify `MAPBOX_ACCESS_TOKEN` in `.env.local`
3. Check token has required scopes at https://account.mapbox.com/access-tokens/
4. Ensure WebGL 2.0 is supported (check caniuse.com)

If camera animations are jerky:
1. Reduce `duration` values in camera positions
2. Check browser performance (3D terrain is GPU-intensive)
3. Lower `terrain.exaggeration` value

## Deployment

This project auto-deploys to Vercel when changes are pushed (configured via v0.app). Ensure `MAPBOX_ACCESS_TOKEN` is set in Vercel environment variables (Settings → Environment Variables).
