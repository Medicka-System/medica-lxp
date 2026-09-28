'use client';

/**
 * Piezas compartidas de la Cuenta (§5A · §2 de la spec de /perfil y /ajustes).
 * Todo sale de tokens semánticos (globals.css); sin hex salvo las miniaturas de
 * tema (§4.3, en AjustesSecciones). Foco visible en cada control.
 */

import { mono } from '@/components/tokens';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

// ── Tarjeta ──────────────────────────────────────────────────────────────────
export function Tarjeta({
  titulo,
  nota,
  accion,
  children,
  className = '',
  anclarRef,
  id,
}: {
  titulo: string;
  nota?: React.ReactNode;
  accion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  anclarRef?: (el: HTMLElement | null) => void;
  id?: string;
}) {
  return (
    <section
      id={id}
      ref={anclarRef}
      className={`rounded-xl border border-border bg-card p-5 shadow-rest ${className}`}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="text-[15px] font-bold text-foreground">{titulo}</h2>
        {nota && <span className="text-[11.5px] text-muted-foreground">{nota}</span>}
        {accion && <div className="ml-auto">{accion}</div>}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ── Switch (interruptor atómico) ─────────────────────────────────────────────
export function Switch({
  encendido,
  onCambio,
  etiqueta,
  bloqueado = false,
}: {
  encendido: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string;
  bloqueado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      disabled={bloqueado}
      onClick={() => onCambio(!encendido)}
      className={`relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-full transition-colors motion-reduce:transition-none ${focus} ${
        encendido ? 'bg-primary' : 'bg-[color:var(--track)]'
      } ${bloqueado ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span
        aria-hidden
        className={`inline-block h-[18px] w-[18px] rounded-full bg-card shadow-[0_1px_2px_rgba(17,24,39,0.25)] transition-transform motion-reduce:transition-none ${
          encendido ? 'translate-x-[21px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

// ── Interruptor (fila título/detalle + Switch) ───────────────────────────────
export function Interruptor({
  titulo,
  detalle,
  encendido,
  onCambio,
  primera = false,
  bloqueado = false,
}: {
  titulo: string;
  detalle?: string;
  encendido: boolean;
  onCambio: (v: boolean) => void;
  primera?: boolean;
  bloqueado?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 py-3.5 ${primera ? '' : 'border-t border-border'}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-foreground">{titulo}</p>
        {detalle && <p className="mt-0.5 text-[12px] text-muted-foreground">{detalle}</p>}
      </div>
      <Switch encendido={encendido} onCambio={onCambio} etiqueta={titulo} bloqueado={bloqueado} />
    </div>
  );
}

// ── Campo (label + control + nota) ───────────────────────────────────────────
export function Campo({
  label,
  bloqueado = false,
  nota,
  children,
  className = '',
}: {
  label: string;
  bloqueado?: boolean;
  nota?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground-soft">
        {label}
        {bloqueado && (
          <span className={`inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground ${mono}`}>
            🔒 CORA
          </span>
        )}
      </span>
      <div className="mt-1.5">{children}</div>
      {nota && <span className="mt-1 block text-[11.5px] text-muted-foreground">{nota}</span>}
    </label>
  );
}

/** Estilo base de input de 44 px (§ geometría). */
export const inputBase =
  'h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1 focus-visible:ring-offset-card';

// ── Avatar (iniciales sobre teal, tinta navy · o foto) ───────────────────────
export function AvatarPerfil({
  ini,
  url,
  size = 96,
  anillo = false,
}: {
  ini: string;
  url?: string | null;
  size?: number;
  anillo?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-extrabold text-[color:var(--sidebar)] ${
        anillo ? 'ring-4 ring-card shadow-[0_2px_10px_rgba(17,24,39,0.18)]' : ''
      }`}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={mono}>{ini}</span>
      )}
    </span>
  );
}

// ── Barra de progreso (6 px) ─────────────────────────────────────────────────
export function Barra({ valor, repaso = false }: { valor: number; repaso?: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--track)]">
      <div
        className={`h-full rounded-full ${repaso ? 'bg-amber-500' : 'bg-primary'}`}
        style={{ width: `${Math.max(0, Math.min(100, valor))}%` }}
      />
    </div>
  );
}
