import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const nextConfig: NextConfig = {
  // External packages that have native Node.js bindings (PDF/image processing)
  serverExternalPackages: ['pdf2pic', 'sharp', 'gm'],

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
}

export default withPWA(nextConfig)
