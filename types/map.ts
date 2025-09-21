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
  chapter: string
  featured: boolean
}

export interface CameraPosition {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
  duration: number
}
