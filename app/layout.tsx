import type React from "react"
import type { Metadata, Viewport } from "next"
import { Archivo, IBM_Plex_Mono, Mansalva, Spectral } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME, SITE_URL } from "@/lib/site"

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

const mansalva = Mansalva({
  subsets: ["latin"],
  variable: "--font-mansalva",
  weight: "400",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_SHORT_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_SHORT_NAME,
  generator: "v0.app",
  authors: [{ name: "Anna Wozniewicz" }, { name: "Haiden McGill", url: "https://heyhaiden.com/" }],
  creator: "Anna Wozniewicz & Haiden McGill",
  keywords: [
    "Pacific Crest Trail",
    "PCT",
    "thru-hike",
    "field recordings",
    "soundscapes",
    "nature sounds",
    "audio map",
    "3D trail map",
    "meditation",
    "backpacking",
  ],
  category: "travel",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: SITE_SHORT_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en-US",
  creator: [
    { "@type": "Person", name: "Anna Wozniewicz" },
    { "@type": "Person", name: "Haiden McGill" },
  ],
  about: { "@type": "TouristAttraction", name: "Pacific Crest Trail" },
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
      <body className={`${archivo.variable} ${spectral.variable} ${plexMono.variable} ${mansalva.variable} font-sans`}>
        <script
          type="application/ld+json"
          // Static object, no user input — safe to inline.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
