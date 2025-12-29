/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async rewrites() {
    // Use environment variable for backend URL, fallback to localhost for development
    // const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const backendUrl = "https://backend-jbif.onrender.com/";
    // Remove trailing /api if present to get base URL for rewrites
    const backendBase = backendUrl.replace(/\/api\/?$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`, // Backend server
      },
    ];
  },
};

module.exports = nextConfig;
