import type { PCTChapter } from "@/types/map"

export const pctSegments: PCTChapter[] = [
  {
    id: "southern-california",
    title: "Southern California",
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
    audioMarkers: ["marker-1", "marker-6", "marker-14", "marker-19", "marker-23", "marker-28", "marker-29"],
  },
  {
    id: "sierra-nevada",
    title: "Sierra Nevada",
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
    audioMarkers: ["alpine-wind", "mountain-streams", "granite-echoes"], // These IDs match audio-markers.ts
  },
  {
    id: "northern-california",
    title: "Northern California",
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
    audioMarkers: ["volcanic-winds", "forest-streams", "bird-chorus"], // These IDs match audio-markers.ts
  },
  {
    id: "oregon-cascades",
    title: "Oregon",
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
    audioMarkers: ["forest-rain", "lake-lapping", "owl-calls"], // These IDs match audio-markers.ts
  },
  {
    id: "washington-cascades",
    title: "Washington",
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
    audioMarkers: ["glacier-melt", "rainforest-ambience", "mountain-silence"], // These IDs match audio-markers.ts
  },
]

// Detailed PCT trail coordinates with elevation data
export const pctTrailGeometry = {
  type: "Feature",
  properties: {
    name: "Pacific Crest Trail",
    length: 2650,
    states: ["California", "Oregon", "Washington"],
  },
  geometry: {
    type: "LineString",
    coordinates: [
      // Southern California
      [-116.465, 32.599], // Campo (Southern Terminus)
      [-116.52, 32.68], // Hauser Creek
      [-116.85, 33.31], // Mount Laguna
      [-117.18, 34.18], // Big Bear Lake
      [-117.65, 34.38], // Cajon Pass
      [-118.15, 34.37], // Wrightwood
      [-118.31, 34.41], // Angeles Crest Highway

      // Tehachapi and Southern Sierra
      [-118.62, 35.13], // Tehachapi Pass
      [-118.85, 35.66], // Walker Pass
      [-118.29, 36.45], // Kennedy Meadows
      [-118.41, 36.58], // South Fork Kern River

      // High Sierra
      [-118.29, 36.58], // Forester Pass area
      [-118.68, 37.06], // Mount Whitney area
      [-119.01, 37.74], // Evolution Valley
      [-119.32, 37.94], // Muir Pass
      [-119.18, 38.03], // Tuolumne Meadows
      [-119.46, 38.29], // Sonora Pass
      [-119.89, 38.69], // Carson Pass
      [-120.03, 38.83], // Echo Lake

      // Northern California
      [-120.24, 39.32], // Sierra Buttes
      [-121.41, 40.43], // Castle Lake
      [-122.31, 41.31], // Mount Shasta area
      [-122.37, 41.81], // Oregon border

      // Oregon
      [-122.11, 42.04], // Siskiyou Mountains
      [-122.12, 43.07], // Crater Lake area
      [-121.78, 43.76], // Diamond Lake
      [-121.87, 44.09], // Willamette Pass
      [-121.77, 44.34], // McKenzie Pass
      [-121.78, 44.91], // Santiam Pass
      [-121.74, 45.33], // Mount Hood area
      [-121.71, 45.53], // Timberline Lodge
      [-121.86, 45.79], // Bridge of the Gods

      // Washington
      [-121.52, 46.25], // Mount Adams area
      [-121.31, 46.76], // White Pass
      [-121.52, 47.1], // Snoqualmie Pass
      [-121.15, 47.73], // Stevens Pass
      [-120.79, 48.51], // Rainy Pass
      [-120.78, 49.0], // Manning Park (Northern Terminus)
    ],
  },
}
