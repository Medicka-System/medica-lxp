import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refresca la sesión Supabase en cada request (rota el access token con el refresh
 * token y reescribe las cookies). Patrón oficial de @supabase/ssr para App Router.
 *
 * En LOCAL (perfil .env, sin Supabase) es un NO-OP: si faltan las envs públicas,
 * devuelve la respuesta tal cual → el dev con identidad DEV sigue funcionando.
 */
export async function refrescarSesion(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Importante: getUser() revalida el token y dispara el refresh/escritura de cookies.
  await supabase.auth.getUser();
  return response;
}
