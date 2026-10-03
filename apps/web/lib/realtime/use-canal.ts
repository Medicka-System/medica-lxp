'use client';

/**
 * Hook de SUSCRIPCIÓN a un canal Broadcast PRIVADO de Supabase Realtime (§7/§10).
 *
 * Modelo de seguridad (innegociable):
 *   • El canal es PRIVADO → la suscripción pasa por RLS sobre `realtime.messages`, que
 *     delega en `lxp.rt_puede_escuchar(topic)` (mig 0072). Un suscriptor JAMÁS recibe de
 *     un topic que su JWT no autoriza (default-deny). El cliente usa la ANON key pública;
 *     lo ÚNICO que separa usuarios es el JWT real (`setAuth`) + ese gate RLS.
 *   • El payload es una SEÑAL mínima (ids, nunca filas/PII). Al recibirlo, el consumidor
 *     RE-CONSULTA por su ruta RLS existente (server action) — Realtime INVALIDA el estado,
 *     no lo reemplaza. Un bug de canal no puede filtrar contenido: no viaja contenido.
 *
 * NO-OP sin las envs públicas de Supabase (dev local con AUTH_MODE=dev) o sin sesión →
 * el app funciona igual sin Realtime. `topic = null` tampoco suscribe.
 */

import { useEffect, useRef } from 'react';
import { createClienteSupabaseNavegador } from '@/lib/supabase/client';

export function useCanalRealtime(topic: string | null, onSenal: () => void): void {
  // Ref para no re-suscribir cuando cambia solo el callback (identidad inestable).
  const cb = useRef(onSenal);
  cb.current = onSenal;

  useEffect(() => {
    if (!topic) return;
    // Sin envs públicas (dev local) no hay Realtime: no-op, sin tocar el cliente.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }

    const supabase = createClienteSupabaseNavegador();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;

    // El canal privado exige el JWT del usuario ANTES de suscribir (si no hay sesión,
    // no se suscribe: el gate RLS denegaría de todos modos).
    void supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (cancelado || !token) return;
      supabase.realtime.setAuth(token);
      canal = supabase
        .channel(topic, { config: { private: true } })
        .on('broadcast', { event: '*' }, () => cb.current())
        .subscribe();
    });

    return () => {
      cancelado = true;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [topic]);
}
