import type React from "react"
import type { Metadata, Viewport } from "next"
import { Archivo, IBM_Plex_Mono, Spectral } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
})

const spectral = Spectral({
  subsets: ["latin"],
  variable: "--font-spectral",
  weight: ["300", "400", "500", "600"],
  display: "swap",
})

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Offbeat: Soundscapes of the PCT",
  description: "Interactive audio journey along the Pacific Crest Trail",
  generator: "v0.app",
}

// Immersive, app-like framing: cover the notch/safe areas, match the dark UI,
// and disable page zoom so the fixed map can't be pinch-scaled. Mobile browser
// chrome collapses on scroll; we intentionally skip the Fullscreen API (it
// jumps the splash layout when address/footer bars collapse).
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
      </head>
      <body className={`${archivo.variable} ${spectral.variable} ${plexMono.variable} font-sans`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
