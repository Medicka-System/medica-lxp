/**
 * Interior del curso · tipos y piezas compartidas.
 * Lo usan las 5 secciones: Contenido · Tareas · Foros · Calificaciones · Alumnos
 * (y las subpáginas Historial de envíos y Comentarios).
 * Solo tokens de globals.css; sin hex. Los datos llegan por props desde el servidor
 * (RLS `comoAlumno`, §2); aquí no hay datos de ejemplo.
 */

import type { ReactNode } from 'react';
import { Avatar as AvatarBase } from '@/components/avatar';

/* ───────────── estilo ───────────── */
export const mono = 'font-mono tabular-nums';
export const kicker = 'text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground';
export const th = 'text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap';
export const softText = 'text-[color:var(--foreground-soft)]';
export const card = 'rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]';
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

export type Tono = 'ok' | 'warn' | 'neutro' | 'info' | 'navy';
const TONO: Record<Tono, string> = {
  ok: 'bg-accent text-accent-foreground',
  warn: 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  neutro: 'border border-border bg-muted text-muted-foreground',
  info: 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
  navy: 'bg-sidebar text-sidebar-foreground',
};
export function Chip({ tono, icono, children }: { tono: Tono; icono?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${TONO[tono]}`}>
      {icono}
      {children}
    </span>
  );
}

/**
 * Avatar del curso — usa el componente unificado (foto + fallback a iniciales, §5A).
 * `staff` se acepta por compatibilidad de las secciones, pero el avatar unificado ya
 * es navy; el rol se distingue con su chip.
 */
export function Avatar({ ini, url, size = 36 }: { ini: string; url?: string | null; size?: number; staff?: boolean }) {
  return <AvatarBase ini={ini} url={url} size={size} />;
}

/** Segmentado de filtro: activo navy, con conteo opcional en mono. */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: { id: T; etiqueta: string; n?: number }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-[3px]">
      {opciones.map((o) => {
        const on = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onCambio(o.id)}
            className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
              on ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {o.etiqueta}
            {o.n !== undefined && <span className={`${mono} font-bold ${on ? 'text-white/70' : ''}`}>{o.n}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Cabecera de página: contexto (o migas) · H1 · subtítulo · acciones a la derecha. */
export function CabeceraPagina({
  titulo,
  sub,
  acciones,
  migas,
  contexto = '',
}: {
  titulo: string;
  sub?: string;
  acciones?: ReactNode;
  migas?: { etiqueta: string; href?: string }[];
  contexto?: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0">
        {migas ? (
          <nav aria-label="Migas" className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            {migas.map((m, i) => (
              <span key={m.etiqueta} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>›</span>}
                {m.href ? (
                  <a href={m.href} className="font-semibold text-secondary no-underline">
                    {m.etiqueta}
                  </a>
                ) : (
                  <span>{m.etiqueta}</span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          contexto && <p className={`${kicker} mb-2`}>{contexto}</p>
        )}
        <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{titulo}</h1>
        {sub && <p className={`mt-1.5 text-[13.5px] ${softText}`}>{sub}</p>}
      </div>
      {acciones && <div className="ml-auto flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

export function BotonSec({ icono, children, onClick }: { icono?: ReactNode; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
    >
      {icono}
      {children}
    </button>
  );
}

/* ───────────── tipos (forma de los datos que arman las secciones) ───────────── */

export type EstadoModulo = 'completado' | 'actual' | 'en-curso' | 'por-empezar' | 'bloqueado';
export type Modulo = {
  id: string;
  numero?: number; // si no hay, es Inicio / Preliminar / Cierre y lleva ícono
  icono?: 'bombilla' | 'entrada' | 'birrete';
  kicker: string;
  titulo: string;
  meta: string;
  hechos: number;
  total: number;
  estado: EstadoModulo;
  /** origen del degradado de la banda, p. ej. "20% 0%" — distinto por módulo */
  luz: string;
  portadaUrl?: string;
};

export type EstadoEntrega = 'enviada' | 'pendiente' | 'no-disponible';
export type Tarea = {
  id: string;
  clave: string;
  descripcion: string;
  vence: string;
  ventana: string;
  estado: EstadoEntrega;
  envios: number;
  archivos: number;
  diasParaVencer?: number;
  puntos?: number;
  puntosMax: number;
  comentarios: 'sin-leer' | 'leidos' | 'ninguno';
};

export type Envio = { id: string; archivo: string; peso: string; fecha: string; estado: 'calificado' | 'reemplazado' | 'recibido' };

export type Nivel = { puntos: number; texto: string };
export type Criterio = { id: string; nombre: string; niveles: Nivel[]; elegido: number };
export type Rubrica = { titulo: string; niveles: string[]; criterios: Criterio[] };

export type Respuesta = { id: string; ini: string; autor: string; docente?: boolean; texto: string; cuando: string; nivel: 0 | 1 | 2 };
export type ForoParticipado = {
  id: string;
  leccion: string;
  titulo: string;
  resumen: string;
  nuevas: number;
  miPublicacion?: { texto: string; cuando: string };
  hilo?: Respuesta[];
};

export type TipoCalificable = 'tarea' | 'foro' | 'autoevaluacion' | 'caso';
export type Calificacion = {
  id: string;
  clave: string;
  descripcion: string;
  tipo: TipoCalificable;
  puntos: string;
  resultado: string;
  comentario?: string;
  tieneRubrica?: boolean;
  /** lección de la tarea con rúbrica (para enlazar a Comentarios). */
  tareaId?: string;
};

export type RolGrupo = 'alumno' | 'tutor' | 'coordinacion' | 'control-escolar';
export type Integrante = {
  id: string;
  ini: string;
  nombre: string;
  rol: RolGrupo;
  detalle: string;
  enLinea: boolean;
  ultima: string;
  avatarUrl?: string | null;
};
