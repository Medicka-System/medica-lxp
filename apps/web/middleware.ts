import type { NextRequest } from 'next/server';
import { refrescarSesion } from '@/lib/supabase/middleware';

/**
 * Middleware: refresca la sesión Supabase (cookies) en cada navegación. No-op en
 * local (perfil .env sin Supabase). Excluye estáticos, imágenes y assets de PWA.
 */
export async function middleware(request: NextRequest) {
  return refrescarSesion(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
