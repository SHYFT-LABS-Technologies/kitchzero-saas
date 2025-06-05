/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove these dangerous settings:
  // eslint: { ignoreDuringBuilds: true },
  // typescript: { ignoreBuildErrors: true },
  
  // Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ],
      },
    ]
  },
  
  images: {
    unoptimized: true,
    domains: [], // Add allowed image domains
  },
  
  // Enable compression
  compress: true,
  
  // Optimize for production
  swcMinify: true,
}

export default nextConfig