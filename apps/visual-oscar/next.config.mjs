/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint y TypeScript en build: ya validados localmente, ignoramos en CI
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  // Tree-shaking agresivo de paquetes grandes en App Router
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Imágenes externas (avatars, RSS thumbnails)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },

  // Headers de cache para assets estáticos
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
