/**
 * PWA con Serwist en "configurator mode" (§3) — compatible con Next 16 + Turbopack.
 * El service worker NO se inyecta aquí (eso usaba webpack y rompe con Turbopack):
 * se compila con `serwist build` tras `next build` (ver package.json + serwist.config.mjs).
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@campus/shared'],
  // postgres.js corre SOLO en server components (lectura con RLS); no se empaqueta.
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
