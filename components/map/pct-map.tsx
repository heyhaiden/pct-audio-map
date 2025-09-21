"use client"

import { useEffect, useRef, useState } from "react"
import { pctSegments, pctTrailGeometry } from "@/data/pct-segments"
import { CameraController } from "./camera-controller"
import { getMapboxToken } from "@/lib/mapbox-config"

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
  const [currentSegment, setCurrentSegment] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [mapboxError, setMapboxError] = useState<string | null>(null)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)

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
          style: "mapbox://styles/mapbox/satellite-v9",
          center: [-118.29, 36.58], // Start in Sierra Nevada
          zoom: 6,
          pitch: 60,
          bearing: 30,
          antialias: true,
          interactive: false, // Disable interaction for scroll-driven experience
        })

        console.log("[v0] Map created, waiting for load event...")

        map.current.on("load", () => {
          console.log("[v0] Map loaded successfully!")
          if (!map.current) return

          // Add terrain source and layer for 3D visualization
          map.current.addSource("mapbox-terrain-rgb", {
            type: "raster-dem",
            url: "mapbox://mapbox.terrain-rgb",
            tileSize: 512,
            maxzoom: 14,
          })

          // Enable 3D terrain with initial exaggeration
          map.current.setTerrain({
            source: "mapbox-terrain-rgb",
            exaggeration: 1.5,
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
    if (!map.current || !mapLoaded || isPlaying) return

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

      {/* Navigation controls */}
      {mapLoaded && (
        <div className="absolute top-6 left-6 z-10">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white max-w-xs">
            <h1 className="text-xl font-bold mb-4 text-balance">Pacific Crest Trail Audio Journey</h1>
            <div className="space-y-2">
              {pctSegments.map((segment, index) => (
                <button
                  key={segment.id}
                  onClick={() => flyToSegment(index)}
                  disabled={isPlaying}
                  className={`block w-full text-left px-3 py-2 rounded transition-colors ${
                    currentSegment === index ? "bg-[#ff6b9d] text-white" : "hover:bg-white/20"
                  } ${isPlaying ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="font-medium">{segment.title}</div>
                  <div className="text-xs text-gray-300 mt-1">{segment.description.split(".")[0]}...</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Camera Controller */}
      {mapLoaded && (
        <CameraController
          map={map.current}
          isPlaying={isPlaying}
          onPlayStateChange={setIsPlaying}
          segments={pctSegments}
        />
      )}

      {/* Enhanced info panel */}
      {mapLoaded && (
        <div className="absolute bottom-6 right-6 z-10">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white max-w-sm">
            <h3 className="font-semibold mb-2 text-[#ff6b9d]">{pctSegments[currentSegment]?.title}</h3>
            <p className="text-sm text-gray-300 mb-3">{pctSegments[currentSegment]?.description}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-[#ff6b9d] rounded-full"></div>
              <span>2,650 miles • Mexico to Canada</span>
            </div>
          </div>
        </div>
      )}

      {/* Trail stats panel */}
      {mapLoaded && (
        <div className="absolute top-6 right-6 z-10">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-0.5 bg-[#ff6b9d] rounded"></div>
              <span className="font-medium">Trail Stats</span>
            </div>
            <div className="space-y-1 text-xs text-gray-300">
              <div>Length: 2,650 miles</div>
              <div>States: CA, OR, WA</div>
              <div>Elevation: 13,153 ft max</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
