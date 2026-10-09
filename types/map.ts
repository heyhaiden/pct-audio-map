import type { TimeOfDay } from "@/lib/time-of-day"

export interface PCTChapter {
  id: string
  title: string
  description: string
  camera: {
    center: [number, number]
    zoom: number
    pitch: number
    bearing: number
    duration: number
  }
  terrain?: {
    exaggeration: number
  }
  audioMarkers: string[]
}

export interface AudioMarker {
  id: string
  name: string
  coordinates: [number, number]
  elevation: number
  audioUrl: string
  /** Whole-file duration from ingest (ffprobe), used by the library instead of fetching the blob. */
  durationSeconds?: number
  chapter: string
  featured: boolean
  description?: string
  recordingDate?: string
  timeOfDay?: TimeOfDay
  /**
   * Indigenous territories overlapping this coordinate, from Native Land.
   * A point can sit in more than one. Empty means the dataset has no polygon here.
   * These are not official or legal boundaries.
   */
  lands?: { name: string; slug: string }[]
}
