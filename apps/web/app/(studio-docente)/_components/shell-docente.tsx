'use client';

/**
 * Shell de la consola del DOCENTE (§5B) — SIN sidebar: la navegación vive en un
 * header navy de 60px, igual que el resto del Studio, para dar todo el ancho al
 * trabajo. El rol va bajo el wordmark ("Docente") para que nunca se confunda con el
 * Studio del diseñador, que tiene otras secciones. Navegación real con <Link>; el
 * activo sale de usePathname. Referencia visual: campus-lxp-mocks/studio/docente/layout.
 *
 * El docente NO sale al Campus: el campus es la experiencia del alumno. Toda su
 * docencia ocurre aquí — por eso no hay salida al campus en el header.
 *
 * El badge de Validación lleva el conteo de casos en cola: es la cola que define su
 * día. Llega ya calculado por el layout (RLS), no es mock.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { mono, focusRingDark } from '@/lib/studio/estilos';
import { MenuCuentaStaff } from '@/components/studio/menu-cuenta-staff';
import { LogoSimbolo } from '@/components/marca/logo-simbolo';
import { SECCIONES } from './nav-config';

export type DocenteUsuario = { nombre: string; iniciales: string };

function activaEn(pathname: string, href: string): boolean {
  if (href === '/docente') return pathname === '/docente';
  return pathname === href || pathname.startsWith(href + '/');
}

export function ShellDocente({
  usuario,
  casosEnCola,
  notificaciones,
  children,
}: {
  usuario: DocenteUsuario;
  casosEnCola: number;
  notificaciones: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-2 bg-sidebar px-5">
        {/* marca + rol */}
        <Link
          href="/docente"
          className={`mr-1 flex shrink-0 items-center gap-2.5 rounded-[9px] border-r border-white/[0.14] pr-3 ${focusRingDark}`}
        >
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-[color:var(--sidebar)]"
          >
            <LogoSimbolo className="h-[72%] w-[72%]" />
          </span>
          <span className="flex flex-col leading-[1.15]">
            <span className="text-[13.5px] font-bold text-sidebar-foreground">Studio</span>
            <span className="whitespace-nowrap text-[10px] font-medium text-white/55">
              Docente · Médica Capacitación
            </span>
          </span>
        </Link>

        <nav aria-label="Secciones del docente" className="flex shrink-0 items-center">
          {SECCIONES.map((s) => {
            const on = activaEn(pathname, s.href);
            return (
              <Link
                key={s.id}
                href={s.href}
                aria-current={on ? 'page' : undefined}
                className={`relative inline-flex h-[60px] items-center gap-1.5 whitespace-nowrap px-2.5 text-[13px] transition-colors ${focusRingDark} ${
                  on
                    ? 'font-bold text-sidebar-foreground hover:text-sidebar-foreground'
                    : 'font-medium text-white/70 hover:text-white'
                }`}
              >
                {s.etiqueta}
                {s.cola === 'casos' && casosEnCola > 0 && (
                  <span
                    aria-hidden
                    className={`${mono} grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10.5px] font-bold text-[color:var(--sidebar)]`}
                  >
                    {casosEnCola}
                  </span>
                )}
                {on && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2.5 bottom-0 h-[2.5px] rounded-t-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* utilidades globales */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <label className="hidden h-[38px] w-[236px] shrink-0 items-center gap-2 rounded-[9px] border border-white/[0.18] bg-white/[0.08] px-3 lg:flex">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-white/60" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno, grupo o caso</span>
            <input
              type="search"
              placeholder="Buscar alumno, grupo o caso…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-white outline-none placeholder:text-white/55"
            />
          </label>

          <button
            type="button"
            aria-label={`Notificaciones${notificaciones ? `: ${notificaciones} sin leer` : ''}`}
            className={`relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/[0.18] bg-white/[0.08] text-sidebar-foreground transition-colors hover:bg-white/[0.16] ${focusRingDark}`}
          >
            <Bell aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
            {notificaciones > 0 && (
              <span
                aria-hidden
                className={`${mono} absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-[color:var(--sidebar)] bg-primary px-1 text-[9.5px] font-bold text-[color:var(--sidebar)]`}
              >
                {notificaciones}
              </span>
            )}
          </button>

          <MenuCuentaStaff
            usuario={{ nombre: usuario.nombre, iniciales: usuario.iniciales, rol: 'Docente' }}
          />
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
