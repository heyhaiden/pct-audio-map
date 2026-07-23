import type React from "react"
import type { Metadata } from "next/dist/lib/metadata/types/metadata-interface"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

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
