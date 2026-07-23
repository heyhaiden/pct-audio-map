import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PCT Audio Journey",
  description: "Interactive audio journey along the Pacific Crest Trail",
  generator: "v0.app",
}

// Immersive, app-like framing: cover the notch/safe areas, match the dark UI,
// and disable page zoom so the fixed map can't be pinch-scaled. Combined with
// the fullscreen request on "Begin Journey", this minimizes mobile browser
// chrome (address/footer bars) during the scroll experience.
export const viewport: Viewport = {
  themeColor: "#0c0a09",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Tiles + style still stream from Mapbox — keep the connection warm */}
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://events.mapbox.com" />
        <link rel="preload" href="/pct-trail.geojson" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
