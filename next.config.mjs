/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phone / LAN loads of `next dev` (blocked by default in Next 16).
  allowedDevOrigins: ["192.168.1.252"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
