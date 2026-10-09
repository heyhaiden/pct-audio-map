# Gapless Trail Loops Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Loop each trail pin sample-accurately, serve Opus from `public/` so Hobby Blob transfer stops growing, and keep existing MP3s only as a rare fallback.

**Architecture:** Keep marker `audioUrl` values as stable ids (`/audio/1-1.mp3`). At runtime, derive clip id `1-1`, play `/audio/opus/1-1.opus` through Web Audio (`AudioBufferSourceNode.loop`), and fall back to the existing Blob MP3 only after a decode-and-inspect probe proves Opus is silent. Do not import Anna's `offbeat-audio.js` or ship the AAC tree. Library page stays on `<audio>` (seek/resume), just pointed at the same Opus files.

**Tech Stack:** Next.js App Router, existing `node:test` + `tsx` suite (`pnpm test`), Web Audio API, files in `public/audio/opus/`.

**Hard constraints:**
- Stay on Vercel Hobby. Blob Data Transfer is 10 GB/month and **cuts off** when exceeded. Fast Data Transfer (static `public/`) is 100 GB.
- Do not put the new package on Blob.
- Do not commit Anna's `aac/` folder (~114 MB) or `offbeat-audio.js`.
- Do not apply `gainDb` in code — it is already baked into the files.
- Hold at most **3** decoded clips in RAM (current + prev + next). Mapbox terrain is already heavy.
- Do not change library seeking/progress to Web Audio.

**Anna package (when it arrives):**
- Take `opus/` + `manifest.json` only.
- Ignore `aac/` and `offbeat-audio.js`.
- Clip ids are `1-1` … `4-6` and must match the 73 marker files already referenced as `/audio/1-1.mp3` etc.

---

### Task 1: Clip id helper

Stable marker paths stay `/audio/1-1.mp3`. Everything else keys off the clip id.

**Files:**
- Create: `lib/audio-clip-id.ts`
- Test: `tests/audio-clip-id.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { clipIdFromAudioUrl } from "../lib/audio-clip-id.ts"

test("clipIdFromAudioUrl reads the filename stem", () => {
  assert.equal(clipIdFromAudioUrl("/audio/1-1.mp3"), "1-1")
  assert.equal(clipIdFromAudioUrl("/audio/opus/4-6.opus"), "4-6")
  assert.equal(clipIdFromAudioUrl("audio/3-8.m4a?v=2"), "3-8")
})

test("clipIdFromAudioUrl rejects empty or extensionless paths", () => {
  assert.equal(clipIdFromAudioUrl(""), null)
  assert.equal(clipIdFromAudioUrl("/audio/"), null)
  assert.equal(clipIdFromAudioUrl("https://cdn.example.com/audio/2-2.mp3"), "2-2")
})
```

**Step 2: Run it to make sure it fails**

```bash
node --import tsx --test tests/audio-clip-id.test.ts
```

Expected: `ERR_MODULE_NOT_FOUND` for `lib/audio-clip-id.ts`.

**Step 3: Write the minimal implementation**

```ts
const STEM = /([^/]+)\.(mp3|opus|m4a|aac|wav|aiff?|flac)(?:\?.*)?$/i

export function clipIdFromAudioUrl(audioUrl: string): string | null {
  if (!audioUrl) return null
  const path = audioUrl.split("?")[0]
  const match = path.match(STEM)
  return match?.[1] ?? null
}
```

**Step 4: Run the test**

```bash
node --import tsx --test tests/audio-clip-id.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/audio-clip-id.ts tests/audio-clip-id.test.ts
git commit -m "$(cat <<'EOF'
Add clip id parsing for trail audio filenames.

EOF
)"
```

---

### Task 2: Loop source resolver

Opus is always same-origin. MP3 keeps using the existing Blob prefix so old iPhones still have a file.

**Files:**
- Create: `lib/audio-loop-sources.ts`
- Test: `tests/audio-loop-sources.test.ts`

Do **not** read `process.env` at module load. Pass `blobBase` in so tests are not poisoned by ESM import cache (see `tests/resolve-audio-url.test.ts`).

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { resolveLoopSources } from "../lib/audio-loop-sources.ts"

test("resolveLoopSources prefers same-origin Opus and Blob MP3", () => {
  const sources = resolveLoopSources("/audio/1-1.mp3", {
    blobBase: "https://store.public.blob.vercel-storage.com",
  })
  assert.deepEqual(sources, {
    clipId: "1-1",
    opusUrl: "/audio/opus/1-1.opus",
    mp3Url: "https://store.public.blob.vercel-storage.com/audio/1-1.mp3",
  })
})

test("resolveLoopSources keeps MP3 same-origin when Blob base is missing", () => {
  const sources = resolveLoopSources("/audio/2-2.mp3", {})
  assert.equal(sources?.opusUrl, "/audio/opus/2-2.opus")
  assert.equal(sources?.mp3Url, "/audio/2-2.mp3")
})

test("resolveLoopSources returns null for an unparseable path", () => {
  assert.equal(resolveLoopSources("", {}), null)
})
```

**Step 2: Run it — expect FAIL** (`ERR_MODULE_NOT_FOUND`).

**Step 3: Implement**

```ts
import { clipIdFromAudioUrl } from "@/lib/audio-clip-id"

export interface LoopSources {
  clipId: string
  opusUrl: string
  mp3Url: string
}

export function resolveLoopSources(
  audioUrl: string,
  options: { blobBase?: string } = {},
): LoopSources | null {
  const clipId = clipIdFromAudioUrl(audioUrl)
  if (!clipId) return null

  const blobBase = options.blobBase?.replace(/\/$/, "")
  const mp3Path = `/audio/${clipId}.mp3`

  return {
    clipId,
    opusUrl: `/audio/opus/${clipId}.opus`,
    mp3Url: blobBase ? `${blobBase}${mp3Path}` : mp3Path,
  }
}

export function loopSourcesFromMarker(
  audioUrl: string,
  blobBase = process.env.NEXT_PUBLIC_AUDIO_CDN_URL,
): LoopSources | null {
  return resolveLoopSources(audioUrl, { blobBase })
}
```

**Step 4: Run the test — expect PASS.**

**Step 5: Commit**

```bash
git add lib/audio-loop-sources.ts tests/audio-loop-sources.test.ts
git commit -m "$(cat <<'EOF'
Resolve Opus from public/ and keep MP3 as Blob fallback.

EOF
)"
```

---

### Task 3: Manifest trim math

Anna's `manifest.json` gives exact PCM length. Opus needs no trim. MP3 fallback may need encoder delay. **Never apply `gainDb`.**

We do not have her exact schema yet. Normalize a few likely shapes into ours.

**Files:**
- Create: `lib/audio-loop-manifest.ts`
- Test: `tests/audio-loop-manifest.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import {
  loopWindow,
  normalizeManifest,
} from "../lib/audio-loop-manifest.ts"

test("normalizeManifest reads sample counts and ignores gainDb", () => {
  const manifest = normalizeManifest({
    clips: {
      "1-1": { sampleCount: 48000, gainDb: -1 },
      "1-4": { samples: 96000, aacPadding: 1024, mp3Delay: 576, mp3Padding: 384 },
    },
  })
  assert.equal(manifest["1-1"]?.sampleCount, 48000)
  assert.equal(manifest["1-1"]?.gainDb, undefined)
  assert.equal(manifest["1-4"]?.mp3Delay, 576)
  assert.equal(manifest["1-4"]?.mp3Padding, 384)
})

test("loopWindow for Opus uses the full buffer", () => {
  assert.deepEqual(loopWindow({ sampleCount: 48000 }, "opus", 48000), {
    start: 0,
    end: 1,
  })
})

test("loopWindow for MP3 skips delay and padding", () => {
  const window = loopWindow(
    { sampleCount: 48000, mp3Delay: 576, mp3Padding: 384 },
    "mp3",
    48000,
  )
  assert.equal(window.start, 576 / 48000)
  assert.equal(window.end, (48000 - 384) / 48000)
})
```

**Step 2: Run it — expect FAIL.**

**Step 3: Implement `normalizeManifest` + `loopWindow`**

- Accept `clips` as a record, or a top-level record of clip ids.
- Map `sampleCount` or `samples`.
- Map `mp3Delay` / `encoderDelay` and `mp3Padding` / `padding`.
- Drop `gainDb` / `aacPadding` — do not store them on the normalized clip.
- If MP3 delay/padding are missing, default delay `576`, padding `0` (13 ms worst-case click on old iOS only).
- `loopWindow` returns seconds for `AudioBufferSourceNode.loopStart` / `loopEnd`.
- Clamp so `end > start`. If the window would be empty, fall back to the full buffer.

**Step 4: Run the test — expect PASS.**

**Step 5: Commit**

```bash
git add lib/audio-loop-manifest.ts tests/audio-loop-manifest.test.ts
git commit -m "$(cat <<'EOF'
Normalize loop manifests without reapplying baked-in gain.

EOF
)"
```

---

### Task 4: Decoded-clip LRU

Pure eviction. Engine will call this after every successful decode.

**Files:**
- Create: `lib/decoded-clip-cache.ts`
- Test: `tests/decoded-clip-cache.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { nextDecodedIds } from "../lib/decoded-clip-cache.ts"

test("nextDecodedIds keeps pinned clips and evicts the oldest extras", () => {
  const kept = nextDecodedIds({
    decoded: ["1-1", "1-2", "1-3", "1-4"],
    pinned: ["1-3", "1-4", "1-5"],
    max: 3,
  })
  assert.deepEqual(kept, ["1-2", "1-3", "1-4"])
})

test("nextDecodedIds never drops a pinned clip even if over max", () => {
  const kept = nextDecodedIds({
    decoded: ["1-1", "1-2"],
    pinned: ["1-1", "1-2", "1-3"],
    max: 3,
  })
  assert.deepEqual(kept, ["1-1", "1-2"])
})
```

Pinned = current + neighbors that were requested. Max = 3.

Eviction order: drop ids that are **not** pinned, oldest first (array order = oldest → newest). If still over max after that, keep the most recent pinned ones.

Wait — the second test says pinned can be 3 but only 2 are decoded; result is those 2. Good.

Refine first test: decoded `1-1,1-2,1-3,1-4` (oldest first), pinned `1-3,1-4,1-5`, max 3. Not-pinned is `1-1` then `1-2`. Drop `1-1` first → `1-2,1-3,1-4` which is exactly max. Good.

**Step 2: Run it — expect FAIL.**

**Step 3: Implement `nextDecodedIds`.**

**Step 4: Run the test — expect PASS.**

**Step 5: Commit**

```bash
git add lib/decoded-clip-cache.ts tests/decoded-clip-cache.test.ts
git commit -m "$(cat <<'EOF'
Cap decoded trail loops at three in-memory clips.

EOF
)"
```

---

### Task 5: Format probe policy

Do **not** trust `canPlayType`. Older iOS reports Opus support and then decodes silence.

**Files:**
- Create: `lib/audio-format-probe.ts`
- Test: `tests/audio-format-probe.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { chooseLoopFormat } from "../lib/audio-format-probe.ts"

test("chooseLoopFormat uses Opus when the probe buffer has energy", () => {
  assert.equal(chooseLoopFormat({ opusHasEnergy: true }), "opus")
})

test("chooseLoopFormat falls back to MP3 when Opus is silent or missing", () => {
  assert.equal(chooseLoopFormat({ opusHasEnergy: false }), "mp3")
  assert.equal(chooseLoopFormat({ opusHasEnergy: null }), "mp3")
})

test("bufferHasEnergy ignores near-zero noise", () => {
  const { bufferHasEnergy } = require("../lib/audio-format-probe.ts") as typeof import("../lib/audio-format-probe.ts")
  const quiet = new Float32Array(2048)
  const loud = new Float32Array(2048)
  loud[100] = 0.2
  assert.equal(bufferHasEnergy(quiet), false)
  assert.equal(bufferHasEnergy(loud), true)
})
```

Use ESM import for `bufferHasEnergy`, not `require` — this repo is ESM via `tsx`. Fix the third test to a normal import.

Peak threshold: `1e-4` is enough to reject digital silence without treating dither as audio.

**Step 2: Run it — expect FAIL.**

**Step 3: Implement `chooseLoopFormat` + `bufferHasEnergy`.**

**Step 4: Run the test — expect PASS.**

**Step 5: Commit**

```bash
git add lib/audio-format-probe.ts tests/audio-format-probe.test.ts
git commit -m "$(cat <<'EOF'
Pick Opus only after a decoded buffer has real energy.

EOF
)"
```

---

### Task 6: Trail loop engine

Browser-only module. Node tests cannot construct `AudioContext`. Keep the engine thin and reuse the pure helpers. No drop-in of `offbeat-audio.js`.

**Files:**
- Create: `lib/trail-loop-engine.ts`

**Public API (match what the hook needs, not Anna's scroll-driven sample):**

```ts
export interface TrailLoopEngine {
  unlock: () => Promise<void>
  resume: () => Promise<void>
  play: (audioUrl: string, options?: { fadeMs?: number; volume?: number }) => Promise<void>
  prefetch: (audioUrls: string[]) => void
  stop: (fadeMs?: number) => void
  setMuted: (muted: boolean) => void
  suspend: () => Promise<void>
  on: (fn: (event: TrailLoopEvent) => void) => () => void
}

export type TrailLoopEvent =
  | { type: "loading"; id: string }
  | { type: "playing"; id: string }
  | { type: "stopped" }
  | { type: "error"; id: string; message: string }
```

**Behavior to implement:**

1. `createTrailLoopEngine({ blobBase, keepDecoded = 3 })`.
2. `unlock()` creates `AudioContext` if needed and `resume()`s it. Safe to call twice. Must be invoked from a click.
3. Probe once per page: fetch + `decodeAudioData` on a small known clip (`1-1` is fine once files exist; until then probe whichever clip is first `play`ed). If Opus decodes with energy, remember `"opus"`. Otherwise `"mp3"`.
4. `play`:
   - Latest call wins (increment a generation token, same idea as `transitionRef` in `hooks/use-audio-player.ts`).
   - Emit `loading`.
   - Fetch the chosen format, decode, apply `loopWindow`, start a looping `AudioBufferSourceNode` connected through a `GainNode`.
   - Crossfade with the existing `crossfadeVolumes` helper from `lib/audio-crossfade.ts` on `requestAnimationFrame` — keep caller `fadeMs` (do **not** default to 3.5s; default 900 to match the current hook).
   - After decode, run `nextDecodedIds` and `buffer = null` on evicted clips.
5. `prefetch(urls)`: `fetch()` the compressed file into a `Map<string, ArrayBuffer>` only. **Do not decode** until `play`. Cap compressed cache at ~6.
6. `stop`: equal-power fade out, then disconnect sources.
7. `setMuted`: set master gain to 0 or the current volume.
8. `visibilitychange` is **not** the engine's job — the hook will call `suspend` / `resume`.
9. Never apply `gainDb`.

**Implementation notes:**
- Copy the generation-token / failed-incoming fade behavior from `hooks/use-audio-player.ts` (`FAILED_INCOMING_FADE_MS = 1400`). If the incoming decode fails, fade the outgoing out and emit `error`.
- Two gain nodes (incoming / outgoing) plus one master gain. Do not use `HTMLAudioElement`.
- `loop = true`, `loopStart` / `loopEnd` from `loopWindow`.
- If `AudioContext.state === "suspended"` at play time, call `resume()` again (iOS suspends between splash and first pin).

No unit test for the engine itself in Node. The helpers are already tested. After this task, typecheck by importing it from the hook in Task 8.

**Step: Commit**

```bash
git add lib/trail-loop-engine.ts
git commit -m "$(cat <<'EOF'
Add a Web Audio engine for sample-accurate trail loops.

EOF
)"
```

---

### Task 7: Opus MIME + cache headers

Vercel/`public/` often serves `.opus` as `application/octet-stream`, which can make `decodeAudioData` fail.

**Files:**
- Modify: `next.config.mjs`

**Step 1: Add headers**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.252", "192.168.1.*"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/audio/opus/:path*.opus",
        headers: [
          { key: "Content-Type", value: "audio/ogg" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default nextConfig
```

If a clip is replaced later, **rename the file** (or change the clip id). Immutable cache plus the same name will keep the old file in browsers.

**Step 2: Confirm locally after files exist**

```bash
pnpm dev
curl -I http://localhost:3000/audio/opus/1-1.opus
```

Expected: `Content-Type: audio/ogg`.

**Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "$(cat <<'EOF'
Serve Opus loops with an audio MIME type and long cache.

EOF
)"
```

---

### Task 8: Swap the map player onto the engine

Keep the hook's **React API** so `app/page.tsx` stays small. Replace the two `HTMLAudioElement` decks.

**Files:**
- Modify: `hooks/use-audio-player.ts`
- Modify: `app/page.tsx` (unlock + prefetch + resume)
- Modify: `lib/prefetch-audio.ts` (delegate to engine compressed fetch)

**Hook API to keep:**
- `transitionToTrack(track, fadeMs?)`
- `fadeOutAndStop(fadeMs?)`
- `isLoading`, `isPlaying`, `error`, `isMuted`, `setMuted`
- Add: `unlockAudio()`

`transitionToTrack` still receives `{ id, url, volume }`. Ignore `track.loop` — map pins always loop. Use `track.url` (the marker `audioUrl`) as the engine key, not the Blob-resolved MP3 URL.

**`app/page.tsx` changes:**

1. Stop calling `resolveAudioUrl(marker.audioUrl)` for map playback. Pass the raw marker path:

```ts
void transitionToTrack(
  {
    id: marker.id,
    url: marker.audioUrl,
    volume: 0.7,
  },
  fadeMs,
)
```

2. Unlock on splash **and** on the first pin (resume users skip splash):

```ts
const handleSplashEnter = useCallback(() => {
  void unlockAudio()
  // ...existing body
}, [unlockAudio])

const activateNode = useCallback((marker, cameraDurationMs, audioFadeMs?) => {
  void unlockAudio() // resume AudioContext if iOS suspended it
  // ...existing body
}, [/* add unlockAudio */])
```

3. Neighbor prefetch: pass raw marker urls into the engine, not `new Audio()` metadata.

Replace the effect that calls `prefetchAudio` with `prefetchLoop(previousPlayable?.audioUrl, nextPlayable?.audioUrl)` exposed from the hook.

4. Tab visibility:

```ts
useEffect(() => {
  const onVis = () => {
    if (document.hidden) void suspendAudio()
    else void resumeAudio()
  }
  document.addEventListener("visibilitychange", onVis)
  return () => document.removeEventListener("visibilitychange", onVis)
}, [suspendAudio, resumeAudio])
```

**`lib/prefetch-audio.ts`:** either delete usages or change it to a no-op wrapper that documents "map prefetch is the engine." Do not keep `preload="metadata"` against Blob URLs — that is the 75% problem.

**Do not touch** `app/library/page.tsx` in this task.

**Manual check (desktop):**
- `pnpm test` still green (crossfade tests must keep passing; they do not import the hook).
- `pnpm dev`, Begin Journey, open a pin, hop prev/next, close. Confirm loading / listening / error footer states still update.

**Commit**

```bash
git add hooks/use-audio-player.ts app/page.tsx lib/prefetch-audio.ts
git commit -m "$(cat <<'EOF'
Play map pins through Web Audio instead of HTMLAudio loop.

EOF
)"
```

---

### Task 9: Library stays on HTMLAudio, but leave Blob when possible

Library needs seek + resume. Keep `new Audio()`. Point it at Opus same-origin first; on `error`, retry the Blob MP3.

**Files:**
- Modify: `lib/resolve-audio-url.ts` — add `resolveLibraryAudioUrl(audioUrl, format)`
- Modify: `app/library/page.tsx`
- Test: `tests/resolve-audio-url.test.ts` (add cases, do not break the existing Blob helper — library and ingest still use it for MP3 fallback)

**Step 1: Test**

```ts
test("resolveLibraryAudioUrl serves Opus from the app origin", async () => {
  const { resolveLibraryAudioUrl } = await import("../lib/resolve-audio-url.ts")
  assert.equal(resolveLibraryAudioUrl("/audio/1-1.mp3", "opus"), "/audio/opus/1-1.opus")
  assert.equal(
    resolveLibraryAudioUrl("/audio/1-1.mp3", "mp3", "https://store.public.blob.vercel-storage.com"),
    "https://store.public.blob.vercel-storage.com/audio/1-1.mp3",
  )
})
```

**Step 2: Implement and wire `handlePlayPause`:** start with `"opus"`; on element `error`, if format was opus, create a new `Audio` with `"mp3"` and continue. Do not switch the map engine.

**Step 3: `pnpm test` — all existing + new cases PASS.**

**Step 4: Commit**

```bash
git add lib/resolve-audio-url.ts tests/resolve-audio-url.test.ts app/library/page.tsx
git commit -m "$(cat <<'EOF'
Play library recordings from same-origin Opus with MP3 fallback.

EOF
)"
```

---

### Task 10: Drop Anna's Opus files (manual)

Do this once the `web` folder arrives. Not a code task.

**Keep:**
- `opus/*.opus` (~70 MB)
- `manifest.json`

**Throw away:**
- `aac/`
- `offbeat-audio.js`

**Layout:**

```
public/audio/
  README.txt          (update)
  manifest.json
  opus/1-1.opus … 4-6.opus
```

**Checklist:**
1. Confirm 73 files. Clip ids must equal the stems already in `data/audio-markers.ts` (`audioUrl: "/audio/1-1.mp3"` …).
2. Confirm the six gain-baked clips exist (`1-4`, `2-2`, `3-1`, `3-8`, `3-9`, `4-4`) and that our loader does not apply `-1` dB.
3. Adapt `normalizeManifest` if her JSON keys differ. Add a fixture of the real file under `tests/fixtures/audio-manifest.json` and a test that every marker clip id is present.
4. Do **not** use Git LFS (Vercel Git deploys skip LFS files).
5. Update `public/audio/README.txt`: Opus in `opus/`, do not commit WAVs, AAC is not used.
6. Optional: add `public/audio/opus/.gitkeep` before the files exist so the folder is in git.

**After copy:**

```bash
ls public/audio/opus | wc -l
# expected: 73
curl -I http://localhost:3000/audio/opus/1-1.opus
```

**Commit the binaries in their own commit** so code review stays readable:

```bash
git add public/audio/opus public/audio/manifest.json public/audio/README.txt
git commit -m "$(cat <<'EOF'
Add web-ready Opus trail loops to public audio.

EOF
)"
```

---

### Task 11: Stop feeding Blob as the primary store

Ingest still writes marker metadata. Uploading 128k MP3s to Blob should become optional.

**Files:**
- Modify: `scripts/ingest-audio.ts` — print a warning that Blob upload is fallback-only; default new docs toward `--skip-upload` unless an MP3 is missing.
- Modify: `.env.example` — `NEXT_PUBLIC_AUDIO_CDN_URL` is **MP3 fallback only**, not required for map playback.
- Modify: `scripts/lib/deliver-audio.ts` comment at top.
- Do **not** delete existing Blob objects in this task. After a week of Opus-in-production, delete the Blob MP3s in a later cleanup so leftover traffic dies.

**Commit**

```bash
git add scripts/ingest-audio.ts scripts/lib/deliver-audio.ts .env.example
git commit -m "$(cat <<'EOF'
Treat Blob MP3s as fallback-only after Opus public hosting.

EOF
)"
```

---

### Task 12: Device QA (required before launch)

The module Anna tested in Chromium only. You must test the **engine you wrote**, on a phone, with the map up.

**Desktop (Chrome + Safari 18.4+):**
- [ ] Begin Journey unlocks audio (no silent first pin).
- [ ] Pin open loops with no gap (listen 2–3 cycles on a short clip like `1-1` and a long one like the 173s clip).
- [ ] Prev/next crossfade uses existing timings (~1100 ms arrows, ~2400 ms first open, ~2200 ms close), not 3.5s.
- [ ] Rapid arrow taps: only the latest clip wins; no stacked buffers.
- [ ] Hide tab → silence; show tab → loop continues.
- [ ] Library still seeks, resumes, and end-fades.
- [ ] `curl -I /audio/opus/1-1.opus` is `audio/ogg`.

**iPhone current iOS (Safari 18.4+):**
- [ ] Same loop test with Mapbox visible (watch for tab crash / jank — decoded cache must stay at 3).
- [ ] Lock screen: note whether audio dies (expected Web Audio limitation; do not patch in this project unless it is a launch blocker).
- [ ] First pin after a long pause still plays (`resume()` on activate).

**Older iPhone (iOS < 18.4), if you can borrow one:**
- [ ] Opus probe fails closed (silence detected) and MP3 plays.
- [ ] Loop on MP3 is acceptable (tiny click at the seam is OK on fallback).

**Hobby quota:**
- [ ] After deploy, confirm audio requests hit the deployment host (`/audio/opus/...`), not `*.blob.vercel-storage.com`, except old-iOS MP3 fallback.
- [ ] Blob Data Transfer in the Vercel dashboard should flatten vs the previous month.

---

## Out of scope

- Anna's AAC pack and `offbeat-audio.js`
- Scroll-driven ambient `play(id)` on every node
- 3.5s default crossfade
- Decoding neighbors ahead of time
- Web Audio on the library page
- Deleting Blob objects on day one
- Background / lock-screen playback
- Changing marker `audioUrl` strings in `data/audio-markers.ts`

## Suggested sequence

Tasks 1–5 are TDD and unblocked today (no Anna files). Task 6–9 can proceed with 1–2 checked-in fixture Opus files if the full pack is late. Task 10 waits on Anna. Task 11–12 after files are in `public/`.
