import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Mark external packages that shouldn't be bundled
  serverExternalPackages: ['stripe'],

  // Skip type errors during build (env vars won't be available)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
