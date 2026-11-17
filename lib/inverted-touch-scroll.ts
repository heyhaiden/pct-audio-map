/**
 * Finger pixels are 1:1 with document pixels, but the journey spacer is
 * 12,000vh (≈100k px, about 38 px per mile on a 390x844 phone). A trackpad
 * flick already dumps thousands of pixels; a phone swipe is a few hundred.
 *
 * At 4.2 a 300 px drag moved 33 miles and a quick flick about 66 (lab, phone
 * profile), which testers called heavy. 6 with the longer glide below roughly
 * doubles a flick; chapter gates still stop a flick at each chapter boundary.
 */
export const TOUCH_SCROLL_GAIN = 6

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

/**
 * Per-frame velocity kept while coasting after a flick. A glide covers about
 * 1 / (1 - friction) frames of release speed: 20 at 0.95, 29 at 0.965.
 */
export const INERTIA_FRICTION = 0.965

/** Decay one inertia frame; returns next velocity (or 0 when stopped). */
export function stepInertiaVelocity(velocity: number, friction = INERTIA_FRICTION): number {
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
