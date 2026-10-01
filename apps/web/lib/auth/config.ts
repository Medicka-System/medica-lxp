import 'server-only';

/**
 * Modo de autenticación. `dev` (default) = identidad de DEV por email (seed, sin
 * Supabase) — para desarrollo local. `supabase` = identidad real desde el JWT de la
 * sesión Supabase. Se activa SOLO con `AUTH_MODE=supabase` (perfil .env.supabase):
 * nunca por default, para que el dev local no dependa de credenciales reales.
 */
export function authEsDev(): boolean {
  return (process.env.AUTH_MODE ?? 'dev').toLowerCase() !== 'supabase';
}
