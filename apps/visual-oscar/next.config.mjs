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
    serverComponentsExternalPackages: [
      '@react-pdf/renderer',
      'rss-parser',
      // Deps opcionales — cargadas via dynamic import condicional. Si no están
      // instaladas, los wrappers en lib/* devuelven fallbacks deterministas.
      '@clerk/nextjs',
      '@sentry/nextjs',
      '@upstash/qstash',
      'drizzle-orm',
      'postgres',
    ],
  },

  // Imágenes externas.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },

  // Webpack: marca como externals los módulos opcionales en server bundles
  // para que el build no intente resolverlos cuando no están instalados.
  webpack: (config, { isServer }) => {
    const optionalDeps = [
      '@clerk/nextjs',
      '@clerk/nextjs/server',
      '@sentry/nextjs',
      '@upstash/qstash',
      'drizzle-orm',
      'drizzle-orm/postgres-js',
      'postgres',
    ];
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [config.externals];
      config.externals = [
        ...externals.filter(Boolean),
        function ({ request }, callback) {
          if (request && optionalDeps.includes(request)) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];
    }
    return config;
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
