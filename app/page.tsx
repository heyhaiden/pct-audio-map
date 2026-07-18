"use client"

import { useState, useRef, useMemo, useEffect, useCallback, useLayoutEffect } from "react"
import { PCTMap } from "@/components/map/pct-map"
import { AudioMarkers } from "@/components/map/audio-markers"
import { ScrollIndicator } from "@/components/scroll/scroll-indicator"
import { TrailStats } from "@/components/stats/trail-stats"
import { AudioPlayer } from "@/components/audio/audio-player"
import { ChapterCard } from "@/components/chapters/chapter-card"
import { SplashScreen } from "@/components/splash/splash-screen"
import { MobileStatsBar } from "@/components/mobile/mobile-stats-bar"
import { MobileChapterToast } from "@/components/mobile/mobile-chapter-toast"
import { AboutSocial } from "@/components/navigation/about-social"
import { WipScreen } from "@/components/completion/wip-screen"
import { pctSegments } from "@/data/pct-segments"
import { audioMarkers } from "@/data/audio-markers"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"
import { computePunchInPose, type CameraPathPoint, type FreeCameraPose } from "@/lib/railing-camera"
import {
  animateFreeCamera,
  applyFreeCameraPose,
  cancelFreeCameraAnimation,
  readFreeCameraPose,
} from "@/lib/node-camera"
import { PerfDebugPanel } from "@/components/debug/perf-debug-panel"
import { useChapterIntro } from "@/hooks/use-chapter-intro"
import { isTrailPrepCached } from "@/lib/trail-prep-cache"
import type { AudioMarker } from "@/types/map"

/** Early Oregon — content ends here for now. */
const WIP_MILE = 1700

const ACTIVE_CHAPTERS = new Set(["southern-california", "sierra-nevada", "northern-california"])

const navigableMarkers = audioMarkers.filter((m) => ACTIVE_CHAPTERS.has(m.chapter))

type ScrollControls = {
  pauseScrollAnimation: () => void
  resumeScrollAnimation: () => void
  syncScrollToPosition: (coordinates: [number, number]) => void
  setPendingSyncCoordinates: (coordinates: [number, number]) => void
  setBlocked: (blocked: boolean) => void
  getCameraPath: () => CameraPathPoint[] | null
  getRailingPoseAtCoordinates: (coordinates: [number, number]) => FreeCameraPose | null
  getProgressFromCoordinates: (coordinates: [number, number]) => number
}

export default function Home() {
  const [map, setMap] = useState<any>(null)
  const [selectedAudioMarker, setSelectedAudioMarker] = useState<AudioMarker | null>(null)
  const [currentMiles, setCurrentMiles] = useState(0)
  const [totalMiles, setTotalMiles] = useState(2650)
  const [introComplete, setIntroComplete] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [revealMap, setRevealMap] = useState(false)
  const [journeyStarted, setJourneyStarted] = useState(false)
  const [trailheadReady, setTrailheadReady] = useState(false)
  const [trailheadProgress, setTrailheadProgress] = useState(0)
  const [showWip, setShowWip] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [forceChapterVisible, setForceChapterVisible] = useState(false)
  const [isChapterTransitioning, setIsChapterTransitioning] = useState(false)
  const [isNodeCameraBusy, setIsNodeCameraBusy] = useState(false)
  const lastChapterRef = useRef(0)
  const scrollControlRef = useRef<ScrollControls | null>(null)
  const cameraAnimRef = useRef(0)

  // Restore Enter-gate from session after navigating away and back home
  useLayoutEffect(() => {
    if (!isTrailPrepCached()) return
    setTrailheadProgress(1)
    setTrailheadReady(true)
  }, [])

  const currentChapter = useMemo(() => {
    for (let i = 0; i < CHAPTER_MILE_RANGES.length; i++) {
      const range = CHAPTER_MILE_RANGES[i]
      if (currentMiles >= range.start && currentMiles < range.end) {
        return i
      }
    }
    return CHAPTER_MILE_RANGES.length - 1
  }, [currentMiles])

  const currentChapterId = pctSegments[currentChapter]?.id || "southern-california"

  const { intro: chapterIntro, triggerIntro } = useChapterIntro(
    currentMiles,
    introComplete && journeyStarted,
  )

  const introChapterIndex = chapterIntro?.index ?? currentChapter
  const introChapter = pctSegments[introChapterIndex] ?? pctSegments[0]
  const introOpacity = chapterIntro?.opacity ?? 0

  const handleMilesUpdate = useCallback((miles: number, total: number) => {
    setCurrentMiles(miles)
    setTotalMiles(total)
  }, [])

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true)
  }, [])

  const handleTrailheadReady = useCallback(() => {
    setTrailheadProgress(1)
    setTrailheadReady(true)
  }, [])

  const handleTrailheadProgress = useCallback((progress: number) => {
    setTrailheadProgress((prev) => Math.max(prev, Math.min(1, progress)))
  }, [])

  const handleSplashEnter = useCallback(() => {
    // Always restart at the beginning — under splash so camera reset is invisible
    setCurrentMiles(0)
    setHasScrolled(false)
    setShowWip(false)
    setIntroComplete(false)
    setRevealMap(false)
    window.scrollTo({ top: 0, behavior: "instant" })

    // Starts intro: map cancels warm, jumps to overview, then calls onOverviewReady
    setJourneyStarted(true)
  }, [])

  const handleOverviewReady = useCallback(() => {
    // Overview camera + tiles settled — fade splash while it stays mounted
    setRevealMap(true)
    window.setTimeout(() => setShowSplash(false), 750)
  }, [])

  const handleRestart = useCallback(() => {
    setShowWip(false)
    setCurrentMiles(0)
    setHasScrolled(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (currentChapter !== lastChapterRef.current && journeyStarted) {
      lastChapterRef.current = currentChapter
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }, [currentChapter, journeyStarted])

  // WIP overlay at early Oregon — supersedes end-of-trail completion for now
  useEffect(() => {
    if (currentMiles >= WIP_MILE && journeyStarted && !showWip && !selectedAudioMarker) {
      setShowWip(true)
    }
  }, [currentMiles, journeyStarted, showWip, selectedAudioMarker])

  useEffect(() => {
    if (hasScrolled) return
    const handleScroll = () => {
      setHasScrolled(true)
    }
    window.addEventListener("scroll", handleScroll, { passive: true, once: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasScrolled])

  const handleChapterClick = (chapterIndex: number) => {
    const chapterStartMile = CHAPTER_MILE_RANGES[chapterIndex]?.start || 0
    // Don't jump past the WIP boundary into unfinished regions
    if (chapterStartMile >= WIP_MILE) {
      const progress = WIP_MILE / totalMiles
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: progress * scrollHeight, behavior: "smooth" })
      return
    }

    const targetMile = chapterStartMile + 1
    const progress = targetMile / totalMiles
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const targetScroll = progress * scrollHeight

    const currentScroll = window.scrollY
    const scrollDistance = Math.abs(targetScroll - currentScroll)
    const isLongDistance = scrollDistance > window.innerHeight * 2

    setCurrentMiles(targetMile)
    setIsChapterTransitioning(true)
    setForceChapterVisible(true)
    triggerIntro(chapterIndex)

    setTimeout(() => {
      window.scrollTo({
        top: targetScroll,
        behavior: isLongDistance ? "instant" : "smooth",
      })
    }, 150)

    setTimeout(() => {
      setIsChapterTransitioning(false)
    }, isLongDistance ? 600 : 1500)

    setTimeout(() => {
      setForceChapterVisible(false)
    }, isLongDistance ? 2500 : 3500)
  }

  const flyToMarkerPunchIn = useCallback(
    async (marker: AudioMarker, durationMs: number) => {
      if (!map) return
      const path = scrollControlRef.current?.getCameraPath()
      if (!path?.length) return

      const from = readFreeCameraPose(map)
      const to = computePunchInPose(path, marker.coordinates)
      if (!from) {
        applyFreeCameraPose(map, to)
        return
      }

      const token = ++cameraAnimRef.current
      await animateFreeCamera(map, from, to, durationMs)
      if (token !== cameraAnimRef.current) return
    },
    [map],
  )

  const handleCloseAudio = async () => {
    const marker = selectedAudioMarker
    if (!marker) return

    // Keep scroll locked while we ease back to the railing (player UI can dismiss)
    setIsNodeCameraBusy(true)
    setSelectedAudioMarker(null)

    if (!map) {
      setIsNodeCameraBusy(false)
      return
    }

    const controls = scrollControlRef.current
    const currentCoords = marker.coordinates

    controls?.setPendingSyncCoordinates(currentCoords)
    controls?.setBlocked(true)

    const railingPose = controls?.getRailingPoseAtCoordinates(currentCoords)
    const from = readFreeCameraPose(map)

    if (railingPose && from) {
      const token = ++cameraAnimRef.current
      await animateFreeCamera(map, from, railingPose, 2200)
      if (token !== cameraAnimRef.current) {
        setIsNodeCameraBusy(false)
        return
      }
    }

    controls?.setBlocked(false)
    controls?.resumeScrollAnimation()
    setIsNodeCameraBusy(false)
  }

  const handleNextMarker = () => {
    if (!selectedAudioMarker) return

    const currentIndex = navigableMarkers.findIndex((m) => m.id === selectedAudioMarker.id)
    if (currentIndex < navigableMarkers.length - 1) {
      const nextMarker = navigableMarkers[currentIndex + 1]
      setSelectedAudioMarker(nextMarker)

      if (map) {
        scrollControlRef.current?.pauseScrollAnimation()
        scrollControlRef.current?.setPendingSyncCoordinates(nextMarker.coordinates)
        void flyToMarkerPunchIn(nextMarker, 2800)
      }
    }
  }

  const handlePreviousMarker = () => {
    if (!selectedAudioMarker) return

    const currentIndex = navigableMarkers.findIndex((m) => m.id === selectedAudioMarker.id)
    if (currentIndex > 0) {
      const previousMarker = navigableMarkers[currentIndex - 1]
      setSelectedAudioMarker(previousMarker)

      if (map) {
        scrollControlRef.current?.pauseScrollAnimation()
        scrollControlRef.current?.setPendingSyncCoordinates(previousMarker.coordinates)
        void flyToMarkerPunchIn(previousMarker, 2800)
      }
    }
  }

  const handleAudioMarkerClick = (marker: AudioMarker) => {
    if (!ACTIVE_CHAPTERS.has(marker.chapter)) return

    if (map) {
      cancelFreeCameraAnimation()
      scrollControlRef.current?.pauseScrollAnimation()
      scrollControlRef.current?.setPendingSyncCoordinates(marker.coordinates)
      void flyToMarkerPunchIn(marker, 2400)
    }

    setSelectedAudioMarker(marker)
  }

  const currentMarkerIndex = selectedAudioMarker
    ? navigableMarkers.findIndex((m) => m.id === selectedAudioMarker.id)
    : -1
  const hasNextMarker = currentMarkerIndex >= 0 && currentMarkerIndex < navigableMarkers.length - 1
  const hasPreviousMarker = currentMarkerIndex > 0

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
    if (selectedAudioMarker || isNodeCameraBusy) {
      scrollControlRef.current?.setBlocked(true)

      const preventScroll = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
      }

      const preventKeyScroll = (e: KeyboardEvent) => {
        const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]
        if (scrollKeys.includes(e.key)) {
          e.preventDefault()
          e.stopPropagation()
        }
      }

      document.body.style.overflow = "hidden"
      document.body.style.touchAction = "none"

      window.addEventListener("wheel", preventScroll, { passive: false, capture: true })
      window.addEventListener("touchmove", preventScroll, { passive: false, capture: true })
      window.addEventListener("keydown", preventKeyScroll, { capture: true })

      return () => {
        // Unblocking is handled by close/exit camera handoff — not here —
        // so we don't release mid-animation when the player dismisses.
        document.body.style.overflow = ""
        document.body.style.touchAction = ""
        window.removeEventListener("wheel", preventScroll, { capture: true })
        window.removeEventListener("touchmove", preventScroll, { capture: true })
        window.removeEventListener("keydown", preventKeyScroll, { capture: true })
      }
    }
  }, [selectedAudioMarker, isNodeCameraBusy])

  return (
    <main className="relative">
      {showSplash && (
        <SplashScreen
          onEnter={handleSplashEnter}
          trailheadReady={trailheadReady}
          trailheadProgress={trailheadProgress}
          revealMap={revealMap}
        />
      )}

      <WipScreen isVisible={showWip} onRestart={handleRestart} />

      <div
        className={`fixed inset-0 z-20 bg-black/40 pointer-events-none transition-opacity duration-500 ${
          isChapterTransitioning ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="fixed inset-0 z-0 pointer-events-auto">
        <PCTMap
          onMapLoad={setMap}
          onMilesUpdate={handleMilesUpdate}
          onScrollControlReady={(controls) => {
            scrollControlRef.current = controls
          }}
          onIntroComplete={handleIntroComplete}
          onOverviewReady={handleOverviewReady}
          onTrailheadReady={handleTrailheadReady}
          onTrailheadProgress={handleTrailheadProgress}
          startIntro={journeyStarted}
          hideLoading={true}
          currentMiles={currentMiles}
        />
        {map && (
          <AudioMarkers map={map} currentChapter={currentChapterId} onMarkerClick={handleAudioMarkerClick} />
        )}
      </div>

      <PerfDebugPanel map={map} />

      <div className="relative z-10 pointer-events-none" style={{ height: `${pctSegments.length * 2400}vh` }} />

      <div className={`transition-opacity duration-1000 ease-out ${introComplete && journeyStarted ? "opacity-100" : "opacity-0"}`}>
        <TrailStats currentMiles={currentMiles} totalMiles={totalMiles} currentSection={currentSection} />
      </div>

      <div className={`transition-opacity duration-700 ease-out ${introComplete && journeyStarted ? "opacity-100" : "opacity-0"}`}>
        <MobileStatsBar currentMiles={currentMiles} totalMiles={totalMiles} currentSection={currentSection} />
      </div>

      {introComplete && journeyStarted && (
        <MobileChapterToast
          chapter={introChapter}
          chapterIndex={introChapterIndex}
          opacity={forceChapterVisible ? 1 : introOpacity}
        />
      )}

      <div className={`transition-opacity duration-1000 ease-out delay-200 ${introComplete && journeyStarted ? "opacity-100" : "opacity-0"}`}>
        <ChapterCard
          chapter={introChapter}
          chapterIndex={introChapterIndex}
          totalChapters={pctSegments.length}
          opacity={introOpacity}
          forceVisible={forceChapterVisible}
        />
      </div>

      <div className={`transition-opacity duration-1000 ease-out delay-300 ${introComplete && journeyStarted ? "opacity-100" : "opacity-0"}`}>
        <ScrollIndicator
          progress={currentMiles / totalMiles}
          currentChapter={currentChapter}
          totalChapters={pctSegments.length}
          onChapterClick={handleChapterClick}
        />
      </div>

      <div className={`transition-opacity duration-1000 ease-out delay-500 ${introComplete && journeyStarted ? "opacity-100" : "opacity-0"}`}>
        <AboutSocial />
      </div>

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

      <div
        className={`hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity duration-500 ease-out ${
          !introComplete || !journeyStarted || hasScrolled ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="bg-stone-900/80 backdrop-blur-md rounded-lg px-3 py-1.5 text-white text-xs border border-stone-800/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-5 border border-stone-500 rounded-sm relative">
              <div className="w-0.5 h-1.5 bg-stone-400 rounded-full absolute top-0.5 left-1/2 -translate-x-1/2 animate-bounce"></div>
            </div>
            <span className="text-stone-400">Scroll to explore</span>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity duration-500 ease-out ${
          !introComplete || !journeyStarted || hasScrolled ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="bg-stone-900/80 backdrop-blur-md rounded-lg px-3 py-1.5 text-white text-xs border border-stone-800/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-5 border border-stone-500 rounded-sm relative">
              <div className="w-0.5 h-1.5 bg-stone-400 rounded-full absolute top-0.5 left-1/2 -translate-x-1/2 animate-bounce"></div>
            </div>
            <span className="text-stone-400">Swipe to explore</span>
          </div>
        </div>
      </div>
    </main>
  )
}
