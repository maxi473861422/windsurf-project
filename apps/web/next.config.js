/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 's3.amazonaws.com', 'your-cdn-domain.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
