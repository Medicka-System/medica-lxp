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

// ── Cabeceras de seguridad (§10/§11) ────────────────────────────────────────
// ENFORCE (seguras, no rompen render/build): HSTS, X-Frame-Options, X-Content-Type-
// Options, Referrer-Policy, Permissions-Policy. CSP va en **Report-Only** a propósito:
// así NO puede romper el build webpack, ni los codecs WASM de Cornerstone3D, ni el
// Realtime de Supabase — solo REPORTA violaciones en consola para afinar antes de enforce.
//
// X-Frame-Options = SAMEORIGIN (no DENY): los players H5P/SCORM y el visor PDF se montan
// en iframes del MISMO origen; DENY los rompería.
//
// connect-src incluye el origen de Supabase (REST/Auth https) y su Realtime (wss://),
// derivados de NEXT_PUBLIC_SUPABASE_URL. ⚠️ PLACEHOLDER para el integrador (Agente A): si
// Realtime usa otro host/sufijo, ajústalo aquí. Sin la env (local) cae a un marcador claro.
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supaWss = supaUrl ? supaUrl.replace(/^https?:/i, 'wss:') : 'wss://<SUPABASE_PROJECT_REF>.supabase.co';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const cspReportOnly = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' → instanciación WASM de los codecs DICOM (Cornerstone3D). Next
  // (App Router) inyecta scripts de arranque inline → 'unsafe-inline' (en ENFORCE se migra
  // a nonces). NO se incluye 'unsafe-eval'.
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'",
  "worker-src 'self' blob:", // Web Workers de Cornerstone (decodificación de imagen)
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:", // PNG rasterizado del reporte (blob/data) + URLs firmadas (https)
  "font-src 'self' data:",
  "media-src 'self' blob: https:", // video / cine-loop
  "frame-src 'self' blob:", // iframes H5P/SCORM/PDF (mismo origen) + blob
  // Supabase REST/Auth + Realtime (wss) + API de dominio. `https:` es amplio para ENFORCE
  // (se acotaría a Supabase + API + object-storage/R2); en Report-Only es seguro.
  `connect-src 'self' ${supaUrl} ${supaWss} ${apiUrl} https:`.replace(/\s+/g, ' ').trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
];

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
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // El generador de PDF manda al server action las imágenes DICOM rasterizadas (PNG) del
  // reporte; con ~18 imágenes el payload supera el límite POR DEFECTO de 1 MB de los Server
  // Actions → "Body exceeded 1 MB limit" y el PDF nunca se pide. Subimos el tope (§6.5).
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
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
