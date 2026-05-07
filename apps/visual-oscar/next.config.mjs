/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint y TypeScript en build: ya validados localmente, ignoramos en CI
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
}

export default nextConfig
