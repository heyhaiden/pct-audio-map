import { withPostHogConfig } from "@posthog/nextjs-config"

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.252", "192.168.1.*"],
  typescript: {
    ignoreBuildErrors: true,
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
