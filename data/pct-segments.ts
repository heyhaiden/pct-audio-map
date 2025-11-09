import type { PCTChapter } from "@/types/map"
import pctTrailData from "./pct-trail-geometry.json"

export const pctSegments: PCTChapter[] = [
  {
    id: "southern-california",
    title: "Southern California Desert",
    description:
      "From the Mexican border through the Sonoran Desert, featuring sparse vegetation and extreme heat. The trail winds through chaparral-covered mountains and desert valleys.",
    camera: {
      center: [-116.46, 32.6],
      zoom: 8,
      pitch: 60,
      bearing: 45,
      duration: 3000,
    },
    terrain: {
      exaggeration: 1.2,
    },
    audioMarkers: ["campo-trailhead", "hauser-canyon", "morena-lake", "desert-wind", "coyote-calls", "desert-silence"],
  },
  {
    id: "sierra-nevada",
    title: "Sierra Nevada Range",
    description:
      "The crown jewel of the PCT, featuring dramatic granite peaks, alpine lakes, and the highest elevations on the trail. Home to Mount Whitney and countless wilderness areas.",
    camera: {
      center: [-118.29, 36.58],
      zoom: 9,
      pitch: 70,
      bearing: 30,
      duration: 4000,
    },
    terrain: {
      exaggeration: 2.0,
    },
    audioMarkers: ["alpine-wind", "mountain-streams", "granite-echoes"],
  },
  {
    id: "northern-california",
    title: "Northern California Volcanoes",
    description:
      "Volcanic landscapes featuring Mount Shasta and Lassen Peak, with diverse forests transitioning from Sierra granite to Cascade volcanoes.",
    camera: {
      center: [-121.5, 40.5],
      zoom: 8,
      pitch: 45,
      bearing: 15,
      duration: 3500,
    },
    terrain: {
      exaggeration: 1.6,
    },
    audioMarkers: ["volcanic-winds", "forest-streams", "bird-chorus"],
  },
  {
    id: "oregon-cascades",
    title: "Oregon Cascades",
    description:
      "Dense forests, volcanic peaks, and pristine lakes. The trail passes near Crater Lake and through old-growth forests with incredible biodiversity.",
    camera: {
      center: [-121.7, 44.2],
      zoom: 7,
      pitch: 40,
      bearing: 0,
      duration: 3000,
    },
    terrain: {
      exaggeration: 1.4,
    },
    audioMarkers: ["forest-rain", "lake-lapping", "owl-calls"],
  },
  {
    id: "washington-cascades",
    title: "Washington Cascades",
    description:
      "The final stretch through temperate rainforests, glaciated peaks, and the dramatic North Cascades. Ending at the Canadian border in Manning Park.",
    camera: {
      center: [-121.15, 47.75],
      zoom: 8,
      pitch: 50,
      bearing: -15,
      duration: 3500,
    },
    terrain: {
      exaggeration: 1.8,
    },
    audioMarkers: ["glacier-melt", "rainforest-ambience", "mountain-silence"],
  },
]

// Optimized PCT trail geometry from GPX file
// Original: 327,976 points | Optimized: 7,109 points (97.83% reduction)
// Uses Douglas-Peucker algorithm with 0.001 degree tolerance for mobile performance
export const pctTrailGeometry = pctTrailData as {
  type: "Feature"
  properties: {
    name: string
    length: number
    states: string[]
    originalPoints: number
    simplifiedPoints: number
    tolerance: number
  }
  geometry: {
    type: "LineString"
    coordinates: number[][]
  }
}
