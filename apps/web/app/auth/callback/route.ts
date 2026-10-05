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

  if (code) {
    const supabase = await createClienteSupabaseServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }
  return NextResponse.redirect(`${origin}/admin?error=auth`);
}
