"use client"

import { useEffect, useRef, useState } from "react"
import { pctSegments, pctTrailGeometry } from "@/data/pct-segments"
import { getMapboxToken } from "@/lib/mapbox-config"
import { useTrailScroll } from "@/hooks/use-trail-scroll"

declare global {
  interface Window {
    mapboxgl: any
  }
}

interface PCTMapProps {
  onMapLoad?: (map: any) => void
}

export function PCTMap({ onMapLoad }: PCTMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [initialAnimationDone, setInitialAnimationDone] = useState(false)
  const [currentSegment, setCurrentSegment] = useState(0)
  const [mapboxError, setMapboxError] = useState<string | null>(null)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)

  const trailCoordinates = pctTrailGeometry.geometry.coordinates
  useTrailScroll({
    map: map.current,
    trailCoordinates,
    enabled: initialAnimationDone,
  })

  useEffect(() => {
    const loadMapboxScripts = () => {
      console.log("[v0] Loading Mapbox scripts...")

      // Load CSS
      const cssLink = document.createElement("link")
      cssLink.rel = "stylesheet"
      cssLink.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css"
      document.head.appendChild(cssLink)

      // Load JS
      const script = document.createElement("script")
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"
      script.onload = () => {
        console.log("[v0] Mapbox scripts loaded successfully")
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
      console.log("[v0] Initializing map...", { scriptsLoaded, mapboxgl: !!window.mapboxgl })

      if (!scriptsLoaded || !window.mapboxgl) {
        console.log("[v0] Waiting for Mapbox scripts to load...")
        return
      }

      try {
        if (!mapContainer.current || map.current) return

        console.log("[v0] Getting Mapbox token...")
        // Get Mapbox token from server action
        let token: string
        try {
          token = await getMapboxToken()
          console.log("[v0] Token received:", token ? "✓" : "✗")
        } catch (error) {
          console.error("[v0] Token error:", error)
          setMapboxError("Mapbox access token is required. Please set MAPBOX_ACCESS_TOKEN in your Project Settings.")
          return
        }

        window.mapboxgl.accessToken = token
        console.log("[v0] Creating map...")

        map.current = new window.mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/heyhaiden/cmhrxqwyy004a01sd9ngkgljo",
          center: [-118.29, 36.58], // Start in Sierra Nevada
          zoom: 6,
          pitch: 60,
          bearing: 30,
          antialias: true,
          interactive: true,
          // Disable specific interactions to maintain scroll-driven experience
          dragPan: false,
          dragRotate: false,
          scrollZoom: false,
          boxZoom: false,
          doubleClickZoom: false,
          touchZoomRotate: false,
          touchPitch: false,
          keyboard: false,
          attributionControl: false,
        })

        console.log("[v0] Map created, waiting for load event...")

        map.current.on("load", () => {
          console.log("[v0] Map loaded successfully!")
          if (!map.current) return

          // Add terrain source and layer for 3D visualization
          map.current.addSource("mapbox-terrain-rgb", {
            type: "raster-dem",
            url: "mapbox://mapbox.terrain-rgb",
            tileSize: 256, // Reduced from 512 for faster loading
            maxzoom: 15, // Increased from 14 for better quality when scrolling
          })

          map.current.setTerrain({
            source: "mapbox-terrain-rgb",
            exaggeration: 1.2, // Reduced from 1.5 for better performance
          })

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

          console.log("[v0] Map setup complete!")
          setMapLoaded(true)
          onMapLoad?.(map.current) // Notify parent component that map is loaded

          setTimeout(() => {
            console.log("[v0] Starting initial animation to trailhead...")
            const trailheadCoord = pctTrailGeometry.geometry.coordinates[0]

            map.current!.flyTo({
              center: trailheadCoord,
              zoom: 13.5, // Increased from 12 to 13.5 for closer starting view
              pitch: 70, // Keep same pitch to maintain horizon view
              bearing: 0, // Face north
              duration: 6000, // Slower animation
              easing: (t: number) => {
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
              },
              essential: true,
            })

            // Enable scroll control after animation completes
            setTimeout(() => {
              console.log("[v0] Initial animation complete. Scroll enabled.")
              setInitialAnimationDone(true)
            }, 5500) // Adjusted to match new animation duration
          }, 1500) // 1.5 second delay before initial animation
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

  const flyToSegment = (segmentIndex: number) => {
    if (!map.current || !mapLoaded) return

    const segment = pctSegments[segmentIndex]
    if (!segment) return

    // Update terrain exaggeration for the segment
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
      {/* Map container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Loading overlay */}
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
