'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { iniciarSesion, type EstadoLogin } from './acciones';

const INICIAL: EstadoLogin = { error: null };

/**
 * Formulario de login (email+password). Usa `useActionState` sobre la server action
 * `iniciarSesion`; muestra errores claros y un estado "enviando".
 */
export function LoginForm({ aviso }: { aviso?: string | null }) {
  const [estado, accion, enviando] = useActionState(iniciarSesion, INICIAL);
  const mensaje = estado.error ?? aviso ?? null;

  return (
    <form action={accion} className="flex flex-col gap-4">
      {mensaje && (
        <p
          role="alert"
          className="rounded-control border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] font-semibold text-destructive"
        >
          {mensaje}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Correo
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="tu@correo.com"
          className="h-[44px] rounded-control border border-border bg-card px-3 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Contraseña
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="h-[44px] rounded-control border border-border bg-card px-3 text-[13.5px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </label>

      <Button type="submit" size="cta" disabled={enviando} className="mt-2 w-full">
        {enviando ? 'Entrando…' : 'Entrar al Campus'}
      </Button>
    </form>
  );
}
