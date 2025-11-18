/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['localhost', 'example.com'], // Add your image domains here
  },
}

module.exports = nextConfig