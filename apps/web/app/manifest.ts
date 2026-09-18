import type { MetadataRoute } from 'next';

// Manifest de la PWA (§5A · mobile-first). Los íconos definitivos llegan con la
// UI del shell (Sprint 4); en el Sprint 0 basta un ícono SVG de marca.
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
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
