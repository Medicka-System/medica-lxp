import { serwist } from '@serwist/next/config';

// Configurator mode: build externo del service worker (bundler-agnóstico, corre
// tras `next build`). Precachea las rutas prerenderizadas automáticamente.
export default serwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  precachePrerendered: true,
});
