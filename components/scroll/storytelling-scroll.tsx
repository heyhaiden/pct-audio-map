"use client"

import { useRef } from "react"
import type mapboxgl from "mapbox-gl"
import { useScrollStory } from "@/hooks/use-scroll-story"
import { useCameraPath } from "@/hooks/use-camera-path"
import type { PCTChapter } from "@/types/map"

interface StorytellingScrollProps {
  map: mapboxgl.Map | null
  chapters: PCTChapter[]
  onChapterChange?: (chapterIndex: number) => void
}

export function StorytellingScroll({ map, chapters, onChapterChange }: StorytellingScrollProps) {
  const { animateToPosition, easingFunctions } = useCameraPath(map)
  const lastChapterRef = useRef(-1)

  const { currentChapter, setChapterRef } = useScrollStory(chapters, {
    threshold: 0.6,
    rootMargin: "-20% 0px -20% 0px",
    onChapterChange: (chapterIndex, progress) => {
      // Only animate if chapter actually changed
      if (chapterIndex !== lastChapterRef.current && map) {
        const chapter = chapters[chapterIndex]
        if (chapter) {
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

          onChapterChange?.(chapterIndex)
          lastChapterRef.current = chapterIndex
        }
      }
    },
  })

  return (
    <div className="absolute left-0 top-0 w-full pointer-events-none z-20">
      <div className="relative">
        {/* Spacer to allow initial scroll */}
        <div className="h-screen" />

        {/* Chapter sections */}
        {chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            ref={setChapterRef(index)}
            data-chapter-index={index}
            className="min-h-screen flex items-center"
          >
            <div className="w-full px-6 pointer-events-auto absolute bottom-12 left-0 max-w-md">
              <div
                className={`bg-black/80 backdrop-blur-sm rounded-xl p-8 text-white transition-all duration-700 ${
                  currentChapter === index ? "opacity-100 translate-y-0" : "opacity-60 translate-y-4"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-0.5 bg-[#ff6b9d] rounded"></div>
                  <span className="text-sm font-medium text-[#ff6b9d] uppercase tracking-wider">
                    Chapter {index + 1}
                  </span>
                </div>

                <h2 className="text-3xl font-bold mb-4 text-balance">{chapter.title}</h2>

                <p className="text-lg text-gray-300 leading-relaxed mb-6">{chapter.description}</p>

                {/* Audio markers preview */}
                {chapter.audioMarkers.length > 0 && (
                  <div className="border-t border-white/20 pt-6">
                    <h4 className="text-sm font-semibold text-[#ff6b9d] mb-3">Featured Sounds</h4>
                    <div className="flex flex-wrap gap-2">
                      {chapter.audioMarkers.map((marker) => (
                        <span
                          key={marker}
                          className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300 capitalize"
                        >
                          {marker.replace("-", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Final spacer */}
        <div className="h-screen" />
      </div>
    </div>
  )
}
