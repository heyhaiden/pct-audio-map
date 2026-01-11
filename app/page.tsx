"use client"

import { useState } from "react"
import { PCTMap } from "@/components/map/pct-map"
import { AudioMarkers } from "@/components/map/audio-markers"
import { ScrollIndicator } from "@/components/scroll/scroll-indicator"
import { TrailStats } from "@/components/stats/trail-stats"
import { AudioPlayer } from "@/components/audio/audio-player"
import { ChapterCard } from "@/components/chapters/chapter-card"
import { pctSegments } from "@/data/pct-segments"
import { audioMarkers } from "@/data/audio-markers"
import type { AudioMarker } from "@/types/map"

export default function Home() {
  const [map, setMap] = useState<any>(null)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [selectedAudioMarker, setSelectedAudioMarker] = useState<AudioMarker | null>(null)
  const [currentMiles, setCurrentMiles] = useState(0)
  const [totalMiles, setTotalMiles] = useState(2650)

  const currentChapterId = pctSegments[currentChapter]?.id || "southern-california"

  const handleScroll = () => {
    if (typeof window === "undefined") return

    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrolled = window.scrollY
    const progress = Math.max(0, Math.min(1, scrolled / scrollHeight))

    // Map scroll progress to chapters
    const chapterIndex = Math.floor(progress * pctSegments.length)
    const clampedIndex = Math.min(chapterIndex, pctSegments.length - 1)

    if (clampedIndex !== currentChapter) {
      setCurrentChapter(clampedIndex)
    }
  }

  const handleChapterChange = (chapterIndex: number) => {
    setCurrentChapter(chapterIndex)
    // Close audio player when changing chapters
    setSelectedAudioMarker(null)
  }

  const handleChapterClick = (chapterIndex: number) => {
    const progress = chapterIndex / pctSegments.length
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const targetScroll = progress * scrollHeight

    window.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    })

    setCurrentChapter(chapterIndex)
  }

  const handleCloseAudio = () => {
    setSelectedAudioMarker(null)
  }

  const handleNextMarker = () => {
    if (!selectedAudioMarker) return

    const currentIndex = audioMarkers.findIndex((m) => m.id === selectedAudioMarker.id)
    if (currentIndex < audioMarkers.length - 1) {
      const nextMarker = audioMarkers[currentIndex + 1]
      setSelectedAudioMarker(nextMarker)

      if (map && window.mapboxgl) {
        map.flyTo({
          center: nextMarker.coordinates,
          zoom: 12,
          duration: 2500, // Increased from 1500ms
          curve: 1.2, // Smoother curve (lower = more direct, higher = more arc)
          easing: (t: number) => t * (2 - t), // Ease out quad for smooth deceleration
          essential: true,
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

      if (map && window.mapboxgl) {
        map.flyTo({
          center: previousMarker.coordinates,
          zoom: 12,
          duration: 2500, // Increased from 1500ms
          curve: 1.2, // Smoother curve
          easing: (t: number) => t * (2 - t), // Ease out quad for smooth deceleration
          essential: true,
        })
      }
    }
  }

  const currentMarkerIndex = selectedAudioMarker ? audioMarkers.findIndex((m) => m.id === selectedAudioMarker.id) : -1
  const hasNextMarker = currentMarkerIndex >= 0 && currentMarkerIndex < audioMarkers.length - 1
  const hasPreviousMarker = currentMarkerIndex > 0

  const scrollHeight = typeof window !== "undefined" ? document.documentElement.scrollHeight - window.innerHeight : 1
  const scrolled = typeof window !== "undefined" ? window.scrollY : 0
  const scrollProgress = Math.max(0, Math.min(1, scrolled / scrollHeight))

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

  return (
    <main className="relative" onScroll={handleScroll}>
      {/* Fixed map background */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <PCTMap
          onMapLoad={setMap}
          onMilesUpdate={(miles, total) => {
            setCurrentMiles(miles)
            setTotalMiles(total)
          }}
        />
        {map && <AudioMarkers map={map} currentChapter={currentChapterId} onMarkerClick={setSelectedAudioMarker} />}
      </div>

      <div className="relative z-10 pointer-events-none" style={{ height: `${pctSegments.length * 2400}vh` }} />

      <TrailStats currentMiles={currentMiles} totalMiles={totalMiles} currentSection={currentSection} />

      {/* Chapter card on the left side */}
      <ChapterCard
        chapter={pctSegments[currentChapter]}
        chapterIndex={currentChapter}
        totalChapters={pctSegments.length}
      />

      {/* Scroll progress indicator */}
      <ScrollIndicator
        progress={currentChapter / pctSegments.length}
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
