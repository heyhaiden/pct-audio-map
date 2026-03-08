"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { pctSegments, pctTrailGeometry } from "@/data/pct-segments"
import { getMapboxToken } from "@/lib/mapbox-config"
import { useTrailScroll } from "@/hooks/use-trail-scroll"


declare global {
  interface Window {
    mapboxgl: any
    turf: any
  }
}

interface PCTMapProps {
  onMapLoad?: (map: any) => void
  onMilesUpdate?: (currentMiles: number, totalMiles: number) => void
  onScrollControlReady?: (controls: {
    pauseScrollAnimation: () => void
    resumeScrollAnimation: () => void
    syncScrollToPosition: (coordinates: [number, number]) => void
    setPendingSyncCoordinates: (coordinates: [number, number]) => void
    setBlocked: (blocked: boolean) => void
  }) => void
  onIntroComplete?: () => void
}

export function PCTMap({ onMapLoad, onMilesUpdate, onScrollControlReady, onIntroComplete }: PCTMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [initialAnimationDone, setInitialAnimationDone] = useState(false)
  const [introPhase, setIntroPhase] = useState<"waiting" | "overview" | "flying" | "done">("waiting")
  const [currentSegment, setCurrentSegment] = useState(0)
  const [mapboxError, setMapboxError] = useState<string | null>(null)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null)
  const [trailData, setTrailData] = useState<any>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [cameraInfo, setCameraInfo] = useState({ center: [0, 0], zoom: 0, pitch: 0, bearing: 0 })
  const [tilesPreloaded, setTilesPreloaded] = useState(false)
  const preloadingRef = useRef(false)

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
    }),
    [pauseScrollAnimation, resumeScrollAnimation, syncScrollToPosition, setPendingSyncCoordinates, setBlocked],
  )

  useEffect(() => {
    if (onMilesUpdate && totalMiles > 0) {
      onMilesUpdate(currentMiles, totalMiles)
    }
  }, [currentMiles, totalMiles, onMilesUpdate])

  useEffect(() => {
    const loadMapboxScripts = () => {
      const cssLink = document.createElement("link")
      cssLink.rel = "stylesheet"
      cssLink.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css"
      document.head.appendChild(cssLink)

      const turfScript = document.createElement("script")
      turfScript.src = "https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js"
      document.head.appendChild(turfScript)

      const script = document.createElement("script")
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"
      script.onload = () => {
        setScriptsLoaded(true)
      }
      script.onerror = () => {
        console.error("[v0] Failed to load Mapbox scripts")
        setMapboxError("Failed to load Mapbox scripts. Please check your internet connection.")
      }
      document.head.appendChild(script)
    }

    if (!window.mapboxgl && !scriptsLoaded) {
      loadMapboxScripts()
    } else if (window.mapboxgl) {
      setScriptsLoaded(true)
    }
  }, [scriptsLoaded])

  useEffect(() => {
    const initializeMap = async () => {
      if (!scriptsLoaded || !window.mapboxgl || !trailData) {
        return
      }

      try {
        if (!mapContainer.current || map.current) return

        let token: string
        try {
          token = await getMapboxToken()
        } catch (error) {
          console.error("[v0] Token error:", error)
          setMapboxError("Mapbox access token is required. Please set MAPBOX_ACCESS_TOKEN in your Project Settings.")
          return
        }

        window.mapboxgl.accessToken = token

        map.current = new window.mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/heyhaiden/cmhrxqwyy004a01sd9ngkgljo?optimize=true",
          center: [-118.4102, 38.6467],
          zoom: 5.49,
          pitch: 60,
          bearing: 31,
          antialias: true,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
          trackResize: true,
          refreshExpiredTiles: false,
        })

        map.current.on("load", () => {
          if (!map.current) return

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

          preloadTrailTiles()

          setIntroPhase("overview")
        })

        map.current.on("error", (e: any) => {
          console.error("[v0] Mapbox error:", e)
          setMapboxError("Failed to load map. Please check your Mapbox token and internet connection.")
        })
      } catch (error) {
        console.error("[v0] Failed to initialize Mapbox:", error)
        setMapboxError("Failed to load Mapbox. Please refresh the page and try again.")
      }
    }

    const preloadTrailTiles = () => {
      if (!map.current || !trailData || preloadingRef.current) return
      preloadingRef.current = true

      const coords = trailData.geometry.coordinates
      const totalPoints = coords.length

      const sampleInterval = Math.floor(totalPoints / 50)
      const samplePoints: [number, number][] = []

      for (let i = 0; i < totalPoints; i += sampleInterval) {
        samplePoints.push(coords[i])
      }
      samplePoints.push(coords[totalPoints - 1])

      let preloadIndex = 0

      const preloadNext = () => {
        if (preloadIndex >= samplePoints.length || !map.current) {
          setTilesPreloaded(true)
          return
        }

        const point = samplePoints[preloadIndex]

        try {
          const screenPoint = map.current.project(point)
          map.current.queryRenderedFeatures(screenPoint)
        } catch (e) {}

        preloadIndex++
        requestAnimationFrame(preloadNext)
      }

      setTimeout(preloadNext, 500)
    }

    initializeMap()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [scriptsLoaded, onMapLoad, trailData])

  useEffect(() => {
    if (!map.current || !mapLoaded || !currentPosition || !window.turf) return

    const source = map.current.getSource("position-cursor")
    if (source) {
      const point = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: currentPosition,
        },
      }

      source.setData(point)
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

    const updateCameraInfo = () => {
      if (map.current) {
        setCameraInfo({
          center: [map.current.getCenter().lng, map.current.getCenter().lat],
          zoom: map.current.getZoom(),
          pitch: map.current.getPitch(),
          bearing: map.current.getBearing(),
        })
      }
    }

    updateCameraInfo()
    const interval = setInterval(updateCameraInfo, 100)
    return () => clearInterval(interval)
  }, [mapLoaded, debugMode])

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

  useEffect(() => {
    if (introPhase !== "overview" || !map.current || !mapLoaded || debugMode) return

    // Wait a moment at the overview position before flying to trailhead
    const timer = setTimeout(() => {
      setIntroPhase("flying")

      map.current.flyTo({
        center: [-116.467, 32.5897],
        zoom: 9.55,
        pitch: 0,
        bearing: -5,
        duration: 8000,
        essential: true,
        easing: (t: number) => {
          // Ease-in-out cubic for balanced acceleration/deceleration
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        },
      })

      map.current.once("moveend", () => {
        // Small delay to ensure camera is fully settled before handoff
        setTimeout(() => {
          setIntroPhase("done")
          setInitialAnimationDone(true)
          onIntroComplete?.()
        }, 100)
      })
    }, 2000)

    return () => clearTimeout(timer)
  }, [introPhase, mapLoaded, debugMode])

  if (mapboxError) {
    return (
      <div className="relative h-full w-full">
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-center text-white max-w-md px-6">
            <div className="text-xl mb-4">⚠️ Map Loading Error</div>
            <div className="text-sm text-gray-300 mb-6">{mapboxError}</div>
            {mapboxError.includes("token") && (
              <div className="text-xs text-gray-400 bg-gray-800 rounded p-4">
                <div className="font-semibold mb-2">To fix this:</div>
                <div>1. Get a free Mapbox token at mapbox.com</div>
                <div>2. Add it to your Project Settings as MAPBOX_ACCESS_TOKEN</div>
                <div>3. Refresh the page</div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {(!scriptsLoaded || !trailData || !mapLoaded) && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-xl">
            {!scriptsLoaded ? "Loading Mapbox..." : !trailData ? "Loading trail data..." : "Loading PCT Audio Map..."}
          </div>
        </div>
      )}



      {mapLoaded && initialAnimationDone && (
        <div className="absolute top-6 left-6 z-10">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white max-w-xs">
            <h1 className="text-xl font-bold text-balance">Pacific Crest Trail Audio Journey</h1>
          </div>
        </div>
      )}
    </div>
  )
}
