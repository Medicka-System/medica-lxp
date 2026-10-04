'use client';

/**
 * Menú de cuenta del STAFF (header navy del Studio — admin, diseñador, docente).
 * Reemplaza el botón de cuenta "muerto" de los shells por un control funcional:
 * abre un dropdown (cierra por Esc / clic-fuera / navegación del submit) con
 * "Cerrar sesión", que llama a la server action `cerrarSesionStaff` → `signOut`
 * (limpia cookies, sin sesión fantasma) → redirige al login del Studio (`/admin`).
 *
 * Hereda el sistema visual (§5A): pill navy en el header, dropdown en tarjeta clara.
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { focusRingDark } from '@/lib/studio/estilos';
import { cerrarSesionStaff } from '@/app/login/acciones';

const focusClaro =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

export function MenuCuentaStaff({
  usuario,
}: {
  usuario: { nombre: string; iniciales: string; rol?: string };
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [abierto]);

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className={`flex h-[38px] shrink-0 items-center gap-2 rounded-full bg-white/[0.08] py-[3px] pl-[3px] pr-2.5 transition-colors hover:bg-white/[0.16] ${focusRingDark}`}
      >
        <span
          aria-hidden
          className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[11.5px] font-bold text-[color:var(--sidebar)]"
        >
          {usuario.iniciales}
        </span>
        <span className="hidden flex-col text-left leading-[1.15] sm:flex">
          <span className="whitespace-nowrap text-[12px] font-semibold text-sidebar-foreground">
            {usuario.nombre}
          </span>
          {usuario.rol && (
            <span className="whitespace-nowrap text-[9.5px] text-white/55">{usuario.rol}</span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-3.5 w-3.5 text-white/60 transition-transform ${abierto ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Menú de cuenta"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[240px] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-[0_12px_32px_rgba(17,24,39,0.16)]"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-[13.5px] font-bold text-foreground">{usuario.nombre}</p>
            {usuario.rol && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{usuario.rol}</p>
            )}
          </div>
          <form action={cerrarSesionStaff} className="pt-1.5">
            <button
              type="submit"
              role="menuitem"
              className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] font-medium text-foreground transition-colors hover:bg-accent hover:text-secondary ${focusClaro}`}
            >
              <LogOut className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
