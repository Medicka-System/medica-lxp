import type { MetadataRoute } from 'next';

// Manifest de la PWA (§5A · mobile-first). Íconos de marca reales (símbolo de
// Médica Capacitación): PNG maskables 192/512 para instalar en pantalla de inicio
// + un 96 `any`. El favicon del navegador lo resuelven los archivos de convención
// App Router (app/favicon.ico · app/icon.svg · app/apple-icon.png).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Campus Virtual · Médica Capacitación',
    short_name: 'Campus LXP',
    description: 'Hogar de aprendizaje para médicos de ultrasonido diagnóstico y POCUS.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f9fa',
    theme_color: '#0f2d52',
    lang: 'es',
    icons: [
      { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/favicon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
    ],
  };
}
