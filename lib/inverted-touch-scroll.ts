/** Pure helpers for map-journey touch scrolling (testable without DOM). */

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
  return {
    scrollDelta: sample.deltaY,
    velocity: sample.deltaY / dt,
  }
}

/** Whether inertia from a given velocity is strong enough to keep coasting. */
export function shouldStartInertia(velocity: number): boolean {
  return Math.abs(velocity) >= 0.05
}

/** Decay one inertia frame; returns next velocity (or 0 when stopped). */
export function stepInertiaVelocity(velocity: number, friction = 0.95): number {
  const next = velocity * friction
  return Math.abs(next) < 0.02 ? 0 : next
}
