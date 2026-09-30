'use client';

/**
 * Menú de cuenta del header (§5 de la spec). Se monta junto al avatar; el que lo
 * monta (el shell) controla apertura, cierre por Esc/clic-fuera y el retorno de
 * foco al avatar. Aquí: lleva el foco al primer ítem al abrir y ofrece Mi perfil /
 * Ajustes / Cerrar sesión.
 *
 * Movimiento (§5A): adopta el primitivo Overlay (`capaOverlay` + `data-open`) — queda
 * MONTADO siempre y anima ENTRADA y SALIDA (fade + scale sutil) según `open`, en vez
 * del "pop" del render condicional. Con `open === false` el primitivo lo deja en
 * `display:none` (fuera del árbol de accesibilidad y del foco).
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { LogOut, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mono } from '@/components/tokens';
import { iniciales } from '@/components/avatar';
import { capaOverlay } from '@/components/ui/overlay';
import { AvatarPerfil } from './ui';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

export function MenuCuenta({
  open,
  usuario,
  onCerrar,
  onCerrarSesion,
}: {
  open: boolean;
  usuario: { nombre: string; matricula: string; avatarUrl?: string | null };
  onCerrar: () => void;
  onCerrarSesion: () => void;
}) {
  const primeroRef = useRef<HTMLAnchorElement>(null);

  // Al abrir, el foco entra al primer ítem (§5). Depende de `open` porque ahora el
  // menú vive montado: el foco solo debe entrar cuando realmente se abre.
  useEffect(() => {
    if (open) primeroRef.current?.focus();
  }, [open]);

  const itemBase = `flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors hover:bg-accent hover:text-secondary ${focus}`;

  return (
    <div
      role="menu"
      aria-label="Menú de cuenta"
      data-open={open}
      className={cn(
        capaOverlay,
        'absolute right-0 top-[calc(100%+8px)] w-[264px] origin-top-right overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-[0_12px_32px_rgba(17,24,39,0.16)]',
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
        <AvatarPerfil ini={iniciales(usuario.nombre)} url={usuario.avatarUrl} size={40} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-foreground">{usuario.nombre}</p>
          <p className={`mt-0.5 truncate text-[11px] text-muted-foreground ${mono}`}>{usuario.matricula}</p>
        </div>
      </div>

      <div className="pt-1.5">
        <Link ref={primeroRef} href="/perfil" role="menuitem" onClick={onCerrar} className={itemBase}>
          <User className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
          Mi perfil
        </Link>
        <Link href="/ajustes" role="menuitem" onClick={onCerrar} className={itemBase}>
          <Settings className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
          Ajustes
        </Link>
      </div>

      <div aria-hidden className="mx-1 my-1 h-px bg-border" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onCerrar();
          onCerrarSesion();
        }}
        className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] font-medium text-foreground-soft transition-colors hover:bg-accent hover:text-secondary ${focus}`}
      >
        <LogOut className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
        Cerrar sesión
      </button>
    </div>
  );
}
