'use client';

/**
 * Shell de la consola de admin / súper admin (§5B) — SIN sidebar: navegación en un
 * header navy de 60px, como el resto del Studio. Se distingue del Studio del
 * diseñador por su rótulo de rol (Administración / Súper admin con escudo).
 *
 * RBAC visible (§5B / §10): la sección **Configuración** solo la ve el súper admin;
 * el nav se filtra por `soloSuper` según el rol de la sesión.
 *
 * Tres utilidades REALES del header:
 *   · Eco (analista de escuela) → cajón con el chat read-only (surface "escuela", §7A).
 *   · Búsqueda global → `buscarGlobal` sobre `lxp.perfiles`/`grupos` bajo RLS (§2).
 *   · Campana → conteo + panel de las notificaciones propias del staff (§8 job #12).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Bell, Loader2, Search, ShieldCheck, X } from 'lucide-react';
import { mono, focusRingDark } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import { MenuCuentaStaff } from '@/components/studio/menu-cuenta-staff';
import { LogoSimbolo } from '@/components/marca/logo-simbolo';
import type { NotificacionItem } from '@/lib/campus/notificaciones-datos';
import { EcoMark } from './eco-mark';
import { ChatEco } from './chat-eco';
import { SECCIONES } from './nav-config';
import { buscarGlobal, type ResultadoBusqueda } from './_busqueda';

export type AdminShellUsuario = {
  nombre: string;
  iniciales: string;
  rol: string;
  esSuper: boolean;
};

const ETIQUETA_TIPO: Record<ResultadoBusqueda['tipo'], string> = {
  alumno: 'Alumno',
  staff: 'Staff',
  grupo: 'Grupo',
};

function activaEn(pathname: string, href: string): boolean {
  if (href === '/admin/panel') return pathname === '/admin/panel';
  return pathname === href || pathname.startsWith(href + '/');
}

export function AdminShell({
  usuario,
  notificaciones,
  hayAlertaCritica,
  notificacionesRecientes,
  children,
}: {
  usuario: AdminShellUsuario;
  notificaciones: number;
  hayAlertaCritica: boolean;
  notificacionesRecientes: NotificacionItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // RBAC del nav (§5B): Configuración (soloSuper) solo para el súper admin.
  const secciones = SECCIONES.filter((s) => !s.soloSuper || usuario.esSuper);

  // Eco (cajón), búsqueda (dropdown) y campana (panel) — un solo abierto a la vez.
  const [ecoAbierto, setEcoAbierto] = useState(false);
  const [campanaAbierta, setCampanaAbierta] = useState(false);

  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [buscando, iniciarBusqueda] = useTransition();

  // Búsqueda con debounce (300 ms); min. 2 caracteres.
  useEffect(() => {
    const termino = q.trim();
    if (termino.length < 2) {
      setResultados([]);
      setBusquedaAbierta(false);
      return;
    }
    const id = setTimeout(() => {
      iniciarBusqueda(async () => {
        const r = await buscarGlobal(termino);
        setResultados(r);
        setBusquedaAbierta(true);
      });
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  // Cerrar lo abierto con Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setEcoAbierto(false);
        setCampanaAbierta(false);
        setBusquedaAbierta(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function cerrarBusqueda() {
    setBusquedaAbierta(false);
    setQ('');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
      <header className="relative z-20 flex h-[var(--studio-header)] shrink-0 items-center gap-2 bg-sidebar px-5">
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
          {secciones.map((s) => {
            const on = activaEn(pathname, s.href);
            return (
              <Link
                key={s.id}
                href={s.href}
                aria-current={on ? 'page' : undefined}
                className={`relative inline-flex h-[var(--studio-header)] items-center gap-1.5 whitespace-nowrap px-3 text-[13.5px] transition-colors ${focusRingDark} ${
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
        </nav>

        {/* utilidades */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setEcoAbierto(true)}
            aria-haspopup="dialog"
            aria-expanded={ecoAbierto}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-white ${focusRingDark}`}
          >
            <EcoMark size={18} invertido />
            Eco
          </button>

          {/* búsqueda global */}
          <div className="relative hidden lg:block">
            <label className="flex h-[38px] w-[200px] shrink-0 items-center gap-2 rounded-[9px] border border-white/[0.18] bg-white/[0.08] px-3">
              <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-white/60" strokeWidth={1.75} />
              <span className="sr-only">Buscar alumno, grupo o staff</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => resultados.length > 0 && setBusquedaAbierta(true)}
                placeholder="Buscar alumno, grupo, staff…"
                className="w-full min-w-0 bg-transparent text-[12px] text-white outline-none placeholder:text-white/55"
              />
              {buscando && <Loader2 aria-hidden className="h-[14px] w-[14px] shrink-0 animate-spin text-white/60" />}
            </label>

            {busquedaAbierta && (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  onClick={cerrarBusqueda}
                  className="fixed inset-0 z-30 cursor-default"
                />
                <div className="absolute right-0 top-[calc(100%+6px)] z-40 max-h-[70vh] w-[320px] overflow-auto rounded-[12px] border border-border bg-card p-1.5 shadow-rest">
                  {resultados.length === 0 ? (
                    <p className="px-3 py-3 text-[12px] text-muted-foreground">
                      {buscando ? 'Buscando…' : `Sin resultados para «${q.trim()}».`}
                    </p>
                  ) : (
                    <ul>
                      {resultados.map((r) => (
                        <li key={`${r.tipo}:${r.id}`}>
                          <Link
                            href={r.href}
                            onClick={cerrarBusqueda}
                            className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 transition-colors hover:bg-accent hover:text-accent-foreground ${focusRingDark}`}
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                              {ETIQUETA_TIPO[r.tipo].slice(0, 2).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] font-semibold text-foreground">{r.nombre}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">{r.detalle}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          {/* campana */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCampanaAbierta((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={campanaAbierta}
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

            {campanaAbierta && (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setCampanaAbierta(false)}
                  className="fixed inset-0 z-30 cursor-default"
                />
                <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[340px] overflow-hidden rounded-[12px] border border-border bg-card shadow-rest">
                  <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                    <span className="text-[12.5px] font-bold text-foreground">Notificaciones</span>
                    {notificaciones > 0 && (
                      <span className={`${mono} text-[11px] font-bold text-secondary`}>{notificaciones} sin leer</span>
                    )}
                  </div>
                  {notificacionesRecientes.length === 0 ? (
                    <p className="px-3.5 py-5 text-center text-[12px] text-muted-foreground">
                      No tiene notificaciones.
                    </p>
                  ) : (
                    <ul className="max-h-[60vh] divide-y divide-border overflow-auto">
                      {notificacionesRecientes.map((n) => (
                        <li
                          key={n.id}
                          className={`px-3.5 py-3 ${n.leida ? '' : 'bg-accent/60'}`}
                        >
                          <div className="flex items-start gap-2">
                            {!n.leida && (
                              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12.5px] font-semibold text-foreground">{n.titulo}</p>
                              <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">{n.cuerpo}</p>
                              <p className="mt-1 text-[10.5px] text-muted-foreground">{haceCuanto(new Date(n.creadaEn))}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          <MenuCuentaStaff
            usuario={{ nombre: usuario.nombre, iniciales: usuario.iniciales, rol: usuario.rol }}
          />
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>

      {/* Cajón de Eco (analista de la escuela · §7A) */}
      {ecoAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Eco, analista de la escuela">
          <button
            type="button"
            aria-label="Cerrar Eco"
            onClick={() => setEcoAbierto(false)}
            className="absolute inset-0 bg-[color:var(--sidebar)]/40 backdrop-blur-[1px]"
          />
          <div className="relative flex h-full w-full max-w-[480px] flex-col overflow-auto bg-background p-4 shadow-rest">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[13px] font-bold text-foreground">
                <EcoMark size={18} />
                Eco · analista de la escuela
              </span>
              <button
                type="button"
                onClick={() => setEcoAbierto(false)}
                aria-label="Cerrar"
                className={`grid h-8 w-8 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:bg-muted ${focusRingDark}`}
              >
                <X aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <ChatEco
              surface="escuela"
              entidadId="escuela"
              subtitulo="Su analista de la escuela"
              placeholder="Pregúntele a Eco sobre la escuela…"
              intro="Pregúntele a Eco sobre la escuela: cruza alumnos, casos y validación, competencia I-AIM y comunidad del LRS (bajo RLS) para responder con datos reales. Eco propone; usted decide."
              sugerencias={['¿Cómo va la escuela?', '¿En qué dominio I-AIM está más floja?', '¿Cuántos casos faltan por validar?']}
            />
          </div>
        </div>
      )}
    </div>
  );
}
