import {
  easeInOutCubic,
  interpolatePose,
  type FreeCameraPose,
} from "@/lib/railing-camera"

export function readFreeCameraPose(map: any): FreeCameraPose | null {
  if (!map || typeof map.getFreeCameraOptions !== "function" || !window.mapboxgl) return null

  try {
    const camera = map.getFreeCameraOptions()
    if (!camera?.position) return null
    const lngLat = camera.position.toLngLat()
    return {
      lng: lngLat.lng,
      lat: lngLat.lat,
      altitude: camera.position.toAltitude(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    }
  } catch {
    return null
  }
}

export function applyFreeCameraPose(map: any, pose: FreeCameraPose): void {
  if (!map || typeof map.getFreeCameraOptions !== "function" || !window.mapboxgl) return

  const camera = map.getFreeCameraOptions()
  camera.position = window.mapboxgl.MercatorCoordinate.fromLngLat(
    { lng: pose.lng, lat: pose.lat },
    pose.altitude,
  )
  camera.setPitchBearing(pose.pitch, pose.bearing)
  map.setFreeCameraOptions(camera)
}

let activeAnimationId: number | null = null

export function cancelFreeCameraAnimation(): void {
  if (activeAnimationId !== null) {
    cancelAnimationFrame(activeAnimationId)
    activeAnimationId = null
  }
}

/**
 * Animate free-camera from `from` to `to` with ease-in-out cubic.
 * Returns a promise that resolves when the animation finishes (or is cancelled).
 */
export function animateFreeCamera(
  map: any,
  from: FreeCameraPose,
  to: FreeCameraPose,
  durationMs: number,
): Promise<void> {
  cancelFreeCameraAnimation()

  return new Promise((resolve) => {
    if (!map) {
      resolve()
      return
    }

    const start = performance.now()

    const step = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, durationMs <= 0 ? 1 : elapsed / durationMs)
      const eased = easeInOutCubic(t)
      applyFreeCameraPose(map, interpolatePose(from, to, eased))

      if (t < 1) {
        activeAnimationId = requestAnimationFrame(step)
      } else {
        activeAnimationId = null
        resolve()
      }
    }

    activeAnimationId = requestAnimationFrame(step)
  })
}
