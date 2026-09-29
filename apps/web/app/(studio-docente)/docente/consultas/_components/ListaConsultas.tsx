'use client';

/**
 * Columna 1 · las consultas dirigidas al docente (alumnos + staff · §5B): buscador,
 * filtro Sin responder / Todas y por grupo. Cada fila: avatar, nombre, chip de grupo (o
 * «Staff»), módulo en curso, extracto, hora y estado. Lo no respondido va en ámbar (chip
 * + fondo cálido); lo respondido con palomita teal; lo cerrado, apagado.
 */

import { Check, ChevronDown, Lock, Plus, Search } from 'lucide-react';
import { mono, softText, focusRing, Avatar } from './ui';
import type { ConsultaResumen } from '../../../_lib/contrato';

const kicker = 'text-[10.5px] font-semibold uppercase tracking-[0.14em]';

export type ListaConsultasProps = {
  sinResponder: number;
  grupos: string[];
  grupoFiltro: string | null;
  setGrupoFiltro: (g: string | null) => void;
  activaId: string | null;
  filtro: 'sin-responder' | 'todas';
  setFiltro: (f: 'sin-responder' | 'todas') => void;
  busca: string;
  setBusca: (v: string) => void;
  onAbrir: (id: string) => void;
  onNueva: () => void;
  visibles: ConsultaResumen[];
};

export function ListaConsultas({
  sinResponder,
  grupos,
  grupoFiltro,
  setGrupoFiltro,
  activaId,
  filtro,
  setFiltro,
  busca,
  setBusca,
  onAbrir,
  onNueva,
  visibles,
}: ListaConsultasProps) {
  return (
    <aside className="flex w-[330px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <div className="shrink-0 border-b border-border p-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className={`${kicker} text-muted-foreground`}>Consultas</h2>
          {sinResponder > 0 && (
            <span className="inline-flex h-5 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-[7px] text-[10px] font-bold text-[color:var(--warning-foreground)]">
              {sinResponder} sin responder
            </span>
          )}
          <button
            type="button"
            onClick={onNueva}
            className={`ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-primary px-2.5 text-[12px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
            Nueva
          </button>
        </div>

        <label className="mt-2.5 flex h-[38px] items-center gap-2 rounded-[9px] border border-border bg-muted px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar alumno o tema</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar alumno o tema…"
            className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-2.5 flex gap-1.5">
          {(
            [
              ['sin-responder', 'Sin responder'],
              ['todas', 'Todas'],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`h-8 flex-1 rounded-lg text-[11.5px] font-semibold transition-colors ${focusRing} ${
                filtro === id
                  ? 'bg-sidebar text-sidebar-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
            </button>
          ))}
          {grupos.length > 0 && (
            <label
              className={`relative inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border bg-card px-2.5 text-[11.5px] font-semibold ${softText} ${
                grupoFiltro ? 'border-secondary text-secondary' : 'border-border'
              } focus-within:ring-2 focus-within:ring-secondary focus-within:ring-offset-2 focus-within:ring-offset-card`}
            >
              <span className="sr-only">Filtrar por grupo</span>
              {grupoFiltro ? grupoFiltro.split(' · ')[0] : 'Grupo'}
              <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
              <select
                value={grupoFiltro ?? ''}
                onChange={(e) => setGrupoFiltro(e.target.value || null)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="">Todos los grupos</option>
                {grupos.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibles.length === 0 ? (
          <p className={`px-4 py-8 text-center text-[12.5px] ${softText}`}>
            No hay consultas aquí. Cuando un alumno o el staff le escriba, aparecerá en esta lista.
          </p>
        ) : (
          visibles.map((c) => {
            const on = c.id === activaId;
            const sin = c.estado === 'sin-responder';
            const cerrada = c.estado === 'cerrada';
            const esAlumno = c.contraparte.tipo === 'alumno';
            const chip = esAlumno ? c.contraparte.grupo?.split(' · ')[0] ?? 'Sin grupo' : 'Staff';
            const sub = esAlumno
              ? c.contraparte.moduloEnCurso ?? ''
              : c.contraparte.contexto.replace(/^Staff · /, '');
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onAbrir(c.id)}
                aria-current={on ? 'true' : undefined}
                className={`flex w-full gap-3 border-b border-l-[3px] border-b-border px-3.5 py-3.5 text-left transition-colors ${focusRing} ${
                  on
                    ? 'border-l-primary bg-accent'
                    : `border-l-transparent hover:bg-muted ${sin ? 'bg-[#fffdf7]' : ''}`
                }`}
              >
                <Avatar ini={c.contraparte.ini} url={c.contraparte.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold leading-snug">
                      {c.contraparte.nombre}
                    </span>
                    <span className={`${mono} shrink-0 text-[10.5px] text-muted-foreground`}>{c.hora}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-flex h-[18px] items-center whitespace-nowrap rounded-full border border-border bg-muted px-1.5 text-[9.5px] font-semibold ${softText}`}
                    >
                      {chip}
                    </span>
                    {sub && <span className={`${mono} truncate text-[9.5px] text-muted-foreground`}>{sub}</span>}
                    {sin ? (
                      <span className="ml-auto inline-flex h-[18px] items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
                        Sin responder
                      </span>
                    ) : cerrada ? (
                      <span className="ml-auto inline-flex h-[18px] items-center gap-1 whitespace-nowrap rounded-full bg-muted px-1.5 text-[9.5px] font-bold text-muted-foreground">
                        <Lock aria-hidden className="h-2.5 w-2.5" strokeWidth={2} /> Cerrada
                      </span>
                    ) : (
                      <Check aria-hidden className="ml-auto h-3.5 w-3.5 text-secondary" strokeWidth={2.6} />
                    )}
                  </span>
                  <span
                    className={`mt-1.5 line-clamp-2 block text-[12px] leading-snug ${softText} ${sin ? 'font-medium' : ''}`}
                  >
                    {c.ultimoMensaje}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
