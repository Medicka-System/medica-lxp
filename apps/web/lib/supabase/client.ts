'use client';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase de NAVEGADOR (solo AUTH: login/logout, refresh de sesión en el
 * cliente). Usa envs públicas (NEXT_PUBLIC_*). La ANON key es pública por diseño;
 * la seguridad es el JWT + RLS. NUNCA uses aquí la service-role key (§5).
 */
export function createClienteSupabaseNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Falta NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (perfil .env.supabase).',
    );
  }
  return createBrowserClient(url, anon);
}
