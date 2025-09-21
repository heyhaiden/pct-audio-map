"use client"

import { useState } from "react"
import { PCTMap } from "@/components/map/pct-map"
import { StorytellingScroll } from "@/components/scroll/storytelling-scroll"
import { ScrollIndicator } from "@/components/scroll/scroll-indicator"
import { AudioPlayer } from "@/components/audio/audio-player"
import { AudioMarkers } from "@/components/map/audio-markers"
import { pctSegments } from "@/data/pct-segments"
import { useScrollStory } from "@/hooks/use-scroll-story"
import type { AudioMarker } from "@/types/map"

export default function Home() {
  const [map, setMap] = useState<any>(null)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [selectedAudioMarker, setSelectedAudioMarker] = useState<AudioMarker | null>(null)

  const { scrollProgress } = useScrollStory(pctSegments)

  const handleChapterChange = (chapterIndex: number) => {
    setCurrentChapter(chapterIndex)
    // Close audio player when changing chapters
    setSelectedAudioMarker(null)
  }

  const handleMarkerClick = (marker: AudioMarker) => {
    setSelectedAudioMarker(marker)
  }

  const handleCloseAudio = () => {
    setSelectedAudioMarker(null)
  }

  return (
    <main className="relative">
      {/* Fixed map background */}
      <div className="fixed inset-0 z-0">
        <PCTMap onMapLoad={setMap} />
        {map && (
          <AudioMarkers
            map={map}
            currentChapter={pctSegments[currentChapter]?.id || ""}
            onMarkerClick={handleMarkerClick}
          />
        )}
      </div>

      {/* Scrollable storytelling content */}
      <div className="relative z-10">
        <StorytellingScroll map={map} chapters={pctSegments} onChapterChange={handleChapterChange} />
      </div>

      {/* Scroll progress indicator */}
      <ScrollIndicator progress={scrollProgress} currentChapter={currentChapter} totalChapters={pctSegments.length} />

      {/* Audio player */}
      <AudioPlayer marker={selectedAudioMarker} onClose={handleCloseAudio} />

      {/* Instructions overlay */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
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
