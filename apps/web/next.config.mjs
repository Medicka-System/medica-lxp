import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Env del monorepo. `web` NO carga por sí solo el `.env` de la RAÍZ: Next solo lee
 * `.env` del directorio de la app y turbo solo PASA `DATABASE_URL` si ya está en el
 * shell (`globalPassThroughEnv`). El `api` sí lo carga explícito (packages/db/env.ts),
 * por eso respondía aunque el shell no tuviera la var. Sin esto, arrancar `pnpm dev`
 * en un shell sin `DATABASE_URL` tumbaba TODO el Studio ("DATABASE_URL no definido
 * para web" en resolverStaffDev → 500 del layout). Cargamos el `.env` de la raíz aquí
 * sin pisar el entorno real (producción manda). Corre al iniciar el server (dev y prod).
 */
function cargarEnvRaiz() {
  try {
    const aqui = dirname(fileURLToPath(import.meta.url));
    const texto = readFileSync(resolve(aqui, '../../.env'), 'utf8');
    for (const linea of texto.split('\n')) {
      const l = linea.trim();
      if (!l || l.startsWith('#')) continue;
      const i = l.indexOf('=');
      if (i === -1) continue;
      const clave = l.slice(0, i).trim();
      if (clave in process.env) continue; // el entorno real (Docker/prod) manda
      let valor = l.slice(i + 1).trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      process.env[clave] = valor;
    }
  } catch {
    // Sin `.env` en la raíz (p. ej. prod con env inyectado): se ignora.
  }
}
cargarEnvRaiz();

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
