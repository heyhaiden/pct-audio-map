import { withPostHogConfig } from "@posthog/nextjs-config"

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.252", "192.168.1.*"],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Vercel restores .next/cache between builds, and the restored Turbopack
    // cache served a stale globals.css: two deployments of different commits
    // shipped the same old stylesheet while their JS was current. Build cold
    // until that is fixed upstream.
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    return [
      {
        source: "/audio/opus/:path*.opus",
        headers: [
          { key: "Content-Type", value: "audio/ogg" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_API_KEY ?? "",
  projectId: process.env.POSTHOG_PROJECT_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: Boolean(process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID),
    deleteAfterUpload: true,
  },
})
