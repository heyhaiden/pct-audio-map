/**
 * Finger pixels are 1:1 with document pixels, but the journey spacer is
 * 12,000vh (≈100k px, about 38 px per mile on a 390x844 phone), so a finger
 * pixel is multiplied by this gain. Lab, phone profile, 300 px drag: 4.2 moved
 * 33 miles (heavy), 6 moved 48 (too loose); 5.1 splits the two at about 40.
 */
export const TOUCH_SCROLL_GAIN = 5.1

export type TouchScrollSample = {
  deltaY: number
  deltaMs: number
}

/**
 * Map a one-finger vertical drag to document scroll delta.
 * Finger down (deltaY > 0) advances the trail; finger up goes back.
 */
export function applyTouchDelta(sample: TouchScrollSample): {
  scrollDelta: number
  velocity: number
} {
  const dt = Math.max(1, sample.deltaMs)
  const gained = sample.deltaY * TOUCH_SCROLL_GAIN
  return {
    scrollDelta: gained,
    velocity: gained / dt,
  }
}

/** Finger planted without moving this long counts as a hold, not a flick. */
const HOLD_STILL_MS = 80

/** A touch that strays further than this from where it started is a swipe. */
export const TAP_SLOP_PX = 10
/** A press this long or longer is a hold, not a tap. */
export const TAP_MAX_MS = 450

export type TapGesture = {
  /** Furthest the finger got from its touchstart point, release included. */
  maxTravelPx: number
  /** Touchstart to release. */
  durationMs: number
  /** The touch landed while a glide was running (and stopped it). */
  interruptedGlide: boolean
}

/**
 * Whether a finished touch should replay a click (touchstart's preventDefault
 * swallows the browser's own). Travel is measured from the touchstart point:
 * measuring from the last move point made every quick flick read as a tap, and
 * the fake click opened whatever pin sat under the thumb. A touch that stops a
 * glide only stops it, as on iPhone.
 */
export function isTapGesture({ maxTravelPx, durationMs, interruptedGlide }: TapGesture): boolean {
  if (interruptedGlide) return false
  return maxTravelPx < TAP_SLOP_PX && durationMs < TAP_MAX_MS
}

let pointerDown = false
let lastMoveAt = 0
let stopLatch = false

export function noteTrailTouchStart(now = performance.now()) {
  pointerDown = true
  lastMoveAt = now
  stopLatch = true
}

export function noteTrailTouchMove(now = performance.now()) {
  lastMoveAt = now
  stopLatch = false
}

export function noteTrailTouchEnd() {
  pointerDown = false
  stopLatch = false
}

/** Planted finger or a still hold: camera should use the fast settle tau. */
export function isTrailCameraSettling(now = performance.now()) {
  return stopLatch || (pointerDown && now - lastMoveAt >= HOLD_STILL_MS)
}

/**
 * Glide after release, modelled on iOS scrolling: the map keeps the speed the
 * finger had over its last moments, then friction slows it smoothly to a stop.
 *
 * - Release speed comes from the last VELOCITY_WINDOW_MS of movement, so one
 *   jumpy touchmove sample can't launch the map.
 * - Speed decays exponentially with time (not per frame), so a 60 Hz and a
 *   120 Hz phone glide the same distance.
 * - Speed is capped, so even a hard fling glides at most about 37 miles.
 *
 * Lab, phone profile: a quick 300 px flick moved 66 miles at the original
 * settings and 100 after the first loosening; the target here is about 75.
 */
export const VELOCITY_WINDOW_MS = 100
/** Speed falls to 37% after this long; a glide is effectively over in 3x. */
export const GLIDE_TIME_CONSTANT_MS = 200
/** Fastest glide, in document px per ms (about 0.18 miles per ms). */
export const MAX_GLIDE_VELOCITY = 7
/** Below this, friction wins and the glide stops. */
export const MIN_GLIDE_VELOCITY = 0.25

/** Whether a release speed is enough to glide at all. */
export function shouldStartInertia(velocity: number): boolean {
  return Math.abs(velocity) >= MIN_GLIDE_VELOCITY
}

/** Glide only if the finger was still moving at release. */
export function shouldCoastAfterRelease(velocity: number, msSinceLastMove: number): boolean {
  if (msSinceLastMove >= HOLD_STILL_MS) return false
  return shouldStartInertia(velocity)
}

export function clampGlideVelocity(velocity: number): number {
  if (!Number.isFinite(velocity)) return 0
  return Math.max(-MAX_GLIDE_VELOCITY, Math.min(MAX_GLIDE_VELOCITY, velocity))
}

/** Advance a glide by `dtMs`; returns the new speed (0 once friction wins). */
export function stepGlideVelocity(velocity: number, dtMs: number): number {
  const next = velocity * Math.exp(-Math.max(0, dtMs) / GLIDE_TIME_CONSTANT_MS)
  return Math.abs(next) < MIN_GLIDE_VELOCITY ? 0 : next
}

/** Total distance a glide covers from `velocity` (document px), ignoring the stop threshold. */
export function glideDistance(velocity: number): number {
  return clampGlideVelocity(velocity) * GLIDE_TIME_CONSTANT_MS
}

/** Document-px speed over the last VELOCITY_WINDOW_MS of a stroke. */
export function createVelocityTracker(windowMs = VELOCITY_WINDOW_MS) {
  let samples: { t: number; delta: number }[] = []
  return {
    reset() {
      samples = []
    },
    add(delta: number, t: number) {
      samples.push({ t, delta })
      while (samples.length > 0 && t - samples[0].t > windowMs) samples.shift()
    },
    velocity(now: number): number {
      const recent = samples.filter((s) => now - s.t <= windowMs)
      if (recent.length < 2) return recent.length === 1 ? recent[0].delta / 16 : 0
      const span = Math.max(16, recent[recent.length - 1].t - recent[0].t)
      // The first sample's delta happened before the window's first timestamp.
      const distance = recent.slice(1).reduce((sum, s) => sum + s.delta, 0)
      return distance / span
    },
  }
}

type HoldCalloutNode = {
  tagName?: string
  parentElement?: HoldCalloutNode | null
  getAttribute?: (name: string) => string | null
  isContentEditable?: boolean
}

/**
 * Chrome iOS starts the Copy / Search toolbar from touchstart.
 * preventDefault there kills it — but buttons/links still need a real click.
 */
export function shouldPreventTouchStartCallout(target: HoldCalloutNode | EventTarget | null): boolean {
  let node: HoldCalloutNode | EventTarget | null = target
  while (node && typeof node === "object" && "tagName" in node) {
    const tag = String(node.tagName || "").toUpperCase()
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false
    if (tag === "BUTTON" || tag === "A") return false
    if (node.getAttribute?.("role") === "button") return false
    if (node.isContentEditable) return false
    node = node.parentElement ?? null
  }
  return true
}

type ScrollTargetNode = {
  scrollHeight: number
  clientHeight: number
  parentElement: ScrollTargetNode | null
}

/**
 * True when the touch started inside something that scrolls on its own (an
 * overlay card, the menu), so the journey scroll should leave it alone.
 * `overflowYOf` reads computed style, which forces a style recalculation, so
 * callers should ask once per stroke, not once per touchmove.
 */
export function isNativeScrollTarget<Node extends ScrollTargetNode>(
  target: Node | null,
  root: unknown,
  overflowYOf: (node: Node) => string,
): boolean {
  let node: Node | null = target
  while (node && node !== root) {
    const overflowY = overflowYOf(node)
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return true
    }
    node = node.parentElement as Node | null
  }
  return false
}

export function clearNativeTextSelection(
  selection: { rangeCount: number; removeAllRanges: () => void } | null = globalThis.getSelection?.() ?? null,
) {
  if (selection && selection.rangeCount > 0) selection.removeAllRanges()
}
