/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Игнорировать ESLint ошибки во время сборки (только для деплоя)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Игнорировать ошибки TypeScript во время сборки (опционально)
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig

