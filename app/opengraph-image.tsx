import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

// Root share card — inherited by every route that doesn't define its own.
export const alt = "Offbeat: Soundscapes of the PCT. An audio journey along the Pacific Crest Trail."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Real PCT line (public/pct-trail.geojson), downsampled to ~220 points and
// projected into a 157×500 box. Regenerate if the trail geometry changes.
const TRAIL_PATH =
  "M155.8 500.0 L154.0 498.0 L155.5 495.6 L156.9 493.2 L156.0 490.4 L154.5 488.2 L154.7 485.8 L155.3 483.8 L153.6 481.9 L152.0 479.4 L152.1 477.0 L152.6 475.0 L153.5 472.4 L153.4 469.6 L152.5 466.5 L151.0 463.6 L149.9 461.4 L150.4 459.0 L151.6 456.1 L150.2 453.1 L149.9 452.5 L149.3 449.9 L147.3 448.1 L144.8 447.9 L141.8 448.6 L139.8 446.9 L137.6 447.3 L135.1 448.2 L132.7 448.1 L130.3 447.5 L127.8 446.1 L125.4 446.2 L123.3 446.1 L120.9 446.4 L119.1 445.2 L116.8 445.5 L114.8 444.6 L113.5 442.5 L113.2 439.8 L111.9 437.9 L109.3 436.4 L106.9 435.4 L106.1 434.1 L110.0 430.8 L110.5 426.8 L112.6 424.5 L114.4 422.4 L115.1 419.7 L114.3 417.6 L113.6 414.4 L115.2 412.6 L117.5 411.3 L117.7 408.8 L119.4 407.3 L120.9 404.9 L120.0 403.0 L119.2 400.7 L117.1 398.4 L117.6 394.1 L117.5 390.4 L117.5 387.1 L116.8 384.1 L115.6 382.3 L112.6 380.8 L111.7 376.7 L111.2 373.0 L110.9 370.1 L110.4 366.8 L108.6 363.9 L106.0 362.2 L104.3 360.2 L101.0 358.8 L100.6 355.7 L99.6 352.2 L98.3 349.5 L95.8 347.0 L94.9 344.0 L92.1 342.4 L89.9 339.2 L88.4 336.0 L86.7 334.8 L84.2 333.6 L83.3 331.1 L84.2 328.0 L82.8 325.4 L82.0 322.3 L80.6 320.5 L78.8 318.4 L77.9 316.4 L75.5 315.0 L73.5 312.6 L72.7 309.3 L71.1 307.1 L69.6 303.7 L68.9 300.5 L68.0 297.4 L66.6 294.3 L64.7 291.5 L62.4 289.4 L60.3 286.9 L59.2 284.7 L56.9 282.8 L54.4 281.0 L51.5 280.7 L49.5 279.9 L48.8 277.5 L46.4 275.0 L44.2 273.3 L42.8 271.2 L41.5 268.6 L43.4 267.0 L43.2 264.4 L42.5 261.0 L43.2 257.6 L41.2 255.2 L42.2 252.0 L41.7 248.2 L39.1 245.9 L36.8 243.6 L34.3 242.6 L33.7 240.0 L31.9 238.4 L29.1 239.5 L26.1 240.3 L24.2 239.5 L21.8 238.9 L19.8 237.2 L16.6 237.2 L16.8 233.5 L14.5 233.8 L12.5 235.3 L10.2 237.6 L7.2 236.5 L6.6 233.4 L4.8 230.5 L2.7 228.0 L0.8 225.4 L0.0 221.8 L1.3 218.6 L1.4 215.6 L4.8 214.8 L7.4 213.5 L9.6 211.6 L12.4 210.9 L15.1 211.7 L17.5 210.8 L17.7 208.4 L20.5 206.5 L22.7 203.6 L22.2 200.9 L22.7 197.9 L23.6 194.3 L24.2 191.4 L24.4 188.0 L23.5 184.9 L25.2 182.8 L26.8 178.8 L28.3 175.9 L28.3 172.5 L26.1 169.5 L25.8 166.7 L28.3 164.7 L28.7 161.3 L29.6 157.5 L31.0 154.6 L32.5 152.6 L32.8 149.3 L33.3 146.6 L32.4 143.6 L32.0 140.7 L32.4 137.0 L32.8 133.6 L32.6 130.9 L32.9 127.8 L34.5 124.6 L35.3 120.8 L33.9 117.6 L35.6 113.6 L34.3 111.1 L33.2 108.6 L32.4 105.1 L32.4 101.6 L29.5 101.7 L27.5 99.2 L29.3 97.2 L32.8 96.6 L33.2 93.7 L33.5 90.2 L35.0 87.6 L37.8 85.8 L39.5 83.7 L40.1 79.9 L42.1 78.4 L41.0 75.7 L42.3 73.6 L42.4 70.4 L41.4 67.9 L39.7 64.8 L41.4 61.7 L42.9 58.6 L44.1 56.9 L43.4 54.2 L42.5 52.0 L41.4 48.8 L43.7 46.6 L45.9 45.8 L48.5 44.5 L48.3 41.1 L49.7 38.7 L49.4 35.9 L47.4 33.0 L48.6 30.3 L47.5 27.4 L48.5 25.4 L50.7 24.7 L53.1 22.8 L55.3 19.0 L56.8 16.3 L58.7 13.4 L58.2 10.6 L59.0 8.2 L57.4 4.8 L56.1 0.3 L56.1 0.0"

const BG = "#151310"
const CREAM = "#f6f1e4"
const MUTED = "#948a79"
const BODY = "#c7beac"
const ACCENT = "#ed5a43"

export default async function Image() {
  const fontDir = join(process.cwd(), "assets/fonts")
  const [mansalva, spectral, plexMono] = await Promise.all([
    readFile(join(fontDir, "Mansalva-Regular.ttf")),
    readFile(join(fontDir, "Spectral-Light.ttf")),
    readFile(join(fontDir, "IBMPlexMono-Regular.ttf")),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BG,
          position: "relative",
          padding: "0 96px",
        }}
      >
        {/* Soft warm glow behind the trail */}
        <div
          style={{
            position: "absolute",
            right: 40,
            top: 40,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(237,90,67,0.16) 0%, rgba(237,90,67,0) 65%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "Plex Mono",
              fontSize: 20,
              letterSpacing: 5,
              color: MUTED,
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            <div style={{ width: 48, height: 2, background: ACCENT, marginRight: 18, opacity: 0.7 }} />
            Pacific Crest Trail · 2,650 miles
          </div>
          <div style={{ fontFamily: "Mansalva", fontSize: 124, lineHeight: 1, color: CREAM, letterSpacing: 4 }}>
            OFFBEAT
          </div>
          <div
            style={{
              fontFamily: "Plex Mono",
              fontSize: 28,
              letterSpacing: 7,
              color: MUTED,
              textTransform: "uppercase",
              marginTop: 22,
            }}
          >
            Soundscapes of the PCT
          </div>
          <div
            style={{
              fontFamily: "Spectral",
              fontSize: 34,
              lineHeight: 1.4,
              color: BODY,
              marginTop: 40,
              maxWidth: 620,
            }}
          >
            An audio journey from Mexico to Canada. Stop at waypoints to listen.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 260, marginLeft: 40 }}>
          <svg width="157" height="500" viewBox="-6 -6 169 512" fill="none">
            <path d={TRAIL_PATH} stroke={ACCENT} strokeOpacity="0.25" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <path d={TRAIL_PATH} stroke={ACCENT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Mansalva", data: mansalva, style: "normal", weight: 400 },
        { name: "Spectral", data: spectral, style: "normal", weight: 300 },
        { name: "Plex Mono", data: plexMono, style: "normal", weight: 400 },
      ],
    },
  )
}
