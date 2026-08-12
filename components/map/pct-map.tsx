"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { pctSegments, pctTrailGeometry } from "@/data/pct-segments"
import { getMapboxToken } from "@/lib/mapbox-config"
import { useTrailScroll } from "@/hooks/use-trail-scroll"
import { isFatalMapboxError, isMapAlive } from "@/lib/map-runtime-policy"
import {
  startPathTilePrefetch,
  TRAILHEAD_READY_TIMEOUT_MS,
  type PrefetchController,
} from "@/lib/tile-prefetch"
import { isTrailPrepCached, markTrailPrepCached } from "@/lib/trail-prep-cache"

interface PCTMapProps {
  onMapLoad?: (map: any) => void
  onMilesUpdate?: (currentMiles: number, totalMiles: number) => void
  onScrollControlReady?: (controls: {
    pauseScrollAnimation: () => void
    resumeScrollAnimation: () => void
    syncScrollToPosition: (coordinates: [number, number]) => void
    setPendingSyncCoordinates: (coordinates: [number, number]) => void
    setBlocked: (blocked: boolean) => void
    getCameraPath: () => import("@/lib/railing-camera").CameraPathPoint[] | null
    getRailingPoseAtCoordinates: (
      coordinates: [number, number],
    ) => import("@/lib/railing-camera").FreeCameraPose | null
    getProgressFromCoordinates: (coordinates: [number, number]) => number
  }) => void
  onIntroComplete?: () => void
  /** Fired after prefetch is cancelled and camera is jumped to overview — safe to reveal map. */
  onOverviewReady?: () => void
  /** Fired when trailhead tiles are warm enough (or soft-timeout). */
  onTrailheadReady?: () => void
  /** Fired only when map startup cannot recover without a reload/config fix. */
  onMapError?: (message: string) => void
  /** 0–1 progress while warming the trailhead corridor. */
  onTrailheadProgress?: (progress: number) => void
  startIntro?: boolean
  /** Skip overview→trailhead fly; used when resuming mid-trail after site pages. */
  skipIntro?: boolean
  hideLoading?: boolean
  /** Used to warm tiles ahead of the railing camera. */
  currentMiles?: number
}

/** Bird's-eye overview shown at the start of the intro (desktop). */
export const OVERVIEW_CAMERA = {
  center: [-118.4102, 38.6467] as [number, number],
  zoom: 5.49,
  pitch: 60,
  bearing: 31,
}

/**
 * Mobile overview: top-down, north-up so the whole Mexico→Canada trail fits a
 * portrait screen. Desktop keeps the angled `OVERVIEW_CAMERA` — selected via
 * `getOverviewCamera()`. Center/zoom tuned to frame the full trail extent.
 */
export const OVERVIEW_CAMERA_MOBILE = {
  center: [-119.5, 40.8] as [number, number],
  zoom: 4.3,
  pitch: 0,
  bearing: 0,
}

/** Mexico border / trailhead — journey always begins here. */
export const TRAILHEAD_CAMERA = {
  center: [-116.467, 32.5897] as [number, number],
  zoom: 9.55,
  pitch: 0,
  bearing: -5,
}

/**
 * Distance fog. Load-bearing for perf, not just look: Mapbox culls tiles once
 * they're ~98% fogged (past `range[1]`), so at our 60°-pitch / ~26 km-altitude
 * cruise the frustum stops demanding the huge fan of far-horizon terrain that no
 * preloader can keep ahead of on a real network — and whatever does lag renders
 * as atmospheric haze instead of a white/black tear. `range` is camera-relative
 * (map center = 0); pulling `range[1]` in culls more aggressively. Cool-neutral
 * aerial-perspective palette — safe to warm up to taste without changing perf.
 */
const TRAIL_FOG = {
  range: [1.5, 10] as [number, number],
  "horizon-blend": 0.1,
  color: "#dbe4ec",
  "high-color": "#b0cdea",
  "space-color": "#c5d6e8",
  "star-intensity": 0,
}

/** Decided once at map construction — never toggled during scroll. */
function preferReducedGpu(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches
}

/** Top-down full-trail overview on mobile; angled bird's-eye on desktop. */
function getOverviewCamera() {
  return preferReducedGpu() ? OVERVIEW_CAMERA_MOBILE : OVERVIEW_CAMERA
}

export function PCTMap({
  onMapLoad,
  onMilesUpdate,
  onScrollControlReady,
  onIntroComplete,
  onOverviewReady,
  onTrailheadReady,
  onMapError,
  onTrailheadProgress,
  startIntro = false,
  skipIntro = false,
  hideLoading = false,
  currentMiles: externalMiles = 0,
}: PCTMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [initialAnimationDone, setInitialAnimationDone] = useState(false)
  const [introPhase, setIntroPhase] = useState<"waiting" | "overview" | "flying" | "done">("waiting")
  const [currentSegment, setCurrentSegment] = useState(0)
  const [mapboxError, setMapboxError] = useState<string | null>(null)
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null)
  const [trailData, setTrailData] = useState<any>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [, setTilesPreloaded] = useState(false)
  const prefetchRef = useRef<PrefetchController | null>(null)
  const introPhaseRef = useRef(introPhase)
  const accessTokenRef = useRef<string>("")
  const tokenPromiseRef = useRef<Promise<string> | null>(null)
  const trailheadReadyRef = useRef(false)
  const mapLoadedRef = useRef(false)
  const fatalErrorRef = useRef(false)
  const onTrailheadReadyRef = useRef(onTrailheadReady)
  const onTrailheadProgressRef = useRef(onTrailheadProgress)
  const onOverviewReadyRef = useRef(onOverviewReady)
  const onMapErrorRef = useRef(onMapError)

  useEffect(() => {
    introPhaseRef.current = introPhase
  }, [introPhase])

  useEffect(() => {
    onTrailheadReadyRef.current = onTrailheadReady
  }, [onTrailheadReady])

  useEffect(() => {
    onTrailheadProgressRef.current = onTrailheadProgress
  }, [onTrailheadProgress])

  useEffect(() => {
    onOverviewReadyRef.current = onOverviewReady
  }, [onOverviewReady])

  useEffect(() => {
    onMapErrorRef.current = onMapError
  }, [onMapError])

  const notifyTrailheadReady = () => {
    if (trailheadReadyRef.current || fatalErrorRef.current) return
    trailheadReadyRef.current = true
    setTilesPreloaded(true)
    onTrailheadProgressRef.current?.(1)
    onTrailheadReadyRef.current?.()
  }

  // Soft timeout so Enter is never gated forever (e.g. map init failure)
  useEffect(() => {
    // Session already warmed — unlock immediately (tiles live in browser HTTP cache)
    if (isTrailPrepCached()) {
      notifyTrailheadReady()
      return
    }

    const timer = setTimeout(() => {
      if (trailheadReadyRef.current || fatalErrorRef.current) return
      trailheadReadyRef.current = true
      setTilesPreloaded(true)
      onTrailheadProgressRef.current?.(1)
      onTrailheadReadyRef.current?.()
    }, TRAILHEAD_READY_TIMEOUT_MS + 2000)
    return () => clearTimeout(timer)
  }, [])

  // Kick token fetch as early as possible (parallel with scripts / geojson)
  useEffect(() => {
    if (!tokenPromiseRef.current) {
      tokenPromiseRef.current = getMapboxToken().catch((error) => {
        console.error("[v0] Token error:", error)
        throw error
      })
    }
  }, [])

  useEffect(() => {
    fetch("/pct-trail.geojson")
      .then((res) => res.json())
      .then((data) => {
        const feature = data.type === "FeatureCollection" ? data.features[0] : data
        console.log("[v0] Loaded trail data with", feature.geometry.coordinates.length, "points")
        setTrailData(feature)
      })
      .catch((err) => {
        console.error("[v0] Failed to load trail data:", err)
        setTrailData(pctTrailGeometry)
      })
  }, [])

  const trailCoordinates = trailData?.geometry?.coordinates || []
  const {
    scrollProgress,
    currentMiles,
    totalMiles,
    pauseScrollAnimation,
    resumeScrollAnimation,
    syncScrollToPosition,
    setPendingSyncCoordinates,
    setBlocked,
    getCameraPath,
    getRailingPoseAtCoordinates,
    getProgressFromCoordinates,
  } = useTrailScroll({
    map: map.current,
    trailCoordinates,
    enabled: initialAnimationDone && trailData !== null && !debugMode,
    onProgressChange: (progress, coordinates) => {
      setCurrentPosition(coordinates)
    },
  })

  const scrollControls = useMemo(
    () => ({
      pauseScrollAnimation,
      resumeScrollAnimation,
      syncScrollToPosition,
      setPendingSyncCoordinates,
      setBlocked,
      getCameraPath,
      getRailingPoseAtCoordinates,
      getProgressFromCoordinates,
    }),
    [
      pauseScrollAnimation,
      resumeScrollAnimation,
      syncScrollToPosition,
      setPendingSyncCoordinates,
      setBlocked,
      getCameraPath,
      getRailingPoseAtCoordinates,
      getProgressFromCoordinates,
    ],
  )

  useEffect(() => {
    if (onMilesUpdate && totalMiles > 0) {
      onMilesUpdate(currentMiles, totalMiles)
    }
  }, [currentMiles, totalMiles, onMilesUpdate])

  useEffect(() => {
    let disposed = false
    let startupTimer: number | null = null

    const failMap = (message: string, error: unknown) => {
      if (fatalErrorRef.current || disposed) return
      fatalErrorRef.current = true
      if (startupTimer !== null) {
        window.clearTimeout(startupTimer)
        startupTimer = null
      }
      console.error("[v0] Fatal Mapbox error:", error)
      prefetchRef.current?.cancel()
      prefetchRef.current = null
      setMapboxError(message)
      onMapErrorRef.current?.(message)

      const failedMap = map.current
      map.current = null
      if (failedMap && !failedMap._removed) failedMap.remove()
    }

    const initializeMap = async () => {
      if (!trailData) {
        return
      }

      startupTimer = window.setTimeout(() => {
        failMap(
          "The map took too long to start. Please check your connection and try again.",
          new Error("Mapbox startup timed out"),
        )
      }, TRAILHEAD_READY_TIMEOUT_MS)

      try {
        if (!mapContainer.current || map.current) return

        let token: string
        try {
          token = await (tokenPromiseRef.current ?? getMapboxToken())
        } catch (error) {
          failMap(
            "Mapbox access token is required. Please set MAPBOX_ACCESS_TOKEN in your Project Settings.",
            error,
          )
          return
        }

        if (disposed || !mapContainer.current || map.current) return

        mapboxgl.accessToken = token
        accessTokenRef.current = token

        const reducedGpu = preferReducedGpu()
        const overview = getOverviewCamera()
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/heyhaiden/cmhrxqwyy004a01sd9ngkgljo?optimize=true",
          center: overview.center,
          zoom: overview.zoom,
          pitch: overview.pitch,
          bearing: overview.bearing,
          antialias: !reducedGpu,
          interactive: false,
          attributionControl: false,
          // Crossfade tile refinement instead of hard-popping blurry→sharp. Was
          // 0 (set in the Jan "terrain perf" commit) — invisible while the camera
          // was static, but during the continuous flythrough every tile upgrade
          // snapped in, reading as jerky upresolution, worst in mountains. 300 is
          // the Mapbox default; the splash covers the intro so no flash leaks.
          fadeDuration: 300,
          trackResize: true,
          refreshExpiredTiles: false,
          // Mapbox sizes each source's tile cache from viewport area only
          // (~60 tiles at 1400×900), ignoring that a 60°-pitch terrain frustum
          // sees far more — and that our rolling preload window needs to stay
          // resident until the camera arrives. Raise the floor on desktop;
          // keep mobile capped for GPU memory.
          minTileCacheSize: reducedGpu ? undefined : 150,
          maxTileCacheSize: reducedGpu ? 80 : 300,
        })

        map.current.on("load", () => {
          if (disposed || !isMapAlive(map.current)) return
          if (startupTimer !== null) {
            window.clearTimeout(startupTimer)
            startupTimer = null
          }
          mapLoadedRef.current = true

          map.current.addSource("mapbox-terrain-rgb", {
            type: "raster-dem",
            url: "mapbox://mapbox.terrain-rgb",
            tileSize: 512,
            maxzoom: 14,
          })

          map.current.setTerrain({
            source: "mapbox-terrain-rgb",
            exaggeration: 1.8,
          })

          map.current.setFog(TRAIL_FOG)

          const cameraTrackingGeometry = {
            ...trailData,
            geometry: {
              ...trailData.geometry,
              coordinates: trailData.geometry.coordinates.map((coord: number[]) => [...coord]),
            },
          }

          map.current.addSource("camera-tracking-line", {
            type: "geojson",
            data: cameraTrackingGeometry,
            lineMetrics: true,
          })

          map.current.addLayer({
            id: "camera-tracking-layer",
            type: "line",
            source: "camera-tracking-line",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#000000",
              "line-width": 0,
              "line-opacity": 0,
            },
          })

          map.current.addSource("pct-trail", {
            type: "geojson",
            data: trailData,
          })

          map.current.addLayer({
            id: "pct-trail-glow-outer",
            type: "line",
            source: "pct-trail",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#ff6b9d",
              "line-width": 12,
              "line-opacity": 0.15,
              "line-blur": 4,
            },
          })

          map.current.addLayer({
            id: "pct-trail-glow-inner",
            type: "line",
            source: "pct-trail",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#ff6b9d",
              "line-width": 8,
              "line-opacity": 0.4,
              "line-blur": 2,
            },
          })

          map.current.addLayer({
            id: "pct-trail-line",
            type: "line",
            source: "pct-trail",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#ff6b9d",
              "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 6, 15, 10],
              "line-opacity": 0.95,
            },
          })

          map.current.addSource("position-cursor", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: trailData.geometry.coordinates[0],
              },
            },
          })

          setMapLoaded(true)
          onMapLoad?.(map.current)

          if (disposed || !isMapAlive(map.current)) return

          prefetchRef.current?.cancel()
          prefetchRef.current = startPathTilePrefetch({
            map: map.current,
            trailCoordinates: trailData.geometry.coordinates,
            getCameraPath,
            onTrailheadWarm: () => {
              markTrailPrepCached()
              notifyTrailheadReady()
            },
            onTrailheadProgress: (progress) => onTrailheadProgressRef.current?.(progress),
            trailheadAlreadyCached: isTrailPrepCached(),
            reducedGpu,
            // Any easeTo/jumpTo (even preloadOnly) would cancel the intro flyTo mid-flight
            isIntroFlying: () => introPhaseRef.current === "flying",
          })
        })

        map.current.on("error", (e: any) => {
          const error = e?.error ?? e
          if (!isFatalMapboxError(e, mapLoadedRef.current)) {
            console.warn("[v0] Recoverable Mapbox resource error:", error)
            return
          }
          failMap("Failed to load map. Please check your Mapbox token and internet connection.", error)
        })
      } catch (error) {
        failMap("Failed to load Mapbox. Please refresh the page and try again.", error)
      }
    }

    initializeMap()

    return () => {
      disposed = true
      if (startupTimer !== null) window.clearTimeout(startupTimer)
      prefetchRef.current?.cancel()
      prefetchRef.current = null
      mapLoadedRef.current = false
      const liveMap = map.current
      map.current = null
      // Cancel first, then remove — in-flight preloadOnly callbacks check _removed.
      if (liveMap && !liveMap._removed) {
        liveMap.remove()
      }
    }
  }, [getCameraPath, onMapLoad, trailData])

  // Ahead-of-scroll tile warm. Throttle (fire DURING motion), not debounce:
  // currentMiles republishes ~10/s while scrolling, so a trailing-only timer
  // would keep resetting and never fire until the user stops — starving the
  // rolling window in exactly the fast-scroll case. warmAhead is internally
  // cheap and idempotent (12mi re-arm gate), so leading-edge calls are safe.
  const lastWarmAtRef = useRef(0)
  useEffect(() => {
    if (!mapLoaded || !prefetchRef.current) return
    const now = performance.now()
    const sinceLast = now - lastWarmAtRef.current
    if (sinceLast >= 250) {
      lastWarmAtRef.current = now
      prefetchRef.current.warmAhead(externalMiles || currentMiles)
      return
    }
    // Trailing call so the final resting position still gets warmed.
    const timer = setTimeout(() => {
      lastWarmAtRef.current = performance.now()
      prefetchRef.current?.warmAhead(externalMiles || currentMiles)
    }, 250 - sinceLast)
    return () => clearTimeout(timer)
  }, [externalMiles, currentMiles, mapLoaded])

  useEffect(() => {
    if (!isMapAlive(map.current) || !mapLoaded || !currentPosition) return

    const source = map.current.getSource("position-cursor")
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: currentPosition,
        },
      })
    }
  }, [currentPosition, mapLoaded])

  useEffect(() => {
    if (initialAnimationDone && onScrollControlReady && !scrollControlReadyCalledRef.current) {
      scrollControlReadyCalledRef.current = true
      onScrollControlReady(scrollControls)
    }
  }, [initialAnimationDone, onScrollControlReady, scrollControls])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    if (debugMode) {
      map.current.dragPan.enable()
      map.current.scrollZoom.enable()
      map.current.dragRotate.enable()
      map.current.touchZoomRotate.enable()
      map.current.keyboard.enable()
      map.current.boxZoom.enable()
      map.current.doubleClickZoom.enable()
    } else {
      map.current.dragPan.disable()
      map.current.scrollZoom.disable()
      map.current.dragRotate.disable()
      map.current.touchZoomRotate.disable()
      map.current.keyboard.disable()
      map.current.boxZoom.disable()
      map.current.doubleClickZoom.disable()
    }
  }, [debugMode, mapLoaded])

  const flyToSegment = (segmentIndex: number) => {
    if (!map.current || !mapLoaded) return

    const segment = pctSegments[segmentIndex]
    if (!segment) return

    map.current.flyTo({
      center: segment.camera.center,
      zoom: segment.camera.zoom,
      pitch: segment.camera.pitch,
      bearing: segment.camera.bearing,
      duration: segment.camera.duration,
      essential: true,
    })

    setCurrentSegment(segmentIndex)
  }

  const scrollControlReadyCalledRef = useRef(false)

  // Resume mid-trail: enable scroll camera immediately, no overview/fly sequence.
  useEffect(() => {
    if (!skipIntro || !mapLoaded || initialAnimationDone) return
    prefetchRef.current?.cancel()
    introPhaseRef.current = "done"
    setIntroPhase("done")
    setInitialAnimationDone(true)
    onIntroComplete?.()
  }, [skipIntro, mapLoaded, initialAnimationDone, onIntroComplete])

  // Start intro: cancel warm, restore overview UNDER splash, then reveal + fly to trailhead.
  useEffect(() => {
    if (skipIntro) return
    if (startIntro && introPhase === "waiting" && mapLoaded && isMapAlive(map.current)) {
      // Stop any in-flight camera warm immediately
      prefetchRef.current?.cancel()
      introPhaseRef.current = "overview"

      const overview = getOverviewCamera()
      map.current.jumpTo({
        center: overview.center,
        zoom: overview.zoom,
        pitch: overview.pitch,
        bearing: overview.bearing,
      })

      // Wait for overview tiles before parent fades splash — prevents mid-trail / black flash
      const reveal = () => {
        onOverviewReadyRef.current?.()
        setIntroPhase("overview")
      }

      let revealed = false
      const safeReveal = () => {
        if (revealed) return
        revealed = true
        reveal()
      }

      map.current.once("idle", safeReveal)
      // Fallback if idle is slow (cached tiles may already be warm)
      const fallback = setTimeout(safeReveal, 700)
      return () => {
        clearTimeout(fallback)
      }
    }
  }, [startIntro, skipIntro, introPhase, mapLoaded])

  useEffect(() => {
    if (skipIntro) return
    if (introPhase !== "overview" || !isMapAlive(map.current) || !mapLoaded || debugMode) return

    // Brief hold on overview, then crane to trailhead (always start of map)
    const timer = setTimeout(() => {
      if (!isMapAlive(map.current)) return
      setIntroPhase("flying")

      map.current.flyTo({
        center: TRAILHEAD_CAMERA.center,
        zoom: TRAILHEAD_CAMERA.zoom,
        pitch: TRAILHEAD_CAMERA.pitch,
        bearing: TRAILHEAD_CAMERA.bearing,
        duration: 8000,
        essential: true,
        easing: (t: number) =>
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      })

      map.current.once("moveend", () => {
        setTimeout(() => {
          setIntroPhase("done")
          setInitialAnimationDone(true)
          onIntroComplete?.()
        }, 100)
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [introPhase, mapLoaded, debugMode, onIntroComplete, skipIntro])

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {mapboxError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="max-w-md px-6 text-center text-white">
            <div className="mb-4 text-xl">⚠️ Map Loading Error</div>
            <div className="mb-6 text-sm text-gray-300">{mapboxError}</div>
            {mapboxError.includes("token") && (
              <div className="rounded bg-gray-800 p-4 text-xs text-gray-400">
                <div className="mb-2 font-semibold">To fix this:</div>
                <div>1. Get a free Mapbox token at mapbox.com</div>
                <div>2. Add it to your Project Settings as MAPBOX_ACCESS_TOKEN</div>
                <div>3. Refresh the page</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Never flash this during splash→intro — hideLoading covers that path */}
      {!mapboxError && !hideLoading && (!trailData || !mapLoaded) && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-xl">
            {!trailData ? "Loading trail data..." : "Loading PCT Audio Map..."}
          </div>
        </div>
      )}
    </div>
  )
}
