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

export function clearNativeTextSelection(
  selection: { rangeCount: number; removeAllRanges: () => void } | null = globalThis.getSelection?.() ?? null,
) {
  if (selection && selection.rangeCount > 0) selection.removeAllRanges()
}
