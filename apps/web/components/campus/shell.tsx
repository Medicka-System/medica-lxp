'use client';

/**
 * Shell del Campus (§5A/§5B) — layout persistente: sidebar navy ("dónde estoy") +
 * topbar ("quién soy y utilidades") + bottom-nav móvil. Navegación con <Link>
 * (URLs reales, sin recargar); el activo sale de usePathname. Referencia visual:
 * campus-lxp-mocks/alumno/shell-menus.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCanalRealtime } from '@/lib/realtime/use-canal';
import {
  ArrowUpRight,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react';
import { mono, kickerMini } from '@/components/tokens';
import { Avatar, iniciales } from '@/components/avatar';
import { LogoSimbolo } from '@/components/marca/logo-simbolo';
import { GRUPOS, GRUPO_PIE, ESENCIALES, TODOS, type ItemNav } from '@/components/campus/nav-config';
import { ModoLecturaContext } from '@/components/campus/modo-lectura';
import { Overlay } from '@/components/ui/overlay';
import { MenuCuenta } from '@/app/(campus)/cuenta/_components/MenuCuenta';

const focusDark =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sidebar)]';
const focusLight =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

export type ShellUsuario = { nombre: string; matricula: string; avatarUrl?: string | null };

/**
 * Contexto para que una ruta hija (el interior del curso · app/(campus)/curso/[id])
 * cambie ESTE shell sin anidar otro: registra el contenido central del header
 * (MenuCurso, EN LUGAR del buscador) y pide colapsar el lateral. Lo consume
 * `CursoShell` (app/(campus)/_shell/CursoShell). Fuera del curso, el buscador queda
 * intacto (headerCentro = null).
 */
export type CursoShellApi = {
  setHeaderCentro: (n: ReactNode) => void;
  setColapsadoCurso: (v: boolean) => void;
};
export const CursoShellContext = createContext<CursoShellApi | null>(null);

function esActivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

function badgeDe(
  item: ItemNav,
  casosPendientes: number,
  consultasNoLeidas: number,
  nuevosAteneo: number,
): string | undefined {
  if (item.id === 'bitacora' && casosPendientes > 0) return String(casosPendientes);
  if (item.id === 'consultas' && consultasNoLeidas > 0) return String(consultasNoLeidas);
  if (item.id === 'ateneo') return nuevosAteneo > 0 ? String(nuevosAteneo) : 'En vivo';
  return undefined;
}

function ItemLateral({
  item,
  activo,
  colapsado,
  badge,
  onClick,
}: {
  item: ItemNav;
  activo: boolean;
  colapsado: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  const Icono = item.icono;
  const contenido = (
    <>
      {activo && (
        <span aria-hidden className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
      )}
      <Icono className={`h-[19px] w-[19px] shrink-0 ${activo ? 'text-primary' : 'text-white/70'}`} strokeWidth={1.75} />
      {!colapsado && (
        <>
          <span className={`min-w-0 flex-1 truncate text-[14px] ${activo ? 'font-bold text-white' : 'font-medium text-white/80'}`}>
            {item.etiqueta}
          </span>
          {item.externo && <ArrowUpRight aria-hidden className="h-[15px] w-[15px] shrink-0 text-white/45" strokeWidth={1.75} />}
          {badge && !item.externo && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                badge === 'En vivo'
                  ? 'bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
                  : `bg-primary text-[color:var(--sidebar)] ${mono}`
              }`}
            >
              {badge}
            </span>
          )}
        </>
      )}
      {colapsado && badge && <span aria-hidden className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />}
    </>
  );
  const clases = `group relative flex h-9 w-full items-center gap-3 rounded-[10px] px-3 text-left transition-colors ${focusDark} ${
    activo ? 'bg-white/12' : 'hover:bg-white/8'
  } ${colapsado ? 'justify-center px-0' : ''}`;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={colapsado ? item.etiqueta : undefined}
      aria-current={activo ? 'page' : undefined}
      className={clases}
    >
      {contenido}
    </Link>
  );
}

export function CampusShell({
  usuario,
  userId,
  casosPendientes,
  noLeidas = 0,
  consultasNoLeidas = 0,
  children,
}: {
  usuario: ShellUsuario;
  userId?: string;
  casosPendientes: number;
  noLeidas?: number;
  consultasNoLeidas?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // El modo lectura (teoría/autoeval · §5A) CONTRAE el lateral para dar aire a la
  // lectura; fuera de él, manda el toggle manual del usuario. El ancho anima solo
  // (transition-[width]), respetando prefers-reduced-motion.
  const modoLectura = useContext(ModoLecturaContext);
  const [colapsadoManual, setColapsadoManual] = useState(false);
  // Registro del interior del curso: MenuCurso en el header + lateral colapsado.
  const [headerCentro, setHeaderCentro] = useState<ReactNode>(null);
  const [colapsadoCurso, setColapsadoCurso] = useState(false);
  const cursoApi = useMemo<CursoShellApi>(() => ({ setHeaderCentro, setColapsadoCurso }), []);
  const enCurso = headerCentro != null;
  // El swap buscador↔MenuCurso ya no es instantáneo: cruza con el primitivo Overlay.
  // Para que la SALIDA (dejar el curso) anime, el MenuCurso debe seguir montado
  // mientras se desvanece; al salir, `headerCentro` se vuelve null, así que retenemos
  // el último nodo para que el Overlay tenga qué desvanecer.
  const [centroRetenido, setCentroRetenido] = useState<ReactNode>(null);
  useEffect(() => {
    if (headerCentro != null) setCentroRetenido(headerCentro);
  }, [headerCentro]);
  const colapsado = colapsadoCurso || (modoLectura?.activo ?? false) || colapsadoManual;
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const [masAbierto, setMasAbierto] = useState(false);
  // Contador EN VIVO de novedades del Ateneo (señal de comunidad, sin tabla de lectura):
  // sube con cada post/comentario nuevo y se reinicia al entrar al Ateneo.
  const [nuevosAteneo, setNuevosAteneo] = useState(0);

  // Realtime (§7): badges del sidebar. Todo NO-OP en dev local sin Supabase.
  //  • usuario:<uid> → algo personal cambió (notificación, caso validado, consulta) →
  //    refresca el layout force-dynamic (recomputa casos/consultas/no-leídas bajo RLS).
  //  • ateneo:feed   → novedad de comunidad → incrementa el badge del Ateneo.
  useCanalRealtime(userId ? `usuario:${userId}` : null, () => router.refresh());
  useCanalRealtime('ateneo:feed', () => setNuevosAteneo((n) => n + 1));
  const cuentaRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const ini = iniciales(usuario.nombre);

  // Cierra el menú de cuenta y devuelve el foco al avatar (§5 de la spec).
  const cerrarCuenta = (devolverFoco = false) => {
    setCuentaAbierta(false);
    if (devolverFoco) avatarBtnRef.current?.focus();
  };

  useEffect(() => {
    if (!cuentaAbierta) return;
    const cerrar = (e: MouseEvent) => {
      if (cuentaRef.current && !cuentaRef.current.contains(e.target as Node)) setCuentaAbierta(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarCuenta(true);
    };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('keydown', esc);
    };
  }, [cuentaAbierta]);

  // Cierra la hoja "Más" y el menú de cuenta al navegar.
  useEffect(() => {
    setMasAbierto(false);
    setCuentaAbierta(false);
  }, [pathname]);

  // Al entrar al Ateneo, el badge "en vivo" vuelve a cero (ya se están viendo).
  useEffect(() => {
    if (pathname.startsWith('/ateneo')) setNuevosAteneo(0);
  }, [pathname]);

  // STUB de cierre de sesión (Supabase auth.signOut · Sprint 11).
  const onCerrarSesion = () => {
    // supabase.auth.signOut() → redirigir al login
  };

  return (
    <CursoShellContext.Provider value={cursoApi}>
    <div className="min-h-dvh bg-background font-sans text-foreground antialiased transition-colors [transition-duration:var(--dur-lenta)] motion-reduce:transition-none">
      <div className="flex pt-[68px]">
        {/* ══ LATERAL ══ */}
        <aside
          /* Alto = viewport − header. Se divide por --ui-zoom porque los dvh NO se
             escalan con el `zoom` del body: sin la compensación, el 100dvh se
             renderiza al 80% y el bloque inferior queda flotando. Con ella, el
             sidebar llena exacto el alto real bajo zoom. La estructura interna ya es
             flex-col (nav flex-1 scrollable + pie shrink-0), que ancla el pie abajo. */
          className={`alto-lateral sticky top-[68px] hidden shrink-0 flex-col overflow-hidden bg-sidebar transition-[width,background-color,color] [transition-duration:var(--dur-lenta)] [transition-timing-function:var(--ease-estandar)] motion-reduce:transition-none lg:flex ${
            colapsado ? 'w-[76px]' : 'w-[264px]'
          }`}
        >
          <nav aria-label="Secciones del campus" className="min-h-0 flex-1 overflow-y-auto scroll-sutil px-3 py-3">
            {GRUPOS.map((g, i) => (
              <div key={g.titulo} className={i > 0 ? 'mt-4' : ''}>
                {colapsado
                  ? i > 0 && <div aria-hidden className="mx-auto mb-3 h-px w-8 bg-white/12" />
                  : <p className={`${kickerMini} mb-1 px-3 text-[color:var(--hero-ink-muted)]`}>{g.titulo}</p>}
                <div className="flex flex-col gap-1">
                  {g.items.map((item) => (
                    <ItemLateral
                      key={item.id}
                      item={item}
                      activo={esActivo(pathname, item.href) || (enCurso && item.id === 'cursos')}
                      colapsado={colapsado}
                      badge={badgeDe(item, casosPendientes, consultasNoLeidas, nuevosAteneo)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-white/10 px-3 py-3">
            <div className="flex flex-col gap-1">
              {GRUPO_PIE.map((item) => (
                <ItemLateral key={item.id} item={item} activo={esActivo(pathname, item.href)} colapsado={colapsado} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setColapsadoManual((v) => !v)}
              aria-label={colapsado ? 'Expandir el menú' : 'Colapsar el menú'}
              aria-pressed={colapsado}
              className={`mt-2 flex h-9 w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-semibold text-white/60 transition-colors hover:bg-white/8 hover:text-white ${focusDark} ${
                colapsado ? 'justify-center px-0' : ''
              }`}
            >
              {colapsado ? <ChevronsRight className="h-[18px] w-[18px]" strokeWidth={1.75} /> : (
                <>
                  <ChevronsLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  Modo lectura
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ══ COLUMNA PRINCIPAL ══ */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="fixed inset-x-0 top-0 z-30 flex h-[68px] items-center gap-3 border-b border-border bg-card px-4 sm:px-6 transition-colors [transition-duration:var(--dur-lenta)] motion-reduce:transition-none">
            <Link href="/inicio" className="flex shrink-0 items-center gap-3 lg:w-[240px]">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-sidebar text-sidebar-foreground">
                <LogoSimbolo className="h-[70%] w-[70%]" />
              </span>
              <span className="hidden min-w-0 leading-tight sm:block">
                <span className="block truncate text-[14px] font-bold">Médica</span>
                <span className="block truncate text-[11px] font-semibold text-muted-foreground">Campus Virtual</span>
              </span>
            </Link>

            {/* El buscador GLOBAL del header se retiró para el alumno: cada sección conserva
                su propia búsqueda local (casos, bitácora, videoteca…). Dentro del curso el
                MenuCurso ocupa el centro; fuera, este contenedor queda como espaciador que
                empuja las utilidades a la derecha. El MenuCurso cruza (fade) al entrar/salir
                del curso vía el primitivo Overlay — mostramos `headerCentro` en vivo y caemos
                a `centroRetenido` durante la salida para que el fade tenga qué desvanecer. */}
            <div className="relative flex min-w-0 flex-1 items-stretch justify-center">
              <Overlay open={enCurso} className="min-w-0">
                <div className="flex h-full min-w-0 items-stretch justify-center">
                  {headerCentro ?? centroRetenido}
                </div>
              </Overlay>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                href="/notificaciones"
                aria-label={`Notificaciones${noLeidas ? `: ${noLeidas} sin leer` : ''}`}
                aria-current={esActivo(pathname, '/notificaciones') ? 'page' : undefined}
                className={`relative grid h-11 w-11 place-items-center rounded-full text-foreground transition-colors hover:bg-accent ${focusLight} ${
                  esActivo(pathname, '/notificaciones') ? 'bg-accent text-secondary' : ''
                }`}
              >
                <Bell aria-hidden className="h-[19px] w-[19px]" strokeWidth={1.75} />
                {noLeidas > 0 && (
                  <span aria-hidden className={`absolute right-1.5 top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-[color:var(--sidebar)] ${mono}`}>
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </span>
                )}
              </Link>

              <div className="relative" ref={cuentaRef}>
                <button
                  ref={avatarBtnRef}
                  type="button"
                  onClick={() => setCuentaAbierta((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={cuentaAbierta}
                  className={`flex h-11 items-center gap-2.5 rounded-full pl-1 pr-1 transition-colors hover:bg-accent sm:pr-3 ${focusLight}`}
                >
                  <Avatar ini={ini} url={usuario.avatarUrl} size={36} />
                  <span className="hidden min-w-0 text-left leading-tight sm:block">
                    <span className="block truncate text-[13px] font-bold">{usuario.nombre}</span>
                    <span className={`block truncate text-[10.5px] text-muted-foreground ${mono}`}>{usuario.matricula}</span>
                  </span>
                </button>

                {/* Montado siempre: el Overlay interno anima entrada Y salida según `open`. */}
                <MenuCuenta
                  open={cuentaAbierta}
                  usuario={{ nombre: usuario.nombre, matricula: usuario.matricula, avatarUrl: usuario.avatarUrl }}
                  onCerrar={() => cerrarCuenta(false)}
                  onCerrarSesion={onCerrarSesion}
                />
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 pb-24 lg:pb-10">{children}</main>
        </div>
      </div>

      {/* ══ MÓVIL · bottom-nav ══ */}
      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-[460px] items-stretch gap-1 px-2 py-1.5">
          {ESENCIALES.map((id) => {
            const item = TODOS.find((t) => t.id === id);
            if (!item) return null;
            const Icono = item.icono;
            const on = esActivo(pathname, item.href);
            const badge = badgeDe(item, casosPendientes, consultasNoLeidas, nuevosAteneo);
            return (
              <Link key={id} href={item.href} aria-current={on ? 'page' : undefined} className={`flex h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[10px] transition-colors ${on ? 'bg-accent' : ''}`}>
                <span className="relative">
                  <Icono className={`h-[21px] w-[21px] ${on ? 'text-secondary' : 'text-muted-foreground'}`} strokeWidth={1.75} />
                  {badge && !on && <span aria-hidden className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                </span>
                <span className={`text-[10.5px] leading-none ${on ? 'font-bold text-secondary' : 'font-medium text-muted-foreground'}`}>
                  {item.etiqueta.replace('Mi ', '').replace('Mis ', '')}
                </span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMasAbierto(true)} aria-expanded={masAbierto} className="flex h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[10px]">
            <Avatar ini={ini} url={usuario.avatarUrl} size={21} />
            <span className="text-[10.5px] font-medium leading-none text-muted-foreground">Perfil</span>
          </button>
        </div>
      </nav>

      {/* Hoja "Más" (móvil): montada siempre. El backdrop cruza por opacidad (tokens) y
          el panel adopta el primitivo Overlay (origen abajo) — entrada Y salida animadas,
          sin el "pop" del render condicional. Cerrada: pointer-events-none + inerte para
          lectores/foco. */}
      <div className={`fixed inset-0 z-40 lg:hidden ${masAbierto ? '' : 'pointer-events-none'}`} aria-hidden={!masAbierto}>
        <button
          type="button"
          aria-label="Cerrar"
          tabIndex={masAbierto ? 0 : -1}
          onClick={() => setMasAbierto(false)}
          className="absolute inset-0 bg-[color:var(--sidebar)]/55 transition-opacity [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-estandar)] motion-reduce:transition-none"
          style={{ opacity: masAbierto ? 1 : 0 }}
        />
        <Overlay
          open={masAbierto}
          className="absolute inset-x-0 bottom-0 origin-bottom rounded-t-[18px] border-t border-border bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        >
            <div className="flex items-center gap-3">
              <Avatar ini={ini} url={usuario.avatarUrl} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold">{usuario.nombre}</p>
                <p className={`truncate text-[11px] text-muted-foreground ${mono}`}>{usuario.matricula}</p>
              </div>
              <button type="button" onClick={() => setMasAbierto(false)} aria-label="Cerrar" className={`grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-accent ${focusLight}`}>
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[...GRUPOS.flatMap((g) => g.items).filter((i) => !ESENCIALES.includes(i.id)), ...GRUPO_PIE].map((item) => {
                const Icono = item.icono;
                return (
                  <Link key={item.id} href={item.href} className={`flex h-[60px] items-center gap-3 rounded-[12px] border border-border bg-card px-3.5 text-left transition-colors hover:bg-accent ${focusLight}`}>
                    <Icono className="h-[19px] w-[19px] shrink-0 text-secondary" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-tight">{item.etiqueta}</span>
                    {item.externo && <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
                  </Link>
                );
              })}
            </div>
        </Overlay>
      </div>
    </div>
    </CursoShellContext.Provider>
  );
}
