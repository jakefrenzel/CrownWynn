/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Disable problematic features that can cause issues in Docker
    esmExternals: false
  }
}

module.exports = nextConfig