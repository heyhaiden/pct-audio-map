"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface ScrollStoryOptions {
  threshold?: number
  rootMargin?: string
  onChapterChange?: (chapterIndex: number, progress: number) => void
}

export function useScrollStory(chapters: any[], options: ScrollStoryOptions = {}) {
  const { threshold = 0.5, rootMargin = "0px", onChapterChange } = options
  const [currentChapter, setCurrentChapter] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const chapterRefs = useRef<(HTMLElement | null)[]>([])

  const setChapterRef = useCallback((index: number) => {
    return (element: HTMLElement | null) => {
      chapterRefs.current[index] = element
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    // Create intersection observer for chapter detection
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const chapterIndex = chapterRefs.current.findIndex((ref) => ref === entry.target)
          if (chapterIndex !== -1 && entry.isIntersecting) {
            setCurrentChapter(chapterIndex)
            onChapterChange?.(chapterIndex, entry.intersectionRatio)
          }
        })
      },
      {
        threshold,
        rootMargin,
      },
    )

    // Observe all chapter elements
    chapterRefs.current.forEach((ref) => {
      if (ref && observerRef.current) {
        observerRef.current.observe(ref)
      }
    })

    // Add scroll listener for progress tracking
    const handleScroll = () => {
      const scrollTop = window.pageYOffset
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = Math.min(scrollTop / docHeight, 1)
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      window.removeEventListener("scroll", handleScroll)
    }
  }, [threshold, rootMargin, onChapterChange])

  return {
    currentChapter,
    scrollProgress,
    setChapterRef,
  }
}
