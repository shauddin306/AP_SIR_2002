import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // External packages that have native Node.js bindings (PDF/image processing)
  serverExternalPackages: ['pdf2pic', 'sharp', 'gm'],

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
}

export default nextConfig
