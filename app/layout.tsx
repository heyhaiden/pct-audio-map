import type React from "react"
import type { Metadata } from "next/dist/lib/metadata/types/metadata-interface"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const MAPBOX_GL_JS = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"
const MAPBOX_GL_CSS = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css"
const TURF_JS = "https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js"

export const metadata: Metadata = {
  title: "PCT Audio Journey",
  description: "Interactive audio journey along the Pacific Crest Trail",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://events.mapbox.com" />
        <link rel="preload" href={MAPBOX_GL_CSS} as="style" />
        <link rel="stylesheet" href={MAPBOX_GL_CSS} />
        <link rel="preload" href={MAPBOX_GL_JS} as="script" />
        <link rel="preload" href={TURF_JS} as="script" />
        <link rel="preload" href="/pct-trail.geojson" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="font-sans">
        <Script src={TURF_JS} strategy="beforeInteractive" />
        <Script src={MAPBOX_GL_JS} strategy="beforeInteractive" />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
