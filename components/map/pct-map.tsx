"use client"

import { useEffect, useRef, useState } from "react"
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
}

export function PCTMap({ onMapLoad, onMilesUpdate }: PCTMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [initialAnimationDone, setInitialAnimationDone] = useState(false)
  const [currentSegment, setCurrentSegment] = useState(0)
  const [mapboxError, setMapboxError] = useState<string | null>(null)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null)

  const trailCoordinates = pctTrailGeometry.geometry.coordinates
  const { scrollProgress, currentMiles, totalMiles } = useTrailScroll({
    map: map.current,
    trailCoordinates,
    enabled: initialAnimationDone,
    onProgressChange: (progress, coordinates) => {
      setCurrentPosition(coordinates)
    },
  })

  useEffect(() => {
    if (onMilesUpdate && totalMiles > 0) {
      onMilesUpdate(currentMiles, totalMiles)
    }
  }, [currentMiles, totalMiles, onMilesUpdate])

  useEffect(() => {
    const loadMapboxScripts = () => {
      // Load CSS
      const cssLink = document.createElement("link")
      cssLink.rel = "stylesheet"
      cssLink.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css"
      document.head.appendChild(cssLink)

      const turfScript = document.createElement("script")
      turfScript.src = "https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js"
      document.head.appendChild(turfScript)

      // Load Mapbox JS
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
      if (!scriptsLoaded || !window.mapboxgl) {
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
          center: [-118.29, 36.58],
          zoom: 6,
          pitch: 60,
          bearing: 30,
          antialias: true,
          interactive: true,
          dragPan: false,
          dragRotate: false,
          scrollZoom: false,
          boxZoom: false,
          doubleClickZoom: false,
          touchZoomRotate: false,
          touchPitch: false,
          keyboard: false,
          attributionControl: false,
          // Performance optimizations
          maxTileCacheSize: 500, // Increase tile cache for smoother scrolling
          preserveDrawingBuffer: false, // Better performance
          refreshExpiredTiles: false, // Reduce unnecessary tile reloads
          fadeDuration: 100, // Faster tile fade-in
        })

        map.current.on("load", () => {
          if (!map.current) return

          map.current.addSource("mapbox-terrain-rgb", {
            type: "raster-dem",
            url: "mapbox://mapbox.terrain-rgb",
            tileSize: 512, // Larger tile size for fewer requests
            maxzoom: 14, // Reduced from 15 to load fewer tiles
          })

          map.current.setTerrain({
            source: "mapbox-terrain-rgb",
            exaggeration: 1.8,
          })

          // This provides smooth coordinates for the camera to follow without elevation changes
          const cameraTrackingGeometry = {
            ...pctTrailGeometry,
            geometry: {
              ...pctTrailGeometry.geometry,
              // Clone coordinates to use for camera tracking
              coordinates: pctTrailGeometry.geometry.coordinates.map((coord) => [...coord]),
            },
          }

          map.current.addSource("camera-tracking-line", {
            type: "geojson",
            data: cameraTrackingGeometry,
            lineMetrics: true,
          })

          // This layer is invisible - used only for camera tracking
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
              "line-opacity": 0, // Invisible
            },
          })

          // Visible trail line source - follows terrain
          map.current.addSource("pct-trail", {
            type: "geojson",
            data: pctTrailGeometry,
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
                coordinates: pctTrailGeometry.geometry.coordinates[0],
              },
            },
          })

          map.current.addLayer({
            id: "position-cursor-outer",
            type: "circle",
            source: "position-cursor",
            paint: {
              "circle-radius": 12,
              "circle-color": "#fbbf24",
              "circle-opacity": 0.3,
              "circle-blur": 0.5,
            },
          })

          map.current.addLayer({
            id: "position-cursor-inner",
            type: "circle",
            source: "position-cursor",
            paint: {
              "circle-radius": 8,
              "circle-color": "#fbbf24",
              "circle-opacity": 1,
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
            },
          })

          const waypoints = [
            { name: "Campo (Start)", coordinates: [-116.465, 32.599] },
            { name: "Mount Whitney", coordinates: [-118.68, 37.06] },
            { name: "Tuolumne Meadows", coordinates: [-119.18, 38.03] },
            { name: "Mount Shasta", coordinates: [-122.31, 41.31] },
            { name: "Crater Lake", coordinates: [-122.12, 43.07] },
            { name: "Mount Hood", coordinates: [-121.78, 44.91] },
            { name: "Manning Park (End)", coordinates: [-120.78, 49.0] },
          ]

          waypoints.forEach((waypoint, index) => {
            const marker = new window.mapboxgl.Marker({
              color: "#ff6b9d",
              scale: 0.8,
            })
              .setLngLat(waypoint.coordinates as [number, number])
              .setPopup(
                new window.mapboxgl.Popup({ offset: 25 }).setHTML(
                  `<div class="text-sm font-semibold">${waypoint.name}</div>`,
                ),
              )
              .addTo(map.current!)
          })

          setMapLoaded(true)
          onMapLoad?.(map.current)

          setTimeout(() => {
            const trailheadCoord = pctTrailGeometry.geometry.coordinates[0]

            map.current!.flyTo({
              center: trailheadCoord,
              zoom: 14.5,
              pitch: 75,
              bearing: 0,
              duration: 6000,
              easing: (t: number) => {
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
              },
              essential: true,
            })

            setTimeout(() => {
              setInitialAnimationDone(true)
            }, 5500)
          }, 1500)

          map.current.once("idle", () => {
            // Prefetch tiles for better scroll performance
            const trailBounds = [
              [-122.5, 32.5], // Southwest
              [-116.0, 49.5], // Northeast
            ]

            // Trigger tile prefetching by briefly adjusting bounds
            const currentCenter = map.current.getCenter()
            const currentZoom = map.current.getZoom()

            map.current.fitBounds(trailBounds, {
              duration: 0,
              maxZoom: 12,
              padding: 0,
            })

            // Restore original view after prefetch
            setTimeout(() => {
              map.current.setCenter(currentCenter)
              map.current.setZoom(currentZoom)
            }, 100)
          })
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
  }, [scriptsLoaded, onMapLoad])

  useEffect(() => {
    if (!map.current || !mapLoaded || !currentPosition || !window.turf) return

    const source = map.current.getSource("position-cursor")
    if (source) {
      // Create a point feature with the current position
      const point = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: currentPosition,
        },
      }

      // Use Turf to create smooth point updates
      source.setData(point)
    }
  }, [currentPosition, mapLoaded])

  const flyToSegment = (segmentIndex: number) => {
    if (!map.current || !mapLoaded) return

    const segment = pctSegments[segmentIndex]
    if (!segment) return

    if (segment.terrain) {
      map.current.setTerrain({
        source: "mapbox-terrain-rgb",
        exaggeration: segment.terrain.exaggeration,
      })
    }

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

      {(!scriptsLoaded || !mapLoaded) && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-xl">{!scriptsLoaded ? "Loading Mapbox..." : "Loading PCT Audio Map..."}</div>
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
