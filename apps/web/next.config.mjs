/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "localhost:8000"] }
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.POLITEIA_API_URL
          ? `${process.env.POLITEIA_API_URL}/api/:path*`
          : "http://localhost:8000/api/:path*"
      }
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  transpilePackages: []
};

export default nextConfig;
