/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14.2.3 — desactivamos strict mode para librerías legacy del workspace.
  reactStrictMode: false,

  // ESLint y TypeScript en build: ignoramos errores no propios del Workspace.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Tree-shaking + externals server-side (sintaxis Next 14.2).
  experimental: {
    optimizePackageImports: ['lucide-react', '@xyflow/react'],
    serverComponentsExternalPackages: ['@react-pdf/renderer', 'rss-parser'],
  },

  // Imágenes externas.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },

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
