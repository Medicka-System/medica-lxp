import { NextResponse } from 'next/server';
import { createClienteSupabaseServidor } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Callback de OAuth (Microsoft/Azure · @supabase/ssr). El proveedor redirige aquí con
 * `?code=...`: canjeamos el código por sesión con `exchangeCodeForSession` (el cliente
 * servidor escribe las cookies de sesión), y mandamos a `next` (/admin por defecto),
 * donde el dispatcher de `/admin` valida el rol staff y despacha o cierra la sesión.
 *
 * Error (sin code o canje fallido) → /admin?error=auth (el login muestra el aviso).
 * Solo se permiten destinos internos (`next` debe empezar con "/") para evitar
 * open-redirect. La redirect URL de Supabase ya cubre prisma.…/** → /auth/callback.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';
  const destino = next.startsWith('/') ? next : '/admin';

  // Detrás de Traefik el `origin` del request es INTERNO (localhost:3000). Para armar
  // la URL pública del redirect usamos x-forwarded-host/proto (los pone el proxy);
  // si no están (dev directo), caemos al `origin` del request.
  const fwdHost = request.headers.get('x-forwarded-host');
  const fwdProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const base = fwdHost ? `${fwdProto}://${fwdHost}` : origin;

  if (code) {
    const supabase = await createClienteSupabaseServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${destino}`);
  }
  return NextResponse.redirect(`${base}/admin?error=auth`);
}
