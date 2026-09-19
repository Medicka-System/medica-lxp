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
  // ── Cornerstone3D WASM ↔ bundler (§3) ──────────────────────────────────────
  // Los codecs WASM de Cornerstone3D (@cornerstonejs/dicom-image-loader → codec-*)
  // referencian `fs`/`path` de Node en su bundle; en el navegador NO existen (el
  // decodificador real corre en Web Worker con WASM, no toca fs). Al cablearse el
  // visor DICOM en la consola docente (validacion-consola), esos codecs entraron por
  // primera vez al grafo del build → `next build` con Turbopack SE CUELGA. Decisión
  // (§3): el build de PRODUCCIÓN usa **webpack** (`next build --webpack`, ver
  // package.json), con estos builtins stubeados a vacío. `next dev` sigue en Turbopack.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
  // Mismo stub para Turbopack (solo `next dev`): mantiene el visor consistente en
  // desarrollo. NO resuelve el cuelgue del build de producción con Turbopack (por eso
  // el build usa webpack).
  turbopack: {
    resolveAlias: {
      fs: './stubs/empty.js',
      path: './stubs/empty.js',
      crypto: './stubs/empty.js',
    },
  },
};

export default nextConfig;
