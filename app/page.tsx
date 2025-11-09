"use client"

import { useState, useRef, useEffect } from "react"
import { PCTMap } from "@/components/map/pct-map"
import { StorytellingScroll } from "@/components/scroll/storytelling-scroll"
import { ScrollIndicator } from "@/components/scroll/scroll-indicator"
import { AudioPlayer } from "@/components/audio/audio-player"
import { AudioMarkers } from "@/components/map/audio-markers"
import { IntroModal } from "@/components/intro-modal"
import { pctSegments } from "@/data/pct-segments"
import { useScrollStory } from "@/hooks/use-scroll-story"
import { useCameraPath } from "@/hooks/use-camera-path"
import type { AudioMarker } from "@/types/map"

export default function Home() {
  const [map, setMap] = useState<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [selectedAudioMarker, setSelectedAudioMarker] = useState<AudioMarker | null>(null)
  const [showIntro, setShowIntro] = useState(true)
  const [showChapterCards, setShowChapterCards] = useState(true)
  const chapterRefs = useRef<(HTMLElement | null)[]>([])

  // Disable scrolling when intro is showing and reset scroll position
  useEffect(() => {
    if (showIntro) {
      // Disable scrolling
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      // Reset scroll position to top
      window.scrollTo(0, 0)
    } else {
      // Re-enable scrolling
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
      // Ensure we're at the top when intro is dismissed
      window.scrollTo(0, 0)
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
  }, [showIntro])

  const { scrollProgress } = useScrollStory(pctSegments)
  const { animateToPosition, easingFunctions } = useCameraPath(map)

  const handleChapterChange = (chapterIndex: number) => {
    setCurrentChapter(chapterIndex)
    // Close audio player when changing chapters
    setSelectedAudioMarker(null)
  }

  const handleChapterClick = (chapterIndex: number) => {
    if (chapterIndex === currentChapter) return

    const chapter = pctSegments[chapterIndex]
    if (!chapter) return

    // Scroll to chapter element
    const chapterElement = chapterRefs.current[chapterIndex]
    if (chapterElement) {
      chapterElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }

    // Animate map to chapter position
    if (map) {
      // Update terrain exaggeration
      if (chapter.terrain) {
        map.setTerrain({
          source: "mapbox-terrain-rgb",
          exaggeration: chapter.terrain.exaggeration,
        })
      }

      // Animate camera to chapter position
      animateToPosition(chapter.camera, {
        easing: easingFunctions.easeInOutCubic,
      })
    }

    // Update current chapter
    handleChapterChange(chapterIndex)
  }

  const handleMarkerClick = (marker: AudioMarker) => {
    setSelectedAudioMarker(marker)
  }

  const handleCloseAudio = () => {
    setSelectedAudioMarker(null)
  }

  const handleBegin = () => {
    setShowIntro(false)
  }

  const setChapterRef = (index: number) => {
    return (element: HTMLElement | null) => {
      chapterRefs.current[index] = element
    }
  }

  return (
    <main className="relative">
      {/* Intro modal */}
      {showIntro && <IntroModal onBegin={handleBegin} mapReady={mapReady} loadingProgress={loadingProgress} />}

      {/* Fixed map background - preload in background, show when intro dismissed */}
      <div className={`fixed inset-0 z-0 transition-opacity duration-500 ${showIntro ? 'opacity-0' : 'opacity-100'}`}>
        <PCTMap 
          onMapLoad={setMap} 
          onMapReady={setMapReady}
          onLoadingProgress={setLoadingProgress}
          hidden={showIntro} 
        />
        {map && (
          <AudioMarkers
            map={map}
            currentChapter={pctSegments[currentChapter]?.id || ""}
            onMarkerClick={handleMarkerClick}
          />
        )}
      </div>

      {/* Scrollable storytelling content */}
      <div className={`relative z-10 transition-opacity duration-300 ${showChapterCards ? 'opacity-100' : 'opacity-0'}`}>
        <div className={showChapterCards ? '' : 'pointer-events-none'}>
          <StorytellingScroll 
            map={map} 
            chapters={pctSegments} 
            onChapterChange={handleChapterChange}
            setChapterRef={setChapterRef}
          />
        </div>
      </div>

      {/* Scroll progress indicator - hidden on mobile */}
      <ScrollIndicator 
        progress={scrollProgress} 
        currentChapter={currentChapter} 
        totalChapters={pctSegments.length}
        onChapterClick={handleChapterClick}
      />

      {/* Audio player */}
      <AudioPlayer marker={selectedAudioMarker} onClose={handleCloseAudio} />

      {/* Toggle chapter cards button */}
      {!showIntro && (
        <button
          onClick={() => setShowChapterCards(!showChapterCards)}
          className="fixed top-6 left-6 z-30 bg-black/80 backdrop-blur-sm hover:bg-black/90 rounded-lg px-4 py-2 text-white text-sm transition-all duration-200 flex items-center gap-2 shadow-lg"
          aria-label={showChapterCards ? "Hide chapter cards" : "Show chapter cards"}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {showChapterCards ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L7.05 7.05M6.29 6.29L3 3m3.29 3.29l3.29 3.29"
              />
            ) : (
              <>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </>
            )}
          </svg>
          <span className="hidden md:inline">
            {showChapterCards ? "Hide Cards" : "Show Cards"}
          </span>
        </button>
      )}

      {/* Instructions overlay - hidden on mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block">
        <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-6 border-2 border-white/60 rounded-sm relative">
              <div className="w-1 h-2 bg-white/60 rounded-full absolute top-1 left-1/2 -translate-x-1/2 animate-bounce"></div>
            </div>
            <span>Scroll to explore • Click audio markers to listen</span>
          </div>
        </div>
      </div>
    </main>
  )
}
