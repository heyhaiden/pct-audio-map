import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

// No lastModified: the build time is wrong on every deploy, and Google stops
// trusting lastmod once it proves inaccurate. changefreq/priority are ignored.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/about", "/library", "/resources"].map((path) => ({
    url: `${SITE_URL}${path}`,
  }))
}
