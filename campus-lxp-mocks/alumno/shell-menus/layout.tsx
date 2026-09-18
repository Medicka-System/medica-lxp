"use client";

/**
 * Shell del Campus · Médica Capacitación (LXP)
 * Layout persistente: menú lateral ("dónde estoy") + menú superior ("quién soy y utilidades").
 * El área de contenido es un slot: <CampusShell>{children}</CampusShell>.
 *
 * Reparto de responsabilidades (sin duplicados):
 *   Superior → barra fija a todo lo ancho (68px) con el logo, la búsqueda global,
 *              notificaciones y cuenta. Nada de esto existe en el lateral.
 *   Lateral  → secciones, agrupadas; arranca DEBAJO de la barra superior.
 *              Colapsable a 76px para pantallas de lectura/lección.
 *   Móvil    → bottom-nav de 5 esenciales + hoja "Más"; el superior queda en
 *              logo + búsqueda + campana + avatar.
 *
 * Retícula: lateral 264px (76px colapsado) · superior 68px · contenido a 1240px centrado.
 * Tokens de globals.css (sin hex aquí): bg-sidebar bg-card bg-background bg-accent bg-primary
 * text-sidebar-foreground text-foreground text-muted-foreground text-secondary border-border
 * var(--hero-ink-soft) var(--hero-ink-muted) var(--track) var(--info*) var(--warning*)
 *
 * Stubs: onNavigate · onSearch · onAbrirNotificaciones · onCuenta · onSalirAPagos
 */

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  CreditCard,
  FileText,
  Home,
  Library,
  LifeBuoy,
  LogOut,
  MessagesSquare,
  MonitorPlay,
  MoreHorizontal,
  NotebookPen,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import { mono, kickerMini as kicker } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type SeccionId =
  | "inicio"
  | "cursos"
  | "catalogo"
  | "bitacora"
  | "ateneo"
  | "biblioteca"
  | "reportes"
  | "calculadoras"
  | "simuladores"
  | "dominio"
  | "certificados"
  | "calendario"
  | "pagos"
  | "ayuda";

export type ItemNav = {
  id: SeccionId;
  etiqueta: string;
  icono: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
  externo?: boolean;
};

export type GrupoNav = { titulo: string; items: ItemNav[] };

export type ShellData = {
  usuario: { nombre: string; matricula: string; programa: string };
  notificaciones: number;
  activo: SeccionId;
};

const GRUPOS: GrupoNav[] = [
  {
    titulo: "Aprender",
    items: [
      { id: "inicio", etiqueta: "Inicio", icono: Home },
      { id: "cursos", etiqueta: "Mis cursos", icono: BookOpen },
      { id: "catalogo", etiqueta: "Explorar", icono: Compass },
    ],
  },
  {
    titulo: "Mis casos y comunidad",
    items: [
      { id: "bitacora", etiqueta: "Mi bitácora", icono: NotebookPen, badge: "3" },
      { id: "ateneo", etiqueta: "Ateneo", icono: MessagesSquare, badge: "En vivo" },
      { id: "biblioteca", etiqueta: "Biblioteca de casos", icono: Library },
    ],
  },
  {
    titulo: "Mis herramientas",
    items: [
      { id: "reportes", etiqueta: "Mis reportes", icono: FileText },
      { id: "calculadoras", etiqueta: "Calculadoras", icono: Calculator },
      { id: "simuladores", etiqueta: "Simuladores", icono: MonitorPlay },
    ],
  },
  {
    titulo: "Mi progreso",
    items: [
      { id: "dominio", etiqueta: "Mi dominio", icono: Activity },
      { id: "certificados", etiqueta: "Certificados", icono: Award },
    ],
  },
];

const GRUPO_PIE: ItemNav[] = [
  { id: "calendario", etiqueta: "Calendario", icono: Calendar },
  { id: "pagos", etiqueta: "Pagos y facturación", icono: CreditCard, externo: true },
  { id: "ayuda", etiqueta: "Ayuda · WhatsApp", icono: LifeBuoy },
];

const ESENCIALES: SeccionId[] = ["inicio", "cursos", "bitacora", "ateneo"];

const MOCK: ShellData = {
  usuario: {
    nombre: "Dra. Sofía Ramírez",
    matricula: "MC-24-0387",
    programa: "Ultrasonografía Médica · 1000 h",
  },
  notificaciones: 3,
  activo: "bitacora",
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const focusDark =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sidebar)]";
const focusLight =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

/* ─────────────────────────── Lateral ─────────────────────────── */

function ItemLateral({
  item,
  activo,
  colapsado,
  onClick,
}: {
  item: ItemNav;
  activo: boolean;
  colapsado: boolean;
  onClick: () => void;
}) {
  const Icono = item.icono;
  return (
    <button
      type="button"
      onClick={onClick}
      title={colapsado ? item.etiqueta : undefined}
      aria-current={activo ? "page" : undefined}
      className={`group relative flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left transition-colors ${focusDark} ${
        activo ? "bg-white/12" : "hover:bg-white/8"
      } ${colapsado ? "justify-center px-0" : ""}`}
    >
      {activo && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      <Icono
        className={`h-[19px] w-[19px] shrink-0 ${activo ? "text-primary" : "text-white/70"}`}
        strokeWidth={1.75}
      />
      {!colapsado && (
        <>
          <span
            className={`min-w-0 flex-1 truncate text-[14px] ${
              activo ? "font-bold text-white" : "font-medium text-white/80"
            }`}
          >
            {item.etiqueta}
          </span>
          {item.externo && (
            <ArrowUpRight aria-hidden className="h-[15px] w-[15px] shrink-0 text-white/45" strokeWidth={1.75} />
          )}
          {item.badge && !item.externo && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                item.badge === "En vivo"
                  ? "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                  : `bg-primary text-[color:var(--sidebar)] ${mono}`
              }`}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
      {colapsado && item.badge && (
        <span aria-hidden className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
      )}
    </button>
  );
}

/* ─────────────────────────── Shell ─────────────────────────── */

export default function CampusShell({
  data = MOCK,
  children,
}: {
  data?: ShellData;
  children?: React.ReactNode;
}) {
  const { usuario, notificaciones } = data;
  const [activo, setActivo] = useState<SeccionId>(data.activo);
  const [colapsado, setColapsado] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const [masAbierto, setMasAbierto] = useState(false);
  const cuentaRef = useRef<HTMLDivElement>(null);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onNavigate = (id: SeccionId) => setActivo(id);
  const onSearch = (_q: string) => {};
  const onAbrirNotificaciones = () => {};
  const onCuenta = (_accion: "perfil" | "ajustes" | "salir") => setCuentaAbierta(false);
  const onSalirAPagos = () => {};
  /* ──────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!cuentaAbierta) return;
    const cerrar = (e: MouseEvent) => {
      if (cuentaRef.current && !cuentaRef.current.contains(e.target as Node)) setCuentaAbierta(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setCuentaAbierta(false);
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", esc);
    };
  }, [cuentaAbierta]);

  const navegar = (item: ItemNav) => {
    if (item.externo) {
      onSalirAPagos();
      return;
    }
    onNavigate(item.id);
    setMasAbierto(false);
  };

  const todos = [...GRUPOS.flatMap((g) => g.items), ...GRUPO_PIE];
  const inicialesUsuario = usuario.nombre
    .replace(/^(Dr\.|Dra\.)\s*/, "")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground antialiased">
      <div className="flex pt-[68px]">
        {/* ══════════ LATERAL (bajo la barra superior) ══════════ */}
        <aside
          className={`sticky top-[68px] hidden h-[calc(100dvh-68px)] shrink-0 flex-col bg-sidebar transition-[width] duration-300 ease-out lg:flex ${
            colapsado ? "w-[76px]" : "w-[264px]"
          }`}
        >
          {/* secciones */}
          <nav aria-label="Secciones del campus" className="flex-1 overflow-y-auto px-3 py-4">
            {GRUPOS.map((g, i) => (
              <div key={g.titulo} className={i > 0 ? "mt-6" : ""}>
                {colapsado ? (
                  i > 0 && <div aria-hidden className="mx-auto mb-3 h-px w-8 bg-white/12" />
                ) : (
                  <p className={`${kicker} mb-2 px-3 text-[color:var(--hero-ink-muted)]`}>{g.titulo}</p>
                )}
                <div className="flex flex-col gap-1">
                  {g.items.map((item) => (
                    <ItemLateral
                      key={item.id}
                      item={item}
                      activo={activo === item.id}
                      colapsado={colapsado}
                      onClick={() => navegar(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* pie discreto: utilidades y salida al ERP */}
          <div className="shrink-0 border-t border-white/10 px-3 py-3">
            <div className="flex flex-col gap-1">
              {GRUPO_PIE.map((item) => (
                <ItemLateral
                  key={item.id}
                  item={item}
                  activo={activo === item.id}
                  colapsado={colapsado}
                  onClick={() => navegar(item)}
                />
              ))}
            </div>
            {!colapsado && (
              <p className={`${mono} mt-3 px-3 text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--hero-ink-muted)]`}>
                Pagos abre el portal del ERP
              </p>
            )}
            <button
              type="button"
              onClick={() => setColapsado((v) => !v)}
              aria-label={colapsado ? "Expandir el menú" : "Colapsar el menú"}
              aria-pressed={colapsado}
              className={`mt-3 flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-semibold text-white/60 transition-colors hover:bg-white/8 hover:text-white ${focusDark} ${
                colapsado ? "justify-center px-0" : ""
              }`}
            >
              {colapsado ? (
                <ChevronsRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
              ) : (
                <>
                  <ChevronsLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  Modo lectura
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ══════════ COLUMNA PRINCIPAL ══════════ */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* ───── SUPERIOR · fija, a todo lo ancho ───── */}
          <header className="fixed inset-x-0 top-0 z-30 flex h-[68px] items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
            {/* marca: vive aquí, no en el lateral */}
            <div className="flex shrink-0 items-center gap-3 lg:w-[240px]">
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-sidebar text-[14px] font-extrabold text-sidebar-foreground"
              >
                MC
              </span>
              <span className="hidden min-w-0 leading-tight sm:block">
                <span className="block truncate text-[14px] font-bold">Médica</span>
                <span className="block truncate text-[11px] font-semibold text-muted-foreground">
                  Campus Virtual
                </span>
              </span>
            </div>

            {/* búsqueda global */}
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                onSearch("");
              }}
              className="mx-auto min-w-0 flex-1 lg:max-w-[440px]"
            >
              <label className="flex h-11 items-center gap-2.5 rounded-full border border-border bg-muted px-4 transition-colors focus-within:border-secondary focus-within:bg-card">
                <Search aria-hidden className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="sr-only">Búsqueda global</span>
                <input
                  type="search"
                  placeholder="Buscar cursos, casos o temas…"
                  className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                <kbd
                  className={`${mono} hidden h-6 shrink-0 items-center rounded-[6px] border border-border bg-card px-1.5 text-[10.5px] text-muted-foreground sm:inline-flex`}
                >
                  ⌘K
                </kbd>
              </label>
            </form>

            {/* utilidades */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onAbrirNotificaciones}
                aria-label={`Notificaciones${notificaciones ? `: ${notificaciones} sin leer` : ""}`}
                className={`relative grid h-11 w-11 place-items-center rounded-full text-foreground transition-colors hover:bg-accent ${focusLight}`}
              >
                <Bell aria-hidden className="h-[19px] w-[19px]" strokeWidth={1.75} />
                {notificaciones > 0 && (
                  <span
                    aria-hidden
                    className={`absolute right-1.5 top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-[color:var(--sidebar)] ${mono}`}
                  >
                    {notificaciones}
                  </span>
                )}
              </button>

              {/* cuenta */}
              <div className="relative" ref={cuentaRef}>
                <button
                  type="button"
                  onClick={() => setCuentaAbierta((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={cuentaAbierta}
                  className={`flex h-11 items-center gap-2.5 rounded-full pl-1 pr-1 transition-colors hover:bg-accent sm:pr-3 ${focusLight}`}
                >
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar text-[12.5px] font-bold text-sidebar-foreground"
                  >
                    {inicialesUsuario}
                  </span>
                  <span className="hidden min-w-0 text-left leading-tight sm:block">
                    <span className="block truncate text-[13px] font-bold">{usuario.nombre}</span>
                    <span className={`block truncate text-[10.5px] text-muted-foreground ${mono}`}>
                      {usuario.matricula}
                    </span>
                  </span>
                </button>

                {cuentaAbierta && (
                  <div
                    role="menu"
                    aria-label="Menú de cuenta"
                    className="absolute right-0 top-[calc(100%+8px)] w-[248px] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-[0_12px_32px_rgba(17,24,39,0.14)]"
                  >
                    <div className="px-3 py-2.5">
                      <p className="text-[13.5px] font-bold">{usuario.nombre}</p>
                      <p className={`mt-0.5 text-[11px] text-muted-foreground ${mono}`}>
                        {usuario.matricula}
                      </p>
                    </div>
                    <div aria-hidden className="mx-1 my-1 h-px bg-border" />
                    {[
                      { id: "perfil" as const, etiqueta: "Mi perfil", icono: User },
                      { id: "ajustes" as const, etiqueta: "Ajustes", icono: Settings },
                    ].map(({ id, etiqueta, icono: Icono }) => (
                      <button
                        key={id}
                        type="button"
                        role="menuitem"
                        onClick={() => onCuenta(id)}
                        className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors hover:bg-accent ${focusLight}`}
                      >
                        <Icono className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
                        {etiqueta}
                      </button>
                    ))}
                    <div aria-hidden className="mx-1 my-1 h-px bg-border" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onCuenta("salir")}
                      className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[14px] font-semibold text-secondary transition-colors hover:bg-accent ${focusLight}`}
                    >
                      <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ───── SLOT DE CONTENIDO ─────
              Sin contenedor: cada pantalla define su propio ancho (así los héroes
              full-bleed pueden sangrar, y el contenido normal se topa a 1240px). */}
          <main className="min-w-0 flex-1 pb-24 lg:pb-10">
            {children ?? (
              <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-6 lg:px-8">
                <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-border bg-card">
                  <p className={`${mono} text-[11px] uppercase tracking-[0.16em] text-muted-foreground`}>
                    área de contenido · {todos.find((t) => t.id === activo)?.etiqueta}
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ══════════ MÓVIL · bottom-nav de 5 ══════════ */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto flex max-w-[460px] items-stretch gap-1 px-2 py-1.5">
          {ESENCIALES.map((id) => {
            const item = todos.find((t) => t.id === id)!;
            const Icono = item.icono;
            const on = activo === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => navegar(item)}
                aria-current={on ? "page" : undefined}
                className={`flex h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[10px] transition-colors ${
                  on ? "bg-accent" : ""
                }`}
              >
                <span className="relative">
                  <Icono
                    className={`h-[21px] w-[21px] ${on ? "text-secondary" : "text-muted-foreground"}`}
                    strokeWidth={1.75}
                  />
                  {item.badge && !on && (
                    <span aria-hidden className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </span>
                <span
                  className={`text-[10.5px] leading-none ${
                    on ? "font-bold text-secondary" : "font-medium text-muted-foreground"
                  }`}
                >
                  {item.etiqueta.replace("Mi ", "").replace("Mis ", "")}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMasAbierto(true)}
            aria-expanded={masAbierto}
            className="flex h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[10px]"
          >
            <span
              aria-hidden
              className="grid h-[21px] w-[21px] place-items-center rounded-full bg-sidebar text-[9px] font-bold text-sidebar-foreground"
            >
              {inicialesUsuario}
            </span>
            <span className="text-[10.5px] font-medium leading-none text-muted-foreground">Perfil</span>
          </button>
        </div>
      </nav>

      {/* Hoja "Más": el resto de las secciones + cuenta */}
      {masAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setMasAbierto(false)}
            className="absolute inset-0 bg-[color:var(--sidebar)]/55"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[18px] border-t border-border bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sidebar text-[13px] font-bold text-sidebar-foreground"
              >
                {inicialesUsuario}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold">{usuario.nombre}</p>
                <p className={`truncate text-[11px] text-muted-foreground ${mono}`}>{usuario.matricula}</p>
              </div>
              <button
                type="button"
                onClick={() => setMasAbierto(false)}
                aria-label="Cerrar"
                className={`grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-accent ${focusLight}`}
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {[...GRUPOS.flatMap((g) => g.items).filter((i) => !ESENCIALES.includes(i.id)), ...GRUPO_PIE].map(
                (item) => {
                  const Icono = item.icono;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navegar(item)}
                      className={`flex h-[60px] items-center gap-3 rounded-[12px] border border-border bg-card px-3.5 text-left transition-colors hover:bg-accent ${focusLight}`}
                    >
                      <Icono className="h-[19px] w-[19px] shrink-0 text-secondary" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-tight">
                        {item.etiqueta}
                      </span>
                      {item.externo && (
                        <ArrowUpRight
                          aria-hidden
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          strokeWidth={1.75}
                        />
                      )}
                    </button>
                  );
                },
              )}
            </div>

            <div aria-hidden className="my-4 h-px bg-border" />
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => onCuenta("ajustes")}
                className={`flex h-11 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors hover:bg-accent ${focusLight}`}
              >
                <Settings className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
                Ajustes
              </button>
              <button
                type="button"
                onClick={() => onCuenta("salir")}
                className={`flex h-11 items-center gap-3 rounded-[10px] px-3 text-[14px] font-semibold text-secondary transition-colors hover:bg-accent ${focusLight}`}
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nota de implementación: en App Router este componente va en app/(campus)/layout.tsx
          envolviendo {children}; MoreHorizontal queda disponible si se prefiere un ícono
          genérico en lugar del avatar para el 5º slot. */}
      <span className="hidden">
        <MoreHorizontal />
      </span>
    </div>
  );
}
