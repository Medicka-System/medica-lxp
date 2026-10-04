'use server';
import { redirect } from 'next/navigation';
import { createClienteSupabaseServidor } from '@/lib/supabase/server';
import { authEsDev } from '@/lib/auth/config';

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

/**
 * Cierra la sesión del ALUMNO: `signOut` limpia las cookies de Supabase (sin sesión
 * fantasma; el guard redirige al login) y vuelve al login del Campus. En dev (perfil
 * sin Supabase) no hay cookies que limpiar: solo redirige.
 */
export async function cerrarSesion(): Promise<void> {
  if (!authEsDev()) {
    const supabase = await createClienteSupabaseServidor();
    await supabase.auth.signOut();
  }
  redirect('/login');
}

/**
 * Cierra la sesión del STAFF: igual que `cerrarSesion`, pero vuelve al login del
 * Studio (`/admin`). Limpia las cookies (sin sesión fantasma) y deja que el guard
 * del área de staff exija el login de nuevo.
 */
export async function cerrarSesionStaff(): Promise<void> {
  if (!authEsDev()) {
    const supabase = await createClienteSupabaseServidor();
    await supabase.auth.signOut();
  }
  redirect('/admin');
}
