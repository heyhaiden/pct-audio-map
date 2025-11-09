"use client"

import { useEffect, useRef, useState } from "react"
import { pctSegments } from "@/data/pct-segments"
import { getMapboxToken } from "@/lib/mapbox-config"

declare global {
  interface Window {
    mapboxgl: any
  }
}

interface PCTMapProps {
  onMapLoad?: (map: any) => void
  onMapReady?: (isReady: boolean) => void // Callback when map is fully loaded and ready
  onLoadingProgress?: (progress: number) => void // Callback for loading progress 0-100
  hidden?: boolean // Hide map visually while loading
}

export function PCTMap({ onMapLoad, onMapReady, onLoadingProgress, hidden = false }: PCTMapProps) {
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
      onLoadingProgress?.(10) // Scripts starting to load

      // Load CSS
      const cssLink = document.createElement("link")
      cssLink.rel = "stylesheet"
      cssLink.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css"
      document.head.appendChild(cssLink)
      onLoadingProgress?.(20) // CSS loaded

      // Load JS
      const script = document.createElement("script")
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"
      script.onload = () => {
        console.log("[v0] Mapbox scripts loaded successfully")
        setScriptsLoaded(true)
        onLoadingProgress?.(30) // Scripts loaded
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
      onLoadingProgress?.(30) // Scripts already loaded
    }
  }, [scriptsLoaded, onLoadingProgress])

  useEffect(() => {
    let idleTimeout: NodeJS.Timeout | null = null
    let tileProgressInterval: NodeJS.Timeout | null = null
    
    const initializeMap = async () => {
      console.log("[v0] Initializing map...", { scriptsLoaded, mapboxgl: !!window.mapboxgl })

      if (!scriptsLoaded || !window.mapboxgl) {
        console.log("[v0] Waiting for Mapbox scripts to load...")
        return
      }

      try {
        if (!mapContainer.current || map.current) return

        console.log("[v0] Getting Mapbox token...")
        onLoadingProgress?.(32) // Starting token fetch
        
        // Get Mapbox token from server action
        let token: string
        try {
          token = await getMapboxToken()
          console.log("[v0] Token received:", token ? "✓" : "✗")
          onLoadingProgress?.(33) // Token received
        } catch (error) {
          console.error("[v0] Token error:", error)
          setMapboxError("Mapbox access token is required. Please set MAPBOX_ACCESS_TOKEN in your Project Settings.")
          return
        }

        // Set token BEFORE loading style (required for Mapbox sources)
        window.mapboxgl.accessToken = token
        console.log("[v0] Creating map...")
        onLoadingProgress?.(34) // Token set, fetching style config

        // Get style URL from environment (preferred - fast CDN loading)
        let mapStyleConfig: string
        try {
          const { getMapboxStyleUrl } = await import("@/lib/mapbox-config")
          const styleUrl = await getMapboxStyleUrl()
          
          if (styleUrl) {
            // Use Mapbox style URL from .env (fastest - CDN cached)
            mapStyleConfig = styleUrl
            console.log("[v0] Using Mapbox style URL from .env:", styleUrl)
          } else {
            // Fallback to default Mapbox style if no URL configured
            mapStyleConfig = 'mapbox://styles/mapbox/outdoors-v12'
            console.log("[v0] No MAPBOX_STYLE_URL found, using default: outdoors-v12")
          }
        } catch (error) {
          console.error("[v0] Failed to get style URL:", error)
          // Fallback to default Mapbox style
          mapStyleConfig = 'mapbox://styles/mapbox/outdoors-v12'
          console.log("[v0] Using fallback Mapbox style: outdoors-v12")
        }

        // PCT bounds: roughly from Campo (32.599°N, -116.465°W) to Manning Park (49.0°N, -120.78°W)
        // Add padding to ensure trail and surrounding areas are included
        const pctBounds = [
          [-123.5, 31.5], // Southwest corner (with padding)
          [-115.0, 50.0]  // Northeast corner (with padding)
        ] as [[number, number], [number, number]]

        map.current = new window.mapboxgl.Map({
          container: mapContainer.current,
          style: mapStyleConfig,
          // Start with wide view showing entire trail (original initial position)
          center: [-119.25, 40.75], // Center of PCT region (between SW and NE bounds)
          zoom: 4.5, // Wide zoom to show entire trail from Mexico to Canada
          pitch: 0, // Top-down view for initial overview
          bearing: 0,
          antialias: true,
          interactive: false, // Disable interaction for scroll-driven experience
          // Limit map bounds to PCT region to prevent loading tiles outside the trail area
          maxBounds: pctBounds,
        })

        console.log("[v0] Map created, setting up loading progress tracking...")
        onLoadingProgress?.(35) // Map instance created

        // Track style loading
        let styleLoaded = false
        let sourcesLoading = new Set<string>()
        let sourcesLoaded = new Set<string>()
        let allSourcesDiscovered = false
        
        map.current.on("styledata", () => {
          if (!styleLoaded) {
            console.log("[v0] Map style loaded")
            styleLoaded = true
            onLoadingProgress?.(45) // Style loaded
            
            // Discover all sources from the style
            if (map.current) {
              const style = map.current.getStyle()
              if (style && style.sources) {
                const sourceIds = Object.keys(style.sources)
                console.log(`[v0] Discovered ${sourceIds.length} sources:`, sourceIds)
                allSourcesDiscovered = true
              }
            }
          }
        })

        // Track source loading progress
        map.current.on("sourcedata", (e: any) => {
          if (!e.isSourceLoaded) {
            if (!sourcesLoading.has(e.sourceId)) {
              sourcesLoading.add(e.sourceId)
              console.log(`[v0] Loading source: ${e.sourceId}`)
            }
          } else {
            if (!sourcesLoaded.has(e.sourceId)) {
              sourcesLoaded.add(e.sourceId)
              console.log(`[v0] Source loaded: ${e.sourceId} (${sourcesLoaded.size} total)`)
              
              // Calculate progress based on sources loaded
              // Estimate: style (35-45%), sources (45-55%), tiles (55-60%)
              if (map.current) {
                const style = map.current.getStyle()
                const totalSources = style?.sources ? Object.keys(style.sources).length : sourcesLoaded.size
                const loadedCount = sourcesLoaded.size
                const sourceProgress = 45 + Math.min(10, (loadedCount / Math.max(totalSources, 1)) * 10)
                onLoadingProgress?.(Math.min(sourceProgress, 54))
              }
            }
          }
        })

        // Track when map becomes idle (all tiles loaded)
        let hasReachedIdle = false
        let currentTileProgress = 55
        
        // Start animated progress during tile loading
        const startTileProgressAnimation = () => {
          if (tileProgressInterval) return // Already started
          
          tileProgressInterval = setInterval(() => {
            if (!hasReachedIdle && map.current?.loaded()) {
              // Slowly increment from 55% to 58% while tiles load
              currentTileProgress = Math.min(58, currentTileProgress + 0.15)
              onLoadingProgress?.(currentTileProgress)
            } else {
              if (tileProgressInterval) {
                clearInterval(tileProgressInterval)
                tileProgressInterval = null
              }
            }
          }, 100) // Update every 100ms for smooth animation
        }
        
        idleTimeout = setTimeout(() => {
          // Fallback: if idle event doesn't fire within 3 seconds of load, assume tiles are loaded
          if (!hasReachedIdle && map.current?.loaded()) {
            hasReachedIdle = true
            if (tileProgressInterval) {
              clearInterval(tileProgressInterval)
              tileProgressInterval = null
            }
            console.log("[v0] Map idle timeout - assuming tiles loaded")
            onLoadingProgress?.(58)
          }
        }, 3000) // Reduced from 5s to 3s

        map.current.on("idle", () => {
          if (!hasReachedIdle && map.current?.loaded()) {
            hasReachedIdle = true
            clearTimeout(idleTimeout)
            if (tileProgressInterval) {
              clearInterval(tileProgressInterval)
              tileProgressInterval = null
            }
            console.log("[v0] Map is idle - all tiles loaded")
            onLoadingProgress?.(58) // Tiles loaded
          }
        })

        map.current.on("load", async () => {
          console.log("[v0] Map style and initial tiles loaded")
          if (!map.current) return

          // Notify parent that base map is loaded (for map instance access)
          setMapLoaded(true)
          onMapLoad?.(map.current)
          onLoadingProgress?.(55) // Base map loaded (style + initial tiles)
          
          // Start animated progress during tile loading
          startTileProgressAnimation()
          
          // If map is already idle, update progress immediately
          if (map.current.loaded() && !map.current.isMoving()) {
            clearTimeout(idleTimeout)
            hasReachedIdle = true
            if (tileProgressInterval) {
              clearInterval(tileProgressInterval)
              tileProgressInterval = null
            }
            onLoadingProgress?.(58)
          }

          // Try to enable 3D terrain if available (terrain-rgb is already in style.json)
          // Handle errors gracefully if terrain is not available
          // Note: Some terrain tiles may return 404s - this is normal and won't break the map
          try {
            const terrainSource = map.current.getSource("mapbox://mapbox.terrain-rgb")
            if (terrainSource) {
              map.current.setTerrain({
                source: "mapbox://mapbox.terrain-rgb",
                exaggeration: 1.5,
              })
            }
          } catch (error) {
            console.warn("[v0] Terrain not available, continuing without 3D terrain:", error)
            // Continue without terrain - map will still work fine
          }

          // Add waypoints immediately
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
              anchor: 'bottom'
            })
              .setLngLat(waypoint.coordinates as [number, number])
              .setPopup(
                new window.mapboxgl.Popup({ offset: 25 }).setHTML(
                  `<div class="text-sm font-semibold">${waypoint.name}</div>`,
                ),
              )
              .addTo(map.current!)
          })

          // Load trail geometry - wait for it before marking map as ready
          try {
            console.log("[v0] Loading trail geometry...")
            onLoadingProgress?.(70) // Starting to load trail geometry
            
            const { pctTrailGeometry } = await import("@/data/pct-segments")
            onLoadingProgress?.(85) // Trail geometry loaded
            
            if (!map.current) return
            
            map.current.addSource("pct-trail", {
              type: "geojson",
              data: pctTrailGeometry,
            })
            
            // Add trail layers after source is loaded
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
            
            console.log("[v0] Trail geometry loaded")
            onLoadingProgress?.(100) // All layers added
            
            // Mark map as fully ready only after trail geometry is loaded
            console.log("[v0] Map setup complete - all assets loaded!")
            onMapReady?.(true)
          } catch (error) {
            console.error("[v0] Failed to load trail geometry:", error)
            onLoadingProgress?.(100) // Mark as complete even on error
            // Even if trail geometry fails, mark map as ready so user can proceed
            // Map will still work without trail line
            onMapReady?.(true)
          }
        })

        map.current.on("error", (e: any) => {
          // Ignore terrain tile 404 errors - they're harmless
          if (e.error && e.error.message && (
            e.error.message.includes("terrain") || 
            e.error.message.includes("404") ||
            e.error.message.includes("Not Found")
          )) {
            return // Silently ignore terrain-related errors
          }
          console.error("[v0] Mapbox error:", e)
          // Safely extract error message without circular reference issues
          const errorMessage = e.error?.message || e.message || "Unknown error"
          console.error("[v0] Error message:", errorMessage)
          if (e.error) {
            console.error("[v0] Error type:", e.type)
            console.error("[v0] Error target:", e.target ? "Map instance" : "none")
          }
          setMapboxError(`Failed to load map: ${errorMessage}. Please check your Mapbox token and internet connection.`)
        })
      } catch (error) {
        console.error("[v0] Failed to initialize Mapbox:", error)
        setMapboxError("Failed to load Mapbox. Please refresh the page and try again.")
      }
    }

    initializeMap()

    return () => {
      // Cleanup: clear any timeouts/intervals and remove map
      if (idleTimeout) {
        clearTimeout(idleTimeout)
      }
      if (tileProgressInterval) {
        clearInterval(tileProgressInterval)
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [scriptsLoaded, onMapLoad, onMapReady, onLoadingProgress])

  const flyToSegment = (segmentIndex: number) => {
    if (!map.current || !mapLoaded || isPlaying) return

    const segment = pctSegments[segmentIndex]
    if (!segment) return

    // Update terrain exaggeration for the segment
    if (segment.terrain) {
      try {
        if (map.current.getSource("mapbox://mapbox.terrain-rgb")) {
          map.current.setTerrain({
            source: "mapbox://mapbox.terrain-rgb",
            exaggeration: segment.terrain.exaggeration,
          })
        }
      } catch (error) {
        console.warn("[v0] Could not update terrain:", error)
      }
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
    <div className={`relative h-full w-full ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Map container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Loading overlay - only show if not hidden */}
      {!hidden && (!scriptsLoaded || !mapLoaded) && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-xl">{!scriptsLoaded ? "Loading Mapbox..." : "Loading PCT Audio Map..."}</div>
        </div>
      )}

      {/* Site title - hidden on mobile */}
      {mapLoaded && (
        <div className="absolute top-6 left-6 z-10 hidden md:block">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white max-w-xs">
            <h1 className="text-xl font-bold text-balance">Pacific Crest Trail Audio Journey</h1>
          </div>
        </div>
      )}

      {/* Trail stats panel - hidden on mobile */}
      {mapLoaded && (
        <div className="absolute top-6 right-6 z-10 hidden md:block">
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
