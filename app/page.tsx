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
  shouldShowNorthernTerminus,
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
import { useViewportLayout } from "@/hooks/use-viewport-layout"
import { useInvertedTouchScroll } from "@/hooks/use-inverted-touch-scroll"
import { useInvertedWheelScroll } from "@/hooks/use-inverted-wheel-scroll"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import { shouldRenderTrailScrollSpacer } from "@/lib/splash-scroll-lock"
import {
  resolveChapterTimelineCollapsed,
  shouldHideChapterTimeline,
  shouldShowChapterDrawerHandle,
} from "@/lib/chapter-timeline-visibility"
import { areOpeningMapPinsLocked, resolveChapterOverlayOpacity } from "@/lib/chapter-overlay-visibility"
import { shouldRearmWipNotice } from "@/lib/wip-notice"
import {
  clearMapSession,
  clearNavigatedFromMap,
  consumeResumeIntent,
  getMapSession,
  resolveDismissedChapterOnResume,
  saveMapSession,
  type MapSessionState,
} from "@/lib/map-session"
import { adjacentPlayable, hasMarkerAudio } from "@/lib/marker-navigation"
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

/** Camera return to the scroll rail on close — the audio fade is timed to match. */
const CLOSE_CAMERA_MS = 2200

/** Arrow hops between nodes: camera can linger while audio crossfades sooner. */
const NODE_ARROW_CAMERA_MS = 2800
const NODE_ARROW_AUDIO_FADE_MS = 1100

/** Chapter labels hold long enough to read, then clear quickly as the trail resumes. */
const MOBILE_INTRO_HOLD = 14
const MOBILE_INTRO_FADE = 6
const DESKTOP_INTRO_HOLD = 60
const DESKTOP_INTRO_FADE = 20

const ACTIVE_CHAPTERS = new Set([
  "southern-california",
  "sierra-nevada",
  "northern-california",
  "oregon-cascades",
])

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

function chapterIndexForMiles(miles: number): number {
  const index = CHAPTER_MILE_RANGES.findIndex(
    ({ start, end }) => miles >= start && miles < end,
  )
  return index >= 0 ? index : CHAPTER_MILE_RANGES.length - 1
}

export default function Home() {
  const { useDesktopChapterOverlay } = useViewportLayout()

  const {
    transitionToTrack,
    isPlaying: isAudioPlaying,
    error: audioError,
    isMuted,
    setMuted,
    fadeOutAndStop,
    unlockAudio,
    resumeAudio,
    suspendAudio,
    prefetchLoop,
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
  const resumeChapterRef = useRef<number | null>(null)
  const visibleChapterOverlayRef = useRef<number | null>(null)
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
      const resumeChapter = chapterIndexForMiles(session.miles)
      resumeChapterRef.current = resumeChapter
      setResumeSession(session)
      setNavMode("resume")
      setCurrentMiles(session.miles)
      setWipDismissed(session.wipDismissed)
      setOverlayDismissedChapter(
        resolveDismissedChapterOnResume(session.chapterOverlay, resumeChapter),
      )
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
    return chapterIndexForMiles(currentMiles)
  }, [currentMiles])

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
  // Only the overlay actually rendered counts. Tailwind `md:` is width-only, so
  // landscape phones would show the desktop card and hold 60mi. Overlay choice
  // follows layout (rail vs landscape phone), not min-width 768.
  const isChapterOverlayVisible = useDesktopChapterOverlay
    ? desktopIntroOpacity > 0.01
    : isMobileChapterOverlayVisible
  visibleChapterOverlayRef.current = isChapterOverlayVisible ? introChapterIndex : null
  const mapPinsLocked = areOpeningMapPinsLocked({
    isResuming,
    introComplete,
    isSoCalOverlayVisible: introChapterIndex === 0 && isChapterOverlayVisible,
  })
  /** Any overlay that must be clicked away rather than scrolled past. */
  const isOverlayBlockingScroll = isChapterOverlayVisible || showWip || showCompletion

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
    if (navMode === "boot") return
    if (resumeChapterRef.current === introChapterIndex) return
    resumeChapterRef.current = null
    setOverlayDismissedChapter(null)
  }, [introChapterIndex, navMode])

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
    // The scroll hook publishes 0 before window scroll is restored. Keep the
    // saved mile so the map can jump there instead of easing from Mexico.
    if (isResuming && !resumeRestoredRef.current && miles < 1) return
    setCurrentMiles(miles)
    setTotalMiles(total)
  }, [isResuming])

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
    void unlockAudio()
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
  }, [unlockAudio])

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
  // edge. Dismissed until you travel a real stretch south of the boundary;
  // a one-mile jitter around 1800 used to rearm it and pop the overlay again.
  useEffect(() => {
    if (shouldRearmWipNotice(currentMiles, WIP_MILE) && wipDismissed) {
      setWipDismissed(false)
    }
  }, [currentMiles, wipDismissed])

  useEffect(() => {
    if (
      currentMiles >= WIP_MILE &&
      !shouldShowNorthernTerminus(currentMiles) &&
      journeyStarted &&
      !showWip &&
      !wipDismissed &&
      !arrivedByJumpRef.current &&
      !selectedAudioMarker
    ) {
      setShowWip(true)
    }
  }, [currentMiles, journeyStarted, showWip, wipDismissed, selectedAudioMarker])

  // End-of-trail screen only after the railing camera has tipped to top-down.
  useEffect(() => {
    if (
      shouldShowNorthernTerminus(currentMiles) &&
      journeyStarted &&
      !selectedAudioMarker &&
      !completionDismissed
    ) {
      setShowCompletion(true)
      setShowWip(false)
    } else if (!shouldShowNorthernTerminus(currentMiles)) {
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
        chapterOverlay: visibleChapterOverlayRef.current,
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
  // Do not wait for Mapbox — the camera loop must not arm at scrollY=0.
  // Do not copy the live GL camera here; that was the Mexico overview.
  useEffect(() => {
    if (!isResuming || !resumeSession || resumeRestoredRef.current) return

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
  }, [isResuming, resumeSession, totalMiles])

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
    (marker: AudioMarker, cameraDurationMs: number, audioFadeMs?: number) => {
      if (!ACTIVE_CHAPTERS.has(marker.chapter)) return

      markDirectNavigation()
      void unlockAudio()
      const fadeMs = audioFadeMs ?? cameraDurationMs
      // Match the crossfade to the camera move on first open; arrow hops can
      // crossfade audio faster than the camera finishes repositioning.
      if (hasMarkerAudio(marker)) {
        void transitionToTrack(
          {
            id: marker.id,
            url: marker.audioUrl,
            volume: 0.7,
          },
          fadeMs,
        )
      } else {
        fadeOutAndStop(fadeMs)
      }

      if (map) {
        cancelFreeCameraAnimation()
        scrollControlRef.current?.pauseScrollAnimation()
        scrollControlRef.current?.setPendingSyncCoordinates(marker.coordinates)
        void flyToMarkerPunchIn(marker, cameraDurationMs)
      }

      setSelectedAudioMarker(marker)
    },
    [fadeOutAndStop, flyToMarkerPunchIn, map, markDirectNavigation, transitionToTrack, unlockAudio],
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
    if (mapPinsLocked) return
    activateNode(marker, 2400)
  }

  const { previous: previousPlayable, next: nextPlayable } = selectedAudioMarker
    ? adjacentPlayable(audioMarkers, ACTIVE_CHAPTERS, selectedAudioMarker.id)
    : { previous: null, next: null }
  const hasPreviousMarker = Boolean(previousPlayable)
  const hasNextMarker = Boolean(nextPlayable)

  const handlePreviousMarker = () => {
    if (!previousPlayable) return
    activateNode(previousPlayable, NODE_ARROW_CAMERA_MS, NODE_ARROW_AUDIO_FADE_MS)
  }

  const handleNextMarker = () => {
    if (!nextPlayable) return
    activateNode(nextPlayable, NODE_ARROW_CAMERA_MS, NODE_ARROW_AUDIO_FADE_MS)
  }

  // Warm next/prev recordings only while a pin is open — not the full catalog.
  useEffect(() => {
    prefetchLoop(previousPlayable?.audioUrl, nextPlayable?.audioUrl)
  }, [nextPlayable, prefetchLoop, previousPlayable])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) void suspendAudio()
      else void resumeAudio()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [resumeAudio, suspendAudio])

  const openingChapterTabsLocked = introChapterIndex === 0 && isChapterOverlayVisible
  const autoHideChapterTimeline = shouldHideChapterTimeline(
    Boolean(selectedAudioMarker),
    isNodeCameraBusy,
    openingChapterTabsLocked,
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

      <div className={`fixed inset-0 z-0 ${mapPinsLocked ? "pointer-events-none" : "pointer-events-auto"}`}>
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
            onMarkerClick={handleAudioMarkerClick}
            activeMarkerId={selectedAudioMarker?.id}
            enabled={!mapPinsLocked}
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
          showDrawerHandle={shouldShowChapterDrawerHandle(
            Boolean(selectedAudioMarker),
            openingChapterTabsLocked,
          )}
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

      <div className={`transition-opacity duration-1000 ease-out delay-500 ${introComplete && journeyStarted ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <AboutSocial soundEnabled={!isMuted} onSoundToggle={() => setMuted(!isMuted)} />
      </div>

      {/* Always mounted — the card owns its own enter/exit transition. */}
      <AudioPlayer
        marker={selectedAudioMarker}
        onClose={handleCloseAudio}
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
