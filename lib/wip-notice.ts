/**
 * Miles south of the content edge before a dismissed Trail Continues notice
 * can fire again. Camera/scroll jitter around the boundary used to clear the
 * dismissed flag and immediately retrigger the overlay.
 */
export const WIP_REARM_GAP_MILES = 40

export function shouldRearmWipNotice(currentMiles: number, wipMile: number) {
  return currentMiles < wipMile - WIP_REARM_GAP_MILES
}
