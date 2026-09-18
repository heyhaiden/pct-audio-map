import assert from "node:assert/strict"
import test from "node:test"
import { parseMarkerCsv } from "../scripts/lib/parse-csv.ts"
import { computeMarkerMiles } from "../scripts/lib/compute-marker-miles.ts"
import { formatAudioMarkersTs } from "../scripts/lib/write-markers.ts"

test("parseMarkerCsv reads required columns and quoted descriptions", () => {
  const csv = `id,name,lng,lat,chapter,filename,description,recording_date,featured,recording_time
marker-1,Campo,-116.47,32.60,southern-california,campo.mp3,"A trailhead, quiet.",April 15 2024,true,9:31 AM`

  const rows = parseMarkerCsv(csv)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, "marker-1")
  assert.equal(rows[0].description, "A trailhead, quiet.")
  assert.equal(rows[0].featured, true)
  assert.equal(rows[0].recordingTime, "9:31 AM")
})

test("parseMarkerCsv allows an empty filename for samples that are not ready", () => {
  const csv = `id,name,lng,lat,chapter,filename,description,recording_date,featured
marker-74,Cottonwood Pass,-118.126207,36.350265,sierra-nevada,,Not usable yet,June 8 2025,false`

  const rows = parseMarkerCsv(csv)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].filename, "")
  assert.equal(rows[0].name, "Cottonwood Pass")
})

test("computeMarkerMiles scales nearest trail vertex to 2650 miles", () => {
  const trail: [number, number][] = [
    [0, 0],
    [0, 1],
    [0, 2],
  ]

  const miles = computeMarkerMiles(trail, [{ id: "a", lng: 0, lat: 1 }])
  assert.equal(miles.a, 1325)
})

test("formatAudioMarkersTs writes probed duration and mp3 delivery URLs", () => {
  const ts = formatAudioMarkersTs([
    {
      id: "marker-111",
      name: "Hat Creek Rim",
      lng: -121.5,
      lat: 40.9,
      chapter: "northern-california",
      filename: "3-1.wav",
      description: "Storm",
      recordingDate: "July 25, 2025",
      recordingTime: "7:12 PM",
      featured: false,
      elevation: 3428,
      audioUrl: "/audio/3-1.mp3",
      durationSeconds: 119,
    },
  ])

  assert.match(ts, /audioUrl: "\/audio\/3-1.mp3"/)
  assert.match(ts, /durationSeconds: 119/)
})
