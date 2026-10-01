import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Cliente Supabase de SERVIDOR (RSC / server actions / route handlers) ligado a las
 * cookies del request — SOLO para AUTH (sesión del usuario). La capa de DATOS sigue
 * yendo por postgres.js con RLS (`comoAlumno`, §2); este cliente NO lee datos de dominio.
 *
 * Usa la ANON key (pública): el límite de seguridad es el JWT del usuario + RLS, no la key.
 */
export async function createClienteSupabaseServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Falta NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (perfil .env.supabase).',
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // En un RSC puro `set` lanza (no se pueden escribir cookies al renderizar).
        // El refresh real de la sesión ocurre en el middleware; aquí se ignora.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* no-op en RSC */
        }
      },
    },
  });
}

/**
 * `sub` (user_id) de la sesión Supabase verificada, o `null` si no hay sesión.
 * `getUser()` valida el JWT contra Supabase (no confía en la cookie sin verificar).
 */
export async function getUsuarioSupabase(): Promise<string | null> {
  const supabase = await createClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Cliente de SERVICE-ROLE (server-only, sin cookies). Omite RLS — úsese SOLO en
 * server actions acotadas que lo necesiten; JAMÁS se expone al cliente (§5/§10).
 * No lo usa el flujo de alumno (los datos van por postgres.js + RLS).
 */
export function createClienteSupabaseServicio() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (perfil .env.supabase).');
  }
  return createServerClient(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
