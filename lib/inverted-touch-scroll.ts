/**
 * Finger pixels are 1:1 with document pixels, but the journey spacer is
 * 12,000vh (≈100k px). A trackpad flick already dumps thousands of pixels;
 * a phone swipe is a few hundred. Gain is 70% of the first 6x pass — still
 * faster than 1:1, without covering a chapter per flick.
 */
export const TOUCH_SCROLL_GAIN = 4.2

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

/** Whether inertia from a given velocity is strong enough to keep coasting. */
export function shouldStartInertia(velocity: number): boolean {
  return Math.abs(velocity) >= 0.05
}

/** Coast only if the finger was still moving at release. */
export function shouldCoastAfterRelease(velocity: number, msSinceLastMove: number): boolean {
  if (msSinceLastMove >= HOLD_STILL_MS) return false
  return shouldStartInertia(velocity)
}

/** Decay one inertia frame; returns next velocity (or 0 when stopped). */
export function stepInertiaVelocity(velocity: number, friction = 0.95): number {
  const next = velocity * friction
  return Math.abs(next) < 0.02 ? 0 : next
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
