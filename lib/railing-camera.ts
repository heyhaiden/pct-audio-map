export const PCT_TOTAL_MILES = 2650
export const CAMERA_PATH_POINTS = 500
const OPENING_TRANSITION_MILES = 80
export const END_TRANSITION_MILES = 14
export const CRUISING_ALTITUDE_METERS = 26000
/** Higher cruise on mobile so more trail is visible in portrait. */
const CRUISING_ALTITUDE_METERS_MOBILE = 42000
const INTRO_ALTITUDE_METERS = 50000
const INTRO_ALTITUDE_METERS_MOBILE = 65000
export const PEAK_PITCH = 60
/** Punch-in lowers altitude to this fraction of the railing altitude. */
const PUNCH_IN_ALTITUDE_FACTOR = 0.68
/** Pitch at or below this counts as the end-of-trail top-down framing. */
const TOP_DOWN_PITCH_DEG = 5

/** Exponential follow time constants (seconds). Higher = smoother, laggier. */
const CAMERA_FOLLOW_POSITION_TAU = 0.16
const CAMERA_FOLLOW_BEARING_TAU = 0.28
const CAMERA_FOLLOW_POSITION_TAU_MOBILE = 0.28
const CAMERA_FOLLOW_BEARING_TAU_MOBILE = 0.48
/** Release / hold: shorter tau so the camera snaps to rest instead of trailing. */
const CAMERA_FOLLOW_POSITION_TAU_SETTLE = 0.08
const CAMERA_FOLLOW_BEARING_TAU_SETTLE = 0.14
const CAMERA_FOLLOW_POSITION_TAU_MOBILE_SETTLE = 0.12
const CAMERA_FOLLOW_BEARING_TAU_MOBILE_SETTLE = 0.18

let activeCruisingAltitude = CRUISING_ALTITUDE_METERS
let activeIntroAltitude = INTRO_ALTITUDE_METERS
let activeMobileViewport = false

/** Call at map construction and when the viewport crosses the mobile breakpoint. */
export function configureRailingCameraForViewport(mobile: boolean) {
  activeCruisingAltitude = mobile ? CRUISING_ALTITUDE_METERS_MOBILE : CRUISING_ALTITUDE_METERS
  activeIntroAltitude = mobile ? INTRO_ALTITUDE_METERS_MOBILE : INTRO_ALTITUDE_METERS
  activeMobileViewport = mobile
}

export function isMobileRailingViewport() {
  return activeMobileViewport
}

export function cameraFollowFactors(
  deltaSeconds: number,
  mobile: boolean,
  settling = false,
) {
  const positionTau = settling
    ? mobile
      ? CAMERA_FOLLOW_POSITION_TAU_MOBILE_SETTLE
      : CAMERA_FOLLOW_POSITION_TAU_SETTLE
    : mobile
      ? CAMERA_FOLLOW_POSITION_TAU_MOBILE
      : CAMERA_FOLLOW_POSITION_TAU
  const bearingTau = settling
    ? mobile
      ? CAMERA_FOLLOW_BEARING_TAU_MOBILE_SETTLE
      : CAMERA_FOLLOW_BEARING_TAU_SETTLE
    : mobile
      ? CAMERA_FOLLOW_BEARING_TAU_MOBILE
      : CAMERA_FOLLOW_BEARING_TAU
  return {
    positionFactor: 1 - Math.exp(-deltaSeconds / positionTau),
    bearingFactor: 1 - Math.exp(-deltaSeconds / bearingTau),
  }
}

/** Skip every-other-frame camera writes when a scroll frame ran over budget. */
export function shouldDecimateCameraWrites(
  isScrolling: boolean,
  deltaSeconds: number,
  mobile: boolean,
) {
  if (mobile) return false
  return isScrolling && deltaSeconds > 0.02
}


export type CameraPathPoint = {
  lng: number
  lat: number
  bearing: number
  smoothedBearing: number
}

export type FreeCameraPose = {
  lng: number
  lat: number
  altitude: number
  pitch: number
  bearing: number
}

export function lerpBearing(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180
  return (a + diff * t + 360) % 360
}

/** Move distanceKm from [lng, lat] along bearingDeg (great-circle). */
export function offsetLngLat(
  lng: number,
  lat: number,
  distanceKm: number,
  bearingDeg: number,
): [number, number] {
  const R = 6371
  const brng = (bearingDeg * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180
  const angular = distanceKm / R
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(brng),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    )
  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function interpolatePose(from: FreeCameraPose, to: FreeCameraPose, t: number): FreeCameraPose {
  return {
    lng: from.lng + (to.lng - from.lng) * t,
    lat: from.lat + (to.lat - from.lat) * t,
    altitude: from.altitude + (to.altitude - from.altitude) * t,
    pitch: from.pitch + (to.pitch - from.pitch) * t,
    bearing: lerpBearing(from.bearing, to.bearing, t),
  }
}

export function findProgressFromCoordinates(
  path: CameraPathPoint[],
  coordinates: [number, number],
): number {
  if (!path.length) return 0
  const [lng, lat] = coordinates
  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY

  for (let i = 0; i < path.length; i++) {
    const point = path[i]
    const distance = Math.sqrt(Math.pow(point.lng - lng, 2) + Math.pow(point.lat - lat, 2))
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = i
    }
  }

  return closestIndex / (path.length - 1)
}

export function sampleTrailAtProgress(
  path: CameraPathPoint[],
  progress: number,
): { lng: number; lat: number; bearing: number } {
  const clamped = Math.max(0, Math.min(1, progress))
  const pathIndex = clamped * (path.length - 1)
  const lowerIndex = Math.floor(pathIndex)
  const upperIndex = Math.min(Math.ceil(pathIndex), path.length - 1)
  const fraction = pathIndex - lowerIndex
  const lower = path[lowerIndex]
  const upper = path[upperIndex]

  return {
    lng: lower.lng + (upper.lng - lower.lng) * fraction,
    lat: lower.lat + (upper.lat - lower.lat) * fraction,
    bearing: lerpBearing(lower.smoothedBearing, upper.smoothedBearing, fraction),
  }
}

export function altitudeAndPitchForProgress(progress: number): { altitude: number; pitch: number } {
  const miles = progress * PCT_TOTAL_MILES
  const openingPhase = Math.min(1, miles / OPENING_TRANSITION_MILES)
  const openingEase = 1 - Math.pow(1 - openingPhase, 3)
  const altitude =
    activeIntroAltitude + (activeCruisingAltitude - activeIntroAltitude) * openingEase

  const endTransitionStart = 1 - END_TRANSITION_MILES / PCT_TOTAL_MILES
  let pitch = PEAK_PITCH * openingEase

  if (progress >= endTransitionStart) {
    const endPhase = (progress - endTransitionStart) / (1 - endTransitionStart)
    // Ease-in: hold cruise pitch while the terminus is still ahead in frame,
    // then tip down onto it in the final stretch. A linear drop over a long
    // window shrinks look-ahead and the terminus never enters the viewport.
    const tilt = endPhase * endPhase * endPhase
    pitch = PEAK_PITCH * (1 - tilt)
  }

  return { altitude, pitch }
}

/** True only in the final end-tilt when the camera has tipped to top-down. */
export function shouldShowNorthernTerminus(miles: number): boolean {
  const progress = miles / PCT_TOTAL_MILES
  const endTransitionStart = 1 - END_TRANSITION_MILES / PCT_TOTAL_MILES
  if (progress < endTransitionStart) return false
  return altitudeAndPitchForProgress(progress).pitch <= TOP_DOWN_PITCH_DEG
}

/** Exact railing free-camera pose for a given progress along the camera path. */
export function computeRailingPose(path: CameraPathPoint[], progress: number): FreeCameraPose {
  const trail = sampleTrailAtProgress(path, progress)
  const { altitude, pitch } = altitudeAndPitchForProgress(progress)
  const groundOffsetKm = (altitude * Math.tan((pitch * Math.PI) / 180)) / 1000
  const [lng, lat] = offsetLngLat(trail.lng, trail.lat, groundOffsetKm, (trail.bearing + 180) % 360)

  return {
    lng,
    lat,
    altitude,
    pitch,
    bearing: trail.bearing,
  }
}

/** Closer framing of a marker while keeping railing pitch/bearing. */
export function computePunchInPose(
  path: CameraPathPoint[],
  markerCoordinates: [number, number],
): FreeCameraPose {
  const progress = findProgressFromCoordinates(path, markerCoordinates)
  const railing = computeRailingPose(path, progress)
  const altitude = railing.altitude * PUNCH_IN_ALTITUDE_FACTOR
  const groundOffsetKm = (altitude * Math.tan((railing.pitch * Math.PI) / 180)) / 1000
  const [lng, lat] = offsetLngLat(
    markerCoordinates[0],
    markerCoordinates[1],
    groundOffsetKm,
    (railing.bearing + 180) % 360,
  )

  return {
    lng,
    lat,
    altitude,
    pitch: railing.pitch,
    bearing: railing.bearing,
  }
}
