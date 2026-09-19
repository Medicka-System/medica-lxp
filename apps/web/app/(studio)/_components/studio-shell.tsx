'use client';

/**
 * Shell del Studio (§5B) — SIN sidebar: la navegación vive en un header navy de
 * 60px para dar todo el ancho a las herramientas de autoría, y para que el Studio
 * se distinga del Campus desde el primer segundo. Navegación real con <Link>; el
 * activo sale de usePathname. Referencia visual: campus-lxp-mocks/studio/disenador.
 *
 * "Vista previa como alumno" NO vive aquí: es contextual y solo aparece dentro de
 * un programa (builder) o de un grupo, donde hay algo que previsualizar.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, LayoutTemplate } from 'lucide-react';
import { mono, focusRingDark } from '@/lib/studio/estilos';
import { SECCIONES, HERRAMIENTAS } from './nav-config';

export type StudioUsuario = { nombre: string; iniciales: string; rol: string };

function activaEn(pathname: string, href: string): boolean {
  if (href === '/studio') return pathname === '/studio';
  return pathname === href || pathname.startsWith(href + '/');
}

export function StudioShell({
  usuario,
  notificaciones,
  children,
}: {
  usuario: StudioUsuario;
  notificaciones: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  useEffect(() => setMenu(false), [pathname]);

  const enHerramientas = HERRAMIENTAS.some((h) => activaEn(pathname, h.href));

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground antialiased">
      <header className="relative z-20 flex h-[60px] items-center gap-2 bg-sidebar px-5">
        {/* marca */}
        <Link
          href="/studio/programas"
          className={`mr-1.5 flex items-center gap-2.5 border-r border-white/[0.14] pr-3.5 ${focusRingDark} rounded-[9px]`}
        >
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-[12px] font-extrabold text-[color:var(--sidebar)]"
          >
            MC
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-bold leading-tight text-sidebar-foreground">
              Studio
            </span>
            <span className="block whitespace-nowrap text-[10.5px] text-white/55">
              Médica Capacitación
            </span>
          </span>
        </Link>

        {/* navegación */}
        <nav aria-label="Secciones del Studio" className="flex items-center gap-0.5">
          {SECCIONES.map((s) => {
            const on = activaEn(pathname, s.href);
            return (
              <Link
                key={s.id}
                href={s.href}
                aria-current={on ? 'page' : undefined}
                className={`relative flex h-[60px] items-center px-3.5 text-[13.5px] transition-colors ${focusRingDark} ${
                  on ? 'font-bold text-sidebar-foreground' : 'font-medium text-white/70 hover:text-white'
                }`}
              >
                {s.etiqueta}
                {on && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3.5 bottom-0 h-[2.5px] rounded-t-full bg-primary"
                  />
                )}
              </Link>
            );
          })}

          <div className="relative" ref={caja}>
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-haspopup="menu"
              className={`inline-flex h-[60px] items-center gap-1.5 px-3.5 text-[13.5px] transition-colors ${focusRingDark} ${
                menu || enHerramientas
                  ? 'bg-white/10 font-semibold text-sidebar-foreground'
                  : 'font-medium text-white/70 hover:text-white'
              }`}
            >
              Herramientas
              <ChevronDown aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
            </button>

            {menu && (
              <div
                role="menu"
                className="absolute left-1.5 top-[56px] w-[288px] rounded-xl border border-border bg-card p-2 shadow-[0_18px_40px_rgba(17,24,39,0.18)]"
              >
                {HERRAMIENTAS.map((h) => {
                  const Icono = h.icono ?? LayoutTemplate;
                  return (
                    <Link
                      key={h.id}
                      href={h.href}
                      role="menuitem"
                      className={`flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left transition-colors hover:bg-accent ${focusRingDark}`}
                    >
                      <span
                        aria-hidden
                        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground"
                      >
                        <Icono className="h-[17px] w-[17px]" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-bold leading-snug text-foreground">
                          {h.etiqueta}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                          {h.nota}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* utilidades */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={`Notificaciones${notificaciones ? `: ${notificaciones} sin leer` : ''}`}
            className={`relative grid h-[38px] w-[38px] place-items-center rounded-[9px] text-white/80 transition-colors hover:bg-white/10 hover:text-white ${focusRingDark}`}
          >
            <Bell aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {notificaciones > 0 && (
              <span
                aria-hidden
                className={`${mono} absolute right-2 top-[7px] grid h-[15px] min-w-[15px] place-items-center rounded-full border-2 border-sidebar bg-primary px-[3px] text-[9px] font-bold text-[color:var(--sidebar)]`}
              >
                {notificaciones}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`flex h-[38px] items-center gap-2 rounded-full bg-white/[0.08] py-[3px] pl-[3px] pr-2.5 text-white/60 transition-colors hover:bg-white/[0.14] ${focusRingDark}`}
          >
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[11.5px] font-bold text-[color:var(--sidebar)]"
            >
              {usuario.iniciales}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-[12px] font-bold leading-tight text-sidebar-foreground">
                {usuario.nombre}
              </span>
              <span className="block text-[10px] text-white/55">{usuario.rol}</span>
            </span>
            <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
