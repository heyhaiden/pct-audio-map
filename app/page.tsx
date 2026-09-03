"use client"

import { useState, useRef, useMemo, useEffect, useCallback, useLayoutEffect } from "react"
import dynamic from "next/dynamic"
import { AudioMarkers } from "@/components/map/audio-markers"
import { ChapterTimeline } from "@/components/navigation/chapter-timeline"
import { AudioPlayer } from "@/components/audio/audio-player"
import { ChapterCard } from "@/components/chapters/chapter-card"
import { SplashScreen } from "@/components/splash/splash-screen"
import { MobileChapterOverlay } from "@/components/mobile/mobile-chapter-overlay"
import { AboutSocial } from "@/components/navigation/about-social"
import { ScrollHint } from "@/components/scroll/scroll-hint"
import { WipScreen } from "@/components/completion/wip-screen"
import { CompletionScreen } from "@/components/completion/completion-screen"
import { pctSegments } from "@/data/pct-segments"
import { audioMarkers } from "@/data/audio-markers"
import { CHAPTER_MILE_RANGES } from "@/data/chapter-ranges"
import {
  computePunchInPose,
  type CameraPathPoint,
  type FreeCameraPose,
} from "@/lib/railing-camera"
import {
  animateFreeCamera,
  applyFreeCameraPose,
  cancelFreeCameraAnimation,
  readFreeCameraPose,
} from "@/lib/node-camera"
import { useChapterIntro, introOpacity } from "@/hooks/use-chapter-intro"
import { useInvertedTouchScroll } from "@/hooks/use-inverted-touch-scroll"
import { useInvertedWheelScroll } from "@/hooks/use-inverted-wheel-scroll"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import { shouldRenderTrailScrollSpacer } from "@/lib/splash-scroll-lock"
import {
  resolveChapterTimelineCollapsed,
  shouldHideChapterTimeline,
  shouldShowChapterDrawerHandle,
} from "@/lib/chapter-timeline-visibility"
import { resolveChapterOverlayOpacity } from "@/lib/chapter-overlay-visibility"
import {
  clearMapSession,
  clearNavigatedFromMap,
  consumeResumeIntent,
  getMapSession,
  saveMapSession,
  type MapSessionState,
} from "@/lib/map-session"
import type { AudioMarker } from "@/types/map"

/**
 * Code-split the map so mapbox-gl (~250KB gz) isn't in the initial bundle. The
 * splash paints from the initial chunk, then this loads behind it and warms —
 * PCTMap is always mounted in the z-0 layer, so mounting isn't gated on splash
 * dismissal. ssr:false: the map is browser-only. node-camera and audio-markers
 * were decoupled from mapbox-gl so PCTMap is the sole path to the library.
 */
const PCTMap = dynamic(() => import("@/components/map/pct-map").then((m) => m.PCTMap), {
  ssr: false,
})

/** Early Oregon — produced audio content ends here for now (informational notice). */
const WIP_MILE = 1800

/** Near the Canadian border — reaching here shows the end-of-trail screen. */
const END_MILE = 2640

/** Camera return to the scroll rail on close — the audio fade is timed to match. */
const CLOSE_CAMERA_MS = 2200

/** Chapter labels hold long enough to read, then clear quickly as the trail resumes. */
const MOBILE_INTRO_HOLD = 14
const MOBILE_INTRO_FADE = 6
const DESKTOP_INTRO_HOLD = 60
const DESKTOP_INTRO_FADE = 20

const ACTIVE_CHAPTERS = new Set(["southern-california", "sierra-nevada", "northern-california"])
const navigableMarkers = audioMarkers.filter((marker) => ACTIVE_CHAPTERS.has(marker.chapter))

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
  const {
    transitionToTrack,
    isLoading: isAudioLoading,
    isPlaying: isAudioPlaying,
    error: audioError,
    isMuted,
    setMuted,
    fadeOutAndStop,
  } = useAudioPlayer()

  // 'boot' avoids SSR/client mismatch while we read resume intent from sessionStorage.
  const [navMode, setNavMode] = useState<"boot" | "fresh" | "resume">("boot")
  const [resumeSession, setResumeSession] = useState<MapSessionState | null>(null)
  const isResuming = navMode === "resume"

  const [map, setMap] = useState<any>(null)
  const [selectedAudioMarker, setSelectedAudioMarker] = useState<AudioMarker | null>(null)
  const [currentMiles, setCurrentMiles] = useState(0)
  const [totalMiles, setTotalMiles] = useState(2650)
  const [introComplete, setIntroComplete] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [revealMap, setRevealMap] = useState(false)
  const [journeyStarted, setJourneyStarted] = useState(false)
  const [trailheadReady, setTrailheadReady] = useState(false)
  const [trailheadProgress, setTrailheadProgress] = useState(0)
  const [showWip, setShowWip] = useState(false)
  const [wipDismissed, setWipDismissed] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [completionDismissed, setCompletionDismissed] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [isChapterTransitioning, setIsChapterTransitioning] = useState(false)
  // Chapter index whose held-breath overlay the user manually dismissed.
  const [overlayDismissedChapter, setOverlayDismissedChapter] = useState<number | null>(null)
  const [isNodeCameraBusy, setIsNodeCameraBusy] = useState(false)
  /** Matches Tailwind's `md` breakpoint, so JS agrees with which card is shown. */
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  /** Controls arrive via a ref, so state is needed to re-run the block effect. */
  const [scrollControlsReady, setScrollControlsReady] = useState(false)
  /** User peeked the chapter rail open while audio owns the view. */
  const [tabsUserExpanded, setTabsUserExpanded] = useState(false)
  /** User tucked the rail while exploring (arrow). */
  const [tabsUserCollapsed, setTabsUserCollapsed] = useState(false)
  const lastChapterRef = useRef(0)
  const scrollControlRef = useRef<ScrollControls | null>(null)
  const cameraAnimRef = useRef(0)
  const resumeRestoredRef = useRef(false)
  const navInitializedRef = useRef(false)
  /** True while the current position came from a chapter-tab jump, not scrolling. */
  const arrivedByJumpRef = useRef(false)
  const currentMilesRef = useRef(currentMiles)
  const wipDismissedRef = useRef(wipDismissed)
  currentMilesRef.current = currentMiles
  wipDismissedRef.current = wipDismissed

  useLayoutEffect(() => {
    if (navInitializedRef.current) return
    navInitializedRef.current = true

    // We're on the map now, however we got here — retire the from-map marker.
    clearNavigatedFromMap()

    const session = consumeResumeIntent() ? getMapSession() : null
    if (session) {
      setResumeSession(session)
      setNavMode("resume")
      setCurrentMiles(session.miles)
      setWipDismissed(session.wipDismissed)
      setShowSplash(false)
      setRevealMap(true)
      setJourneyStarted(true)
      setIntroComplete(true)
      setHasScrolled(true)
      return
    }
    setNavMode("fresh")
    setShowSplash(true)
    // Intentionally once on mount — resume intent is consumed and must not re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore trail scroll before the camera loop arms, otherwise it publishes mile 0.
  useLayoutEffect(() => {
    if (navMode !== "resume" || !resumeSession || resumeRestoredRef.current) return

    const max = document.documentElement.scrollHeight - window.innerHeight
    if (max < 500) return

    const top = resumeSession.scrollRatio * max
    window.scrollTo(0, top)
    document.documentElement.scrollTop = top
    if (window.scrollY > 10 || top < 10) {
      resumeRestoredRef.current = true
    }
  }, [navMode, resumeSession])

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

  const chapterIntro = useChapterIntro(currentMiles, introComplete && journeyStarted)

  const introChapterIndex = chapterIntro?.index ?? currentChapter
  const introChapter = pctSegments[introChapterIndex] ?? pctSegments[0]
  const desktopIntroOpacity = resolveChapterOverlayOpacity(
    chapterIntro ? introOpacity(chapterIntro.milesIn, DESKTOP_INTRO_HOLD, DESKTOP_INTRO_FADE) : 0,
    overlayDismissedChapter,
    introChapterIndex,
  )
  const mobileIntroOpacity = resolveChapterOverlayOpacity(
    chapterIntro ? introOpacity(chapterIntro.milesIn, MOBILE_INTRO_HOLD, MOBILE_INTRO_FADE) : 0,
    overlayDismissedChapter,
    introChapterIndex,
  )
  const isMobileChapterOverlayVisible = mobileIntroOpacity > 0.01
  // Only the overlay actually rendered at this width counts. The two cards are
  // swapped by Tailwind (`hidden md:block` / `md:hidden`) but both opacities are
  // always computed, and the desktop card holds far longer (60mi vs 14mi). ORing
  // them locked scrolling on phones against a card that isn't on screen to tap.
  const isChapterOverlayVisible = isDesktopViewport
    ? desktopIntroOpacity > 0.01
    : isMobileChapterOverlayVisible
  /** Any overlay that must be clicked away rather than scrolled past. */
  const isOverlayBlockingScroll = isChapterOverlayVisible || showWip || showCompletion

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)")
    const sync = () => setIsDesktopViewport(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  // Single owner for the scroll-camera block, derived rather than toggled.
  // Several paths used to set it imperatively (overlays, marker punch-in, the
  // exit camera), and handleCloseAudio could return early on a superseded
  // animation token without ever clearing it — leaving the camera permanently
  // deaf to scrolling while the page itself still scrolled.
  useEffect(() => {
    if (!scrollControlsReady) return
    const shouldBlock =
      isOverlayBlockingScroll || Boolean(selectedAudioMarker) || isNodeCameraBusy
    scrollControlRef.current?.setBlocked(shouldBlock)
  }, [scrollControlsReady, isOverlayBlockingScroll, selectedAudioMarker, isNodeCameraBusy])

  // Reset the manual overlay dismissal when we move to a different chapter.
  useEffect(() => {
    setOverlayDismissedChapter(null)
  }, [introChapterIndex])

  // Timeline nodes: the five chapters. No trailing "End" tab.
  const timelineNodes = useMemo(
    () => pctSegments.map((c) => ({ id: c.id, title: c.title })),
    [],
  )
  const activeNodeIndex = currentChapter

  // Continuous progress along the rail (0 = first chapter, 1 = end of the last).
  // Advances smoothly within each chapter so the connector line reads as the
  // scroll-progress indicator.
  const timelineProgress = useMemo(() => {
    const lastNode = pctSegments.length
    if (lastNode <= 0) return 0
    const range = CHAPTER_MILE_RANGES[currentChapter]
    const within = range ? (currentMiles - range.start) / (range.end - range.start) : 0
    return Math.max(0, Math.min(1, (currentChapter + Math.max(0, Math.min(1, within))) / lastNode))
  }, [currentChapter, currentMiles])

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
    clearMapSession()

    // Don't call requestFullscreen here — on Android it collapses browser chrome
    // mid-splash and jumps the layout. Immersion comes from viewport-fit=cover +
    // theme-color; chrome hides naturally once the user starts scrolling.

    // Always restart at the beginning — under splash so camera reset is invisible
    setCurrentMiles(0)
    setHasScrolled(false)
    setShowWip(false)
    setWipDismissed(false)
    setShowCompletion(false)
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

  const handleMapError = useCallback(() => {
    // The map owns the visible error state; remove the opaque splash so it can be seen.
    setRevealMap(true)
    setShowSplash(false)
  }, [])

  const handleRestart = useCallback(() => {
    setShowWip(false)
    setWipDismissed(false)
    setShowCompletion(false)
    setCompletionDismissed(false)
    setCurrentMiles(0)
    setHasScrolled(false)
    // Instant so the long sweep back to the start can't flash the WIP notice.
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [])

  // Close the WIP notice and keep exploring the map from the current position.
  const handleDismissWip = useCallback(() => {
    setShowWip(false)
    setWipDismissed(true)
  }, [])

  // Clear the terminus and stay on the map. Reappears if you scroll back and return.
  const handleDismissCompletion = useCallback(() => {
    setShowCompletion(false)
    setCompletionDismissed(true)
  }, [])

  const markDirectNavigation = useCallback(() => {
    setHasScrolled(true)
  }, [])


  useEffect(() => {
    if (currentChapter !== lastChapterRef.current && journeyStarted) {
      lastChapterRef.current = currentChapter
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }, [currentChapter, journeyStarted])

  // WIP notice at early Oregon — shows once when you first reach the content
  // edge. It's dismissible (you can keep exploring the map past it); once
  // dismissed it won't reappear until you scroll back before the boundary.
  useEffect(() => {
    if (currentMiles < WIP_MILE && wipDismissed) {
      setWipDismissed(false)
    }
  }, [currentMiles, wipDismissed])

  useEffect(() => {
    if (
      currentMiles >= WIP_MILE &&
      currentMiles < END_MILE &&
      journeyStarted &&
      !showWip &&
      !wipDismissed &&
      !arrivedByJumpRef.current &&
      !selectedAudioMarker
    ) {
      setShowWip(true)
    }
  }, [currentMiles, journeyStarted, showWip, wipDismissed, selectedAudioMarker])

  // End-of-trail screen near the Canadian border. Resets if you scroll back.
  useEffect(() => {
    if (currentMiles >= END_MILE && journeyStarted && !selectedAudioMarker && !completionDismissed) {
      setShowCompletion(true)
      setShowWip(false)
    } else if (currentMiles < END_MILE) {
      if (showCompletion) setShowCompletion(false)
      if (completionDismissed) setCompletionDismissed(false)
    }
  }, [currentMiles, journeyStarted, selectedAudioMarker, showCompletion, completionDismissed])

  useEffect(() => {
    if (hasScrolled) return
    const handleScroll = () => {
      setHasScrolled(true)
    }
    window.addEventListener("scroll", handleScroll, { passive: true, once: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasScrolled])

  // A real scroll gesture ends "arrived by jump" — programmatic scrolls don't.
  useEffect(() => {
    const clearJump = () => {
      arrivedByJumpRef.current = false
    }
    const events = ["wheel", "touchmove", "keydown"] as const
    events.forEach((event) => window.addEventListener(event, clearJump, { passive: true }))
    return () => events.forEach((event) => window.removeEventListener(event, clearJump))
  }, [])

  // Any overlay holds the journey completely still — you clear it by clicking,
  // never by scrolling past it. Body overflow alone isn't enough on desktop
  // (html is the scroller and the wheel still drives the camera), so wheel,
  // touch and the scroll keys are blocked at the capture phase too. Content
  // inside the overlay card itself stays scrollable.
  useEffect(() => {
    if (!journeyStarted || !isOverlayBlockingScroll) return

    const html = document.documentElement
    const body = document.body
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"

    const isInsideOverlay = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("[data-overlay-scroll]")

    const blockScroll = (event: Event) => {
      if (isInsideOverlay(event.target)) return
      event.preventDefault()
      event.stopPropagation()
    }

    const SCROLL_KEYS = [
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      " ",
      "Spacebar",
    ]

    const blockScrollKeys = (event: KeyboardEvent) => {
      // Escape still reaches the overlay so it can dismiss.
      if (!SCROLL_KEYS.includes(event.key)) return
      if (isInsideOverlay(event.target)) return
      event.preventDefault()
      event.stopPropagation()
    }

    window.addEventListener("wheel", blockScroll, { passive: false, capture: true })
    window.addEventListener("touchmove", blockScroll, { passive: false, capture: true })
    window.addEventListener("keydown", blockScrollKeys, true)

    return () => {
      // Clear outright rather than restoring a snapshot. The intro lock also
      // sets body overflow, so a snapshot taken while that was active captured
      // "hidden" and put it back here after the intro had already released it —
      // which permanently stalls useInvertedTouchScroll, whose isLocked() check
      // reads exactly this property. Touches registered; nothing scrolled.
      html.style.removeProperty("overflow")
      body.style.removeProperty("overflow")
      // touch-action is the hook's other lock signal — clear any legacy value.
      body.style.removeProperty("touch-action")
      window.removeEventListener("wheel", blockScroll, true)
      window.removeEventListener("touchmove", blockScroll, true)
      window.removeEventListener("keydown", blockScrollKeys, true)
    }
  }, [isOverlayBlockingScroll, journeyStarted])

  // Touch: swipe-down advances the trail (matches trackpad "scroll down").
  // Wheel/trackpad keep native direction. Body overflow/touchAction locks still win.
  const journeyScrollEnabled =
    journeyStarted &&
    !showSplash &&
    introComplete &&
    !selectedAudioMarker &&
    !isNodeCameraBusy &&
    !isOverlayBlockingScroll

  useInvertedTouchScroll(journeyScrollEnabled)
  // Same gesture, same result on a trackpad as on a phone.
  useInvertedWheelScroll(journeyScrollEnabled)

  // Keep scroll locked through the overview→trailhead intro so the first explore
  // gesture isn't eaten while the camera is still flying. Also block pinch.
  useEffect(() => {
    if (!journeyStarted || introComplete || isResuming) return
    document.body.style.overflow = "hidden"

    const blockPinch = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault()
    }
    window.addEventListener("touchmove", blockPinch, { passive: false, capture: true })

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("touchmove", blockPinch, true)
    }
  }, [journeyStarted, introComplete, isResuming, showSplash])

  // Persist trail position while exploring so Back to Map can restore it.
  useEffect(() => {
    if (!journeyStarted || !introComplete || showSplash) return

    const persist = () => {
      if (isResuming && !resumeRestoredRef.current) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      saveMapSession({
        scrollRatio: max > 0 ? window.scrollY / max : 0,
        miles: currentMilesRef.current,
        wipDismissed: wipDismissedRef.current,
      })
    }

    let timer: number | null = null
    const schedulePersist = () => {
      if (timer !== null) return
      timer = window.setTimeout(() => {
        timer = null
        persist()
      }, 250)
    }

    persist()
    window.addEventListener("scroll", schedulePersist, { passive: true })
    window.addEventListener("pagehide", persist)
    return () => {
      if (timer !== null) window.clearTimeout(timer)
      window.removeEventListener("scroll", schedulePersist)
      window.removeEventListener("pagehide", persist)
    }
  }, [journeyStarted, introComplete, showSplash, isResuming])

  // After resume, snap scroll once the tall map spacer exists.
  useEffect(() => {
    if (!isResuming || !resumeSession || !introComplete || !map || resumeRestoredRef.current) return

    const restore = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max < 500) return false

      const fromRatio = resumeSession.scrollRatio * max
      const fromMiles =
        totalMiles > 0 ? (resumeSession.miles / totalMiles) * max : fromRatio
      // Prefer miles when the saved ratio looks empty but miles were recorded.
      const top =
        resumeSession.miles > 1 && resumeSession.scrollRatio < 0.001 ? fromMiles : fromRatio

      window.scrollTo(0, top)
      if (Math.abs(window.scrollY - top) > 20) {
        document.documentElement.scrollTop = top
        document.body.scrollTop = top
      }

      if (window.scrollY < 10 && top > 50) return false

      resumeRestoredRef.current = true
      scrollControlRef.current?.setBlocked(false)
      scrollControlRef.current?.resumeScrollAnimation()
      return true
    }

    if (restore()) return

    let frames = 0
    let raf = 0
    const tick = () => {
      frames += 1
      if (restore() || frames > 180) {
        resumeRestoredRef.current = true
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const delayed = window.setTimeout(() => {
      if (!resumeRestoredRef.current) restore()
    }, 400)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(delayed)
    }
  }, [isResuming, resumeSession, introComplete, map, totalMiles])

  // Fresh journeys: zero scroll when intro finishes in case anything leaked through.
  useEffect(() => {
    if (!introComplete || isResuming) return
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [introComplete, isResuming])

  const handleChapterClick = (chapterIndex: number) => {
    markDirectNavigation()
    // Flying over the content edge via a tab shouldn't trip the WIP notice.
    arrivedByJumpRef.current = true
    const chapterStartMile = CHAPTER_MILE_RANGES[chapterIndex]?.start || 0
    const targetMile = chapterStartMile + 1
    const progress = targetMile / totalMiles
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const targetScroll = progress * scrollHeight

    const currentScroll = window.scrollY
    const scrollDistance = Math.abs(targetScroll - currentScroll)
    const isLongDistance = scrollDistance > window.innerHeight * 2

    // Intro card visibility is now driven by scroll position, so jumping to the
    // chapter start makes it appear on its own — no timer to trigger.
    setCurrentMiles(targetMile)
    setIsChapterTransitioning(true)

    setTimeout(() => {
      window.scrollTo({
        top: targetScroll,
        behavior: isLongDistance ? "instant" : "smooth",
      })
    }, 150)

    setTimeout(() => {
      setIsChapterTransitioning(false)
    }, isLongDistance ? 600 : 1500)
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

  const activateNode = useCallback(
    (marker: AudioMarker, durationMs: number) => {
      if (!ACTIVE_CHAPTERS.has(marker.chapter)) return

      markDirectNavigation()
      // Match the crossfade to the camera move so audio and view land together.
      void transitionToTrack(
        {
          id: marker.id,
          url: marker.audioUrl,
          volume: 0.7,
          loop: true,
        },
        durationMs,
      )

      if (map) {
        cancelFreeCameraAnimation()
        scrollControlRef.current?.pauseScrollAnimation()
        scrollControlRef.current?.setPendingSyncCoordinates(marker.coordinates)
        void flyToMarkerPunchIn(marker, durationMs)
      }

      setSelectedAudioMarker(marker)
    },
    [flyToMarkerPunchIn, map, markDirectNavigation, transitionToTrack],
  )

  const handleCloseAudio = async () => {
    const marker = selectedAudioMarker
    if (!marker) return

    // Ease the audio out over the same span the camera takes to return.
    fadeOutAndStop(CLOSE_CAMERA_MS)

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

    const railingPose = controls?.getRailingPoseAtCoordinates(currentCoords)
    const from = readFreeCameraPose(map)

    if (railingPose && from) {
      const token = ++cameraAnimRef.current
      await animateFreeCamera(map, from, railingPose, CLOSE_CAMERA_MS)
      if (token !== cameraAnimRef.current) {
        setIsNodeCameraBusy(false)
        return
      }
    }

    controls?.resumeScrollAnimation()
    setIsNodeCameraBusy(false)
  }

  const handleAudioMarkerClick = (marker: AudioMarker) => {
    activateNode(marker, 2400)
  }

  const currentMarkerIndex = selectedAudioMarker
    ? navigableMarkers.findIndex((marker) => marker.id === selectedAudioMarker.id)
    : -1
  const hasPreviousMarker = currentMarkerIndex > 0
  const hasNextMarker = currentMarkerIndex >= 0 && currentMarkerIndex < navigableMarkers.length - 1

  const handlePreviousMarker = () => {
    if (!hasPreviousMarker) return
    activateNode(navigableMarkers[currentMarkerIndex - 1], 2800)
  }

  const handleNextMarker = () => {
    if (!hasNextMarker) return
    activateNode(navigableMarkers[currentMarkerIndex + 1], 2800)
  }

  const autoHideChapterTimeline = shouldHideChapterTimeline(
    Boolean(selectedAudioMarker),
    isNodeCameraBusy,
  )

  // Opening an audio node collapses the drawer; closing it clears peek/tuck overrides.
  useEffect(() => {
    if (autoHideChapterTimeline) {
      setTabsUserExpanded(false)
      setTabsUserCollapsed(false)
    } else {
      setTabsUserExpanded(false)
    }
  }, [autoHideChapterTimeline])

  const hideChapterTimeline = resolveChapterTimelineCollapsed(
    autoHideChapterTimeline,
    tabsUserExpanded,
    tabsUserCollapsed,
  )

  const handleToggleChapterDrawer = useCallback(() => {
    if (hideChapterTimeline) {
      // Peek open (works during audio) or undo a manual tuck.
      if (autoHideChapterTimeline) setTabsUserExpanded(true)
      else setTabsUserCollapsed(false)
      return
    }
    // Close: clear peek, or tuck while exploring.
    if (autoHideChapterTimeline) setTabsUserExpanded(false)
    else setTabsUserCollapsed(true)
  }, [autoHideChapterTimeline, hideChapterTimeline])

  useEffect(() => {
    if (selectedAudioMarker || isNodeCameraBusy) {
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

  if (navMode === "boot") {
    return <main className="relative min-h-screen bg-[#151310]" />
  }

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

      <WipScreen isVisible={showWip} onRestart={handleRestart} onDismiss={handleDismissWip} />

      <CompletionScreen
        isVisible={showCompletion}
        totalMiles={totalMiles}
        onRestart={handleRestart}
        onDismiss={handleDismissCompletion}
      />

      <div
        className={`fixed inset-0 z-20 bg-black/40 pointer-events-none transition-opacity duration-500 ${
          isChapterTransitioning ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Vignette focuses the view on the marker while a recording plays. */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-[25] transition-opacity duration-1000 ease-out ${
          selectedAudioMarker ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(8, 7, 5, 0.42) 72%, rgba(8, 7, 5, 0.72) 100%)",
        }}
      />

      <div className="fixed inset-0 z-0 pointer-events-auto">
        <PCTMap
          onMapLoad={setMap}
          onMilesUpdate={handleMilesUpdate}
          onScrollControlReady={(controls) => {
            scrollControlRef.current = controls
            setScrollControlsReady(true)
          }}
          onIntroComplete={handleIntroComplete}
          onOverviewReady={handleOverviewReady}
          onTrailheadReady={handleTrailheadReady}
          onTrailheadProgress={handleTrailheadProgress}
          onMapError={handleMapError}
          startIntro={journeyStarted && !isResuming}
          skipIntro={isResuming}
          hideLoading={showSplash}
          currentMiles={currentMiles}
        />
        {map && (
          <AudioMarkers
            map={map}
            currentChapter={selectedAudioMarker?.chapter ?? currentChapterId}
            onMarkerClick={handleAudioMarkerClick}
          />
        )}
      </div>

      {shouldRenderTrailScrollSpacer(showSplash) ? (
        <div className="relative z-10 pointer-events-none" style={{ height: `${pctSegments.length * 2400}vh` }} />
      ) : null}

      <div className={`transition-opacity duration-700 ease-out delay-200 ${introComplete && journeyStarted ? "opacity-100" : "opacity-0"}`}>
        <ChapterTimeline
          nodes={timelineNodes}
          activeIndex={activeNodeIndex}
          progress={timelineProgress}
          hidden={hideChapterTimeline}
          showDrawerHandle={shouldShowChapterDrawerHandle(Boolean(selectedAudioMarker))}
          onToggleDrawer={handleToggleChapterDrawer}
          onNodeClick={handleChapterClick}
        />
      </div>

      {introComplete && journeyStarted && (
        <MobileChapterOverlay
          chapter={introChapter}
          chapterIndex={introChapterIndex}
          opacity={mobileIntroOpacity}
          onDismiss={() => setOverlayDismissedChapter(introChapterIndex)}
        />
      )}

      <div className={`transition-opacity duration-300 ease-out ${introComplete && journeyStarted ? "opacity-100" : "opacity-0"}`}>
        <ChapterCard
          chapter={introChapter}
          chapterIndex={introChapterIndex}
          opacity={desktopIntroOpacity}
          onDismiss={() => setOverlayDismissedChapter(introChapterIndex)}
        />
      </div>

      <div className={`transition-opacity duration-1000 ease-out delay-500 ${introComplete && journeyStarted ? "opacity-100" : "opacity-0"}`}>
        <AboutSocial soundEnabled={!isMuted} onSoundToggle={() => setMuted(!isMuted)} />
      </div>

      {/* Always mounted — the card owns its own enter/exit transition. */}
      <AudioPlayer
        marker={selectedAudioMarker}
        onClose={handleCloseAudio}
        isLoading={isAudioLoading}
        isPlaying={isAudioPlaying}
        error={audioError}
        hasPrevious={hasPreviousMarker}
        hasNext={hasNextMarker}
        onPrevious={handlePreviousMarker}
        onNext={handleNextMarker}
      />

      <ScrollHint
        enabled={
          introComplete &&
          journeyStarted &&
          !showSplash &&
          !selectedAudioMarker &&
          !isNodeCameraBusy &&
          !isChapterOverlayVisible &&
          !showWip &&
          !showCompletion
        }
      />
    </main>
  )
}
