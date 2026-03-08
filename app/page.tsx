"use client"

import { useState, useRef, useMemo, useEffect, useCallback } from "react"
import { PCTMap } from "@/components/map/pct-map"
import { AudioMarkers } from "@/components/map/audio-markers"
import { ScrollIndicator } from "@/components/scroll/scroll-indicator"
import { TrailStats } from "@/components/stats/trail-stats"
import { AudioPlayer } from "@/components/audio/audio-player"
import { ChapterCard } from "@/components/chapters/chapter-card"
import { pctSegments } from "@/data/pct-segments"
import { audioMarkers } from "@/data/audio-markers"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"
import type { AudioMarker } from "@/types/map"

export default function Home() {
  const [map, setMap] = useState<any>(null)
  const [selectedAudioMarker, setSelectedAudioMarker] = useState<AudioMarker | null>(null)
  const [currentMiles, setCurrentMiles] = useState(0)
  const [totalMiles, setTotalMiles] = useState(2650)
  const previousCameraPositionRef = useRef<{ center: [number, number]; zoom: number } | null>(null)
  const scrollControlRef = useRef<{
    pauseScrollAnimation: () => void
    resumeScrollAnimation: () => void
    syncScrollToPosition: (coordinates: [number, number]) => void
    setPendingSyncCoordinates: (coordinates: [number, number]) => void
    setBlocked: (blocked: boolean) => void
  } | null>(null)

  const currentChapter = useMemo(() => {
    for (let i = 0; i < CHAPTER_MILE_RANGES.length; i++) {
      const range = CHAPTER_MILE_RANGES[i]
      if (currentMiles >= range.start && currentMiles < range.end) {
        return i
      }
    }
    // If at the very end, return the last chapter
    return CHAPTER_MILE_RANGES.length - 1
  }, [currentMiles])

  const currentChapterId = pctSegments[currentChapter]?.id || "southern-california"

  // Stable callback to prevent infinite re-renders
  const handleMilesUpdate = useCallback((miles: number, total: number) => {
    setCurrentMiles(miles)
    setTotalMiles(total)
  }, [])

  const handleChapterClick = (chapterIndex: number) => {
    const chapterStartMile = CHAPTER_MILE_RANGES[chapterIndex]?.start || 0
    const progress = chapterStartMile / totalMiles
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const targetScroll = progress * scrollHeight

    window.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    })
  }

  const handleCloseAudio = () => {
    if (map && selectedAudioMarker) {
      // Use the current marker's position (where we are NOW) instead of where we entered
      // This ensures we sync to the closest scroll position after navigating through markers
      const currentCoords = selectedAudioMarker.coordinates
      const targetZoom = previousCameraPositionRef.current?.zoom || 9.55

      map.flyTo({
        center: currentCoords,
        zoom: targetZoom,
        pitch: 0,
        bearing: -5,
        duration: 2500,
        curve: 1.42,
        easing: (t: number) => {
          // Smooth ease-in-out cubic
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        },
        essential: true,
        freezeElevation: true,
      })

      // Set pending sync coordinates to current marker so scroll resumes here
      scrollControlRef.current?.setPendingSyncCoordinates(currentCoords)
    }

    setSelectedAudioMarker(null)
    previousCameraPositionRef.current = null
  }

  const handleNextMarker = () => {
    if (!selectedAudioMarker) return

    const currentIndex = audioMarkers.findIndex((m) => m.id === selectedAudioMarker.id)
    if (currentIndex < audioMarkers.length - 1) {
      const nextMarker = audioMarkers[currentIndex + 1]
      setSelectedAudioMarker(nextMarker)

      if (map) {
        scrollControlRef.current?.pauseScrollAnimation()
        scrollControlRef.current?.setPendingSyncCoordinates(nextMarker.coordinates)

        map.flyTo({
          center: nextMarker.coordinates,
          zoom: 12,
          duration: 3000,
          curve: 1.42,
          easing: (t: number) => {
            // Smooth ease-in-out cubic
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
          },
          essential: true,
          freezeElevation: true,
        })
      }
    }
  }

  const handlePreviousMarker = () => {
    if (!selectedAudioMarker) return

    const currentIndex = audioMarkers.findIndex((m) => m.id === selectedAudioMarker.id)
    if (currentIndex > 0) {
      const previousMarker = audioMarkers[currentIndex - 1]
      setSelectedAudioMarker(previousMarker)

      if (map) {
        scrollControlRef.current?.pauseScrollAnimation()
        scrollControlRef.current?.setPendingSyncCoordinates(previousMarker.coordinates)

        map.flyTo({
          center: previousMarker.coordinates,
          zoom: 12,
          duration: 3000,
          curve: 1.42,
          easing: (t: number) => {
            // Smooth ease-in-out cubic
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
          },
          essential: true,
          freezeElevation: true,
        })
      }
    }
  }

  const handleAudioMarkerClick = (marker: AudioMarker) => {
    if (map) {
      const center = map.getCenter()
      const zoom = map.getZoom()
      previousCameraPositionRef.current = {
        center: [center.lng, center.lat] as [number, number],
        zoom: zoom,
      }

      scrollControlRef.current?.pauseScrollAnimation()
      scrollControlRef.current?.setPendingSyncCoordinates(marker.coordinates)

      map.flyTo({
        center: marker.coordinates,
        zoom: 12,
        duration: 3000,
        curve: 1.42,
        easing: (t: number) => {
          // Smooth ease-in-out cubic
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        },
        essential: true,
        freezeElevation: true,
      })
    }

    setSelectedAudioMarker(marker)
  }

  const currentMarkerIndex = selectedAudioMarker ? audioMarkers.findIndex((m) => m.id === selectedAudioMarker.id) : -1
  const hasNextMarker = currentMarkerIndex >= 0 && currentMarkerIndex < audioMarkers.length - 1
  const hasPreviousMarker = currentMarkerIndex > 0

  // Southern California: 0-700 mi, Sierra Nevada: 700-1100 mi, Northern CA: 1100-1700 mi
  // Oregon: 1700-2250 mi, Washington: 2250-2650 mi
  let currentSection = "Southern California"
  if (currentMiles >= 2250) {
    currentSection = "Washington Cascades"
  } else if (currentMiles >= 1700) {
    currentSection = "Oregon Cascades"
  } else if (currentMiles >= 1100) {
    currentSection = "Northern California"
  } else if (currentMiles >= 700) {
    currentSection = "Sierra Nevada"
  }

  useEffect(() => {
    if (selectedAudioMarker) {
      // Tell the scroll hook to block any resume attempts
      scrollControlRef.current?.setBlocked(true)

      // Prevent wheel and touch scroll
      const preventScroll = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
      }

      // Prevent keyboard scroll
      const preventKeyScroll = (e: KeyboardEvent) => {
        const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]
        if (scrollKeys.includes(e.key)) {
          e.preventDefault()
          e.stopPropagation()
        }
      }

      // Lock body scroll via CSS as backup
      document.body.style.overflow = "hidden"
      document.body.style.touchAction = "none"

      window.addEventListener("wheel", preventScroll, { passive: false, capture: true })
      window.addEventListener("touchmove", preventScroll, { passive: false, capture: true })
      window.addEventListener("keydown", preventKeyScroll, { capture: true })

      return () => {
        // Unblock scroll resume when audio card closes
        scrollControlRef.current?.setBlocked(false)

        document.body.style.overflow = ""
        document.body.style.touchAction = ""
        window.removeEventListener("wheel", preventScroll, { capture: true })
        window.removeEventListener("touchmove", preventScroll, { capture: true })
        window.removeEventListener("keydown", preventKeyScroll, { capture: true })
      }
    }
  }, [selectedAudioMarker])

  return (
    <main className="relative">
      {/* Fixed map background */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <PCTMap
          onMapLoad={setMap}
          onMilesUpdate={handleMilesUpdate}
          onScrollControlReady={(controls) => {
            scrollControlRef.current = controls
          }}
        />
        {map && <AudioMarkers map={map} currentChapter={currentChapterId} onMarkerClick={handleAudioMarkerClick} />}
      </div>

      <div className="relative z-10 pointer-events-none" style={{ height: `${pctSegments.length * 2400}vh` }} />

      <TrailStats currentMiles={currentMiles} totalMiles={totalMiles} currentSection={currentSection} />

      {/* Chapter card on the left side */}
      <ChapterCard
        chapter={pctSegments[currentChapter]}
        chapterIndex={currentChapter}
        totalChapters={pctSegments.length}
        currentMiles={currentMiles}
      />

      {/* Scroll progress indicator */}
      <ScrollIndicator
        progress={currentMiles / totalMiles}
        currentChapter={currentChapter}
        totalChapters={pctSegments.length}
        onChapterClick={handleChapterClick}
      />

      {/* Audio player */}
      {selectedAudioMarker && (
        <AudioPlayer
          marker={selectedAudioMarker}
          onClose={handleCloseAudio}
          onNextMarker={handleNextMarker}
          onPreviousMarker={handlePreviousMarker}
          hasNext={hasNextMarker}
          hasPrevious={hasPreviousMarker}
        />
      )}

      {/* Instructions overlay */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity duration-500 ${
          currentMiles > 10 ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="bg-black/60 backdrop-blur-xl rounded-lg px-4 py-2 text-white text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-6 border-2 border-white/60 rounded-sm relative">
              <div className="w-1 h-2 bg-white/60 rounded-full absolute top-1 left-1/2 -translate-x-1/2 animate-bounce"></div>
            </div>
            <span>Scroll to fly along the PCT</span>
          </div>
        </div>
      </div>
    </main>
  )
}
