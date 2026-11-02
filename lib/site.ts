/**
 * Shared SEO constants. SITE_URL resolves to the production domain on Vercel
 * (VERCEL_PROJECT_PRODUCTION_URL is set at build time) so canonical URLs and
 * share-card image URLs are absolute everywhere, including preview deploys.
 */
export const SITE_NAME = "Offbeat: Soundscapes of the PCT"
export const SITE_SHORT_NAME = "Offbeat"

export const SITE_DESCRIPTION =
  "An audio journey along the Pacific Crest Trail. Scroll a 3D map from Mexico to Canada and stop at waypoints to hear field recordings from a 2,650-mile thru-hike."

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "")

const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Offbeat: Soundscapes of the PCT. An audio journey along the Pacific Crest Trail.",
}

/**
 * Per-page metadata. A page that sets `openGraph`/`twitter` replaces the root
 * objects wholesale (and drops the inherited app/opengraph-image), so every
 * page goes through here to keep the share card and large Twitter card.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}) {
  const shareTitle = `${title} · ${SITE_SHORT_NAME}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website" as const,
      siteName: SITE_NAME,
      locale: "en_US",
      title: shareTitle,
      description,
      url: path,
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: shareTitle,
      description,
      images: [SHARE_IMAGE],
    },
  }
}
