/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://backend-jbif.onrender.com/api/:path*', // Backend server
      },
    ];
  },
};

module.exports = nextConfig;
