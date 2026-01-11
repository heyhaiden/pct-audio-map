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
  }) => void
}

export function PCTMap({ onMapLoad, onMilesUpdate, onScrollControlReady }: PCTMapProps) {
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
  } = useTrailScroll({
    map: map.current,
    trailCoordinates,
    enabled: initialAnimationDone && trailData !== null,
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
    }),
    [pauseScrollAnimation, resumeScrollAnimation, syncScrollToPosition, setPendingSyncCoordinates],
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
          style: "mapbox://styles/heyhaiden/cmhrxqwyy004a01sd9ngkgljo",
          center: [-120.5, 40.0], // Center on mid-trail
          zoom: 5.2, // Slightly closer to see trail detail
          pitch: 45, // Angled view like looking at the trail from the side
          bearing: -25, // Rotated so south (start) is bottom-right, north (end) is upper-left
          antialias: true,
          interactive: false,
          attributionControl: false,
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

    initializeMap()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [scriptsLoaded, onMapLoad, trailData])

  useEffect(() => {
    if (!map.current || !mapLoaded || !trailData) return

    if (introPhase === "overview") {
      const timer = setTimeout(() => {
        setIntroPhase("flying")

        const startCoords = trailData.geometry.coordinates[0]

        // Stage 1: Slowly pull back bearing and start descending (crane pulling back)
        map.current.flyTo({
          center: [-119.5, 36.5], // Move toward the southern portion
          zoom: 7,
          pitch: 50,
          bearing: -15,
          duration: 4000,
          curve: 1.2,
          easing: (t: number) => t, // Linear for smooth transition
          essential: true,
        })

        // Stage 2: Continue descending toward trailhead
        setTimeout(() => {
          map.current.flyTo({
            center: [-116.8, 33.2], // Closer to Campo area
            zoom: 10,
            pitch: 45,
            bearing: -5,
            duration: 4000,
            curve: 1.2,
            easing: (t: number) => t,
            essential: true,
          })
        }, 4000)

        // Stage 3: Final approach - settle into starting position
        setTimeout(() => {
          map.current.flyTo({
            center: [startCoords[0], startCoords[1]],
            zoom: 14,
            pitch: 0,
            bearing: 0,
            duration: 3500,
            curve: 1.0,
            easing: (t: number) => {
              // Ease out - slow down as we arrive
              return 1 - Math.pow(1 - t, 2)
            },
            essential: true,
          })

          // Listen for the final animation to complete
          map.current.once("moveend", () => {
            setIntroPhase("done")
            setInitialAnimationDone(true)
          })
        }, 8000)
      }, 2500) // Longer initial pause to appreciate the overview

      return () => clearTimeout(timer)
    }
  }, [introPhase, mapLoaded, trailData])

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

  const scrollControlReadyCalledRef = useRef(false)

  useEffect(() => {
    if (initialAnimationDone && onScrollControlReady && !scrollControlReadyCalledRef.current) {
      scrollControlReadyCalledRef.current = true
      onScrollControlReady(scrollControls)
    }
  }, [initialAnimationDone, onScrollControlReady, scrollControls])

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
