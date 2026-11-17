import { offsetLngLat, type FreeCameraPose } from "./railing-camera.ts"

/**
 * Where the intro fly-in should land so the scroll camera has nothing left to
 * do when it takes over.
 *
 * The intro used to land on a fixed camera (zoom 9.55 on desktop) and the
 * scroll rail then eased to its own mile-0 pose (zoom 10.85) half a second
 * later. The tiles loaded for the landing frame were replaced at once, and the
 * ones the rail needed joined the back of Mapbox's request queue.
 *
 * `flyTo` takes a standard camera (center, zoom, pitch, bearing), while the
 * rail speaks free-camera poses (position and altitude). This converts one to
 * the other with Mapbox's own zoom definition, so it needs no Mapbox import.
 */

/** Mapbox GL's default vertical field of view (`Transform._fov`), 36.87°. */
export const MAPBOX_DEFAULT_FOV_RAD = 0.6435011087932844
/** Mapbox GL's world tile size in pixels. */
const MAPBOX_TILE_SIZE = 512
/** Mapbox GL's `earthCircumference`: 2π × 6,371,008.8 m. */
const EARTH_CIRCUMFERENCE_METERS = 2 * Math.PI * 6_371_008.8

/**
 * The zoom Mapbox reports for a camera `heightAboveGroundMeters` from the
 * point under the screen centre, measured along the view direction. Mirrors
 * `Transform._zoomFromMercatorZ` with the mercator projection, which is what
 * the map uses at trail zoom levels.
 */
export function zoomForCameraHeight(options: {
  heightAboveGroundMeters: number
  lat: number
  viewportHeightPx: number
  fovRad?: number
}): number {
  const fov = options.fovRad ?? MAPBOX_DEFAULT_FOV_RAD
  const cameraToCenterDistance = (0.5 / Math.tan(fov / 2)) * options.viewportHeightPx
  const circumferenceAtLat = EARTH_CIRCUMFERENCE_METERS * Math.cos((options.lat * Math.PI) / 180)
  const mercatorHeight = options.heightAboveGroundMeters / circumferenceAtLat
  return Math.log2(cameraToCenterDistance / (mercatorHeight * MAPBOX_TILE_SIZE))
}

export type IntroLandingCamera = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

/**
 * The `flyTo` target that frames exactly what a free-camera pose frames.
 * Returns null when the inputs can't give a sensible camera, so the caller
 * keeps its fixed landing.
 *
 * `groundElevationMeters` is the drawn (exaggerated) terrain height under the
 * view. Leaving it at 0 when terrain hasn't loaded lands about 0.05 zoom short
 * at the trailhead, which the scroll camera absorbs without fetching new tiles.
 */
export function introLandingCamera(
  pose: FreeCameraPose,
  options: { viewportHeightPx: number; groundElevationMeters: number },
): IntroLandingCamera | null {
  const heightAboveGround = pose.altitude - options.groundElevationMeters
  if (
    !Number.isFinite(heightAboveGround) ||
    heightAboveGround <= 0 ||
    !(options.viewportHeightPx > 0) ||
    !Number.isFinite(pose.pitch) ||
    pose.pitch >= 90
  ) {
    return null
  }

  const pitchRad = (pose.pitch * Math.PI) / 180
  const groundOffsetKm = (heightAboveGround * Math.tan(pitchRad)) / 1000
  const center = offsetLngLat(pose.lng, pose.lat, groundOffsetKm, pose.bearing)

  return {
    center,
    zoom: zoomForCameraHeight({
      heightAboveGroundMeters: heightAboveGround / Math.cos(pitchRad),
      lat: center[1],
      viewportHeightPx: options.viewportHeightPx,
    }),
    pitch: pose.pitch,
    bearing: pose.bearing,
  }
}
