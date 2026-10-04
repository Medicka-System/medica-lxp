'use client';

/**
 * Shell de la consola de admin / súper admin (§5B) — SIN sidebar: navegación en un
 * header navy de 60px, como el resto del Studio. Se distingue del Studio del
 * diseñador por su rótulo de rol (Administración / Súper admin con escudo).
 *
 * RBAC visible (§5B / §10): la sección **Configuración** solo la ve el súper admin,
 * con candado. Las secciones aún sin ruta se muestran deshabilitadas (no navegan)
 * para no romper con 404 y a la vez señalar el mapa completo.
 *
 * Eco (analista) y la búsqueda global son placeholders de esta pieza; el dominio
 * conversacional de Eco llega por API en su sprint (§7A).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, Lock, Search, ShieldCheck } from 'lucide-react';
import { mono, focusRingDark } from '@/lib/studio/estilos';
import { LogoSimbolo } from '@/components/marca/logo-simbolo';
import { EcoMark } from './eco-mark';
import { SECCIONES, SECCIONES_FUTURAS } from './nav-config';

export type AdminShellUsuario = {
  nombre: string;
  iniciales: string;
  rol: string;
  esSuper: boolean;
};

function activaEn(pathname: string, href: string): boolean {
  if (href === '/admin/panel') return pathname === '/admin/panel';
  return pathname === href || pathname.startsWith(href + '/');
}

export function AdminShell({
  usuario,
  notificaciones,
  hayAlertaCritica,
  children,
}: {
  usuario: AdminShellUsuario;
  notificaciones: number;
  hayAlertaCritica: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const futuras = SECCIONES_FUTURAS.filter((s) => usuario.esSuper || !s.soloSuper);

  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-2 bg-sidebar px-5">
        {/* marca + rótulo de rol */}
        <Link
          href="/admin/panel"
          className={`mr-1 flex shrink-0 items-center gap-2.5 border-r border-white/[0.14] pr-3.5 ${focusRingDark} rounded-[9px]`}
        >
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-[color:var(--sidebar)]"
          >
            <LogoSimbolo className="h-[72%] w-[72%]" />
          </span>
          <span className="flex flex-col leading-[1.15]">
            <span className="text-[13.5px] font-bold text-sidebar-foreground">Studio</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary">
              <ShieldCheck aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              {usuario.esSuper ? 'Súper admin' : 'Administración'}
            </span>
          </span>
        </Link>

        {/* navegación */}
        <nav aria-label="Secciones de la consola" className="flex shrink-0 items-center">
          {SECCIONES.map((s) => {
            const on = activaEn(pathname, s.href);
            return (
              <Link
                key={s.id}
                href={s.href}
                aria-current={on ? 'page' : undefined}
                className={`relative inline-flex h-[60px] items-center gap-1.5 whitespace-nowrap px-3 text-[13.5px] transition-colors ${focusRingDark} ${
                  on
                    ? 'font-bold text-sidebar-foreground hover:text-sidebar-foreground'
                    : 'font-medium text-white/70 hover:text-white'
                }`}
              >
                {s.etiqueta}
                {on && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-0 h-[2.5px] rounded-t-full bg-primary"
                  />
                )}
              </Link>
            );
          })}

          {/* Secciones aún sin ruta: deshabilitadas (mapa + RBAC, sin 404). */}
          {futuras.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled
              aria-disabled
              title="Disponible próximamente"
              className="inline-flex h-[60px] cursor-not-allowed items-center gap-1.5 whitespace-nowrap px-3 text-[13.5px] font-medium text-white/35"
            >
              {s.etiqueta}
              {s.soloSuper && (
                <Lock aria-hidden className="h-3 w-3 text-white/30" strokeWidth={2} />
              )}
            </button>
          ))}
        </nav>

        {/* utilidades */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-white ${focusRingDark}`}
          >
            <EcoMark size={18} invertido />
            Eco
          </button>

          <label className="hidden h-[38px] w-[200px] shrink-0 items-center gap-2 rounded-[9px] border border-white/[0.18] bg-white/[0.08] px-3 lg:flex">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-white/60" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno, grupo o staff</span>
            <input
              type="search"
              placeholder="Buscar alumno, grupo, staff…"
              className="w-full min-w-0 bg-transparent text-[12px] text-white outline-none placeholder:text-white/55"
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
                className={`${mono} absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-[color:var(--sidebar)] px-1 text-[9.5px] font-bold ${
                  hayAlertaCritica
                    ? 'bg-[color:var(--destructive)] text-white'
                    : 'bg-primary text-[color:var(--sidebar)]'
                }`}
              >
                {notificaciones}
              </span>
            )}
          </button>

          <button
            type="button"
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
              <span className="whitespace-nowrap text-[9.5px] text-white/55">{usuario.rol}</span>
            </span>
            <ChevronDown aria-hidden className="h-3.5 w-3.5 text-white/60" strokeWidth={2} />
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
