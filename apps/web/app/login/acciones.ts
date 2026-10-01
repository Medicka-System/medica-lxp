'use server';
import { redirect } from 'next/navigation';
import { createClienteSupabaseServidor } from '@/lib/supabase/server';

export type EstadoLogin = { error: string | null };

/**
 * Inicia sesión con email+password sobre el mismo auth.users que CORA. En éxito,
 * @supabase/ssr escribe las cookies de sesión y redirige al home del campus.
 * El LXP NUNCA crea usuarios (§10, regla 1): solo autentica contra los de CORA.
 */
export async function iniciarSesion(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) {
    return { error: 'Ingresa tu correo y tu contraseña.' };
  }

  const supabase = await createClienteSupabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: 'Correo o contraseña incorrectos.' };
  }
  redirect('/inicio');
}

/** Cierra la sesión (limpia cookies) y vuelve al login. */
export async function cerrarSesion(): Promise<void> {
  const supabase = await createClienteSupabaseServidor();
  await supabase.auth.signOut();
  redirect('/login');
}
