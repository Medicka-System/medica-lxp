'use client';

/**
 * Studio · Programas — ORIGEN CORA (espejo read-only · PUENTE 1).
 *
 * Lista TODOS los programas de CORA (vía `lxp.cora_programas_catalogo`), identificados por
 * su `cora_programa_id`. SIN crear ni vincular nada a mano: cada programa muestra SUS grupos
 * ya vinculados (los de CORA) con su conteo de alumnos. El diseñador solo construye CONTENIDO
 * sobre uno: "Construir/Abrir contenido" provisiona IDEMPOTENTEMENTE el shell LXP
 * (`abrirProgramaCora`) y abre su builder. CORA es solo lectura aquí (§10).
 */

import { useMemo, useState, useTransition } from 'react';
import { GraduationCap, Hammer, Search, Users } from 'lucide-react';
import { mono, softText, focusRing } from '@/lib/studio/estilos';
import { fechaCorta } from '@/lib/format';
import type { ProgramaCoraResumen } from '@/lib/studio/datos';
import { abrirProgramaCora } from '@/lib/studio/acciones';

const MODALIDAD: Record<string, string> = {
  online: 'En línea',
  presencial: 'Presencial',
  hibrida: 'Híbrida',
};

function rango(inicio: Date | null, fin: Date | null): string {
  if (!inicio && !fin) return 'Sin fechas';
  return `${inicio ? fechaCorta(inicio) : '—'} – ${fin ? fechaCorta(fin) : '—'}`;
}

function TarjetaPrograma({ p }: { p: ProgramaCoraResumen }) {
  const [abriendo, iniciar] = useTransition();
  const conShell = p.lxpProgramaId !== null;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
      <div className="flex flex-wrap items-start gap-3 border-b border-border px-5 py-4">
        <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-secondary">
          <GraduationCap className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold leading-snug">{p.nombre}</p>
          <p className={`${mono} mt-0.5 text-[11.5px] text-muted-foreground`}>{p.identificador}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {conShell ? (
              <span
                className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold ${
                  p.publicado ? 'bg-accent text-accent-foreground' : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                }`}
              >
                {p.publicado ? 'Publicado' : 'Borrador'} · {p.modulos} {p.modulos === 1 ? 'módulo' : 'módulos'}
              </span>
            ) : (
              <span className="inline-flex h-6 items-center rounded-full border border-border bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                Sin contenido aún
              </span>
            )}
            <span className={`inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-[11px] font-semibold ${softText}`}>
              <Users aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              <span className={`${mono} font-bold`}>{p.grupos.length}</span>
              {p.grupos.length === 1 ? 'grupo' : 'grupos'} · <span className={`${mono} font-bold`}>{p.alumnos}</span> alumnos
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => iniciar(() => abrirProgramaCora(p.coraProgramaId))}
          disabled={abriendo}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] px-4 text-[13px] font-bold transition-colors disabled:opacity-60 ${
            conShell
              ? `border border-border bg-card ${softText} hover:bg-muted`
              : 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
          } ${focusRing}`}
        >
          <Hammer aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          {abriendo ? 'Abriendo…' : conShell ? 'Abrir contenido' : 'Construir contenido'}
        </button>
      </div>

      {/* Grupos de CORA ya vinculados (read-only, a la vista) */}
      {p.grupos.length > 0 ? (
        <ul className="divide-y divide-border">
          {p.grupos.map((g) => (
            <li key={g.coraGrupoId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{g.nombre}</span>
              <span className={`inline-flex h-6 items-center rounded-full border border-border bg-muted px-2.5 text-[11px] font-semibold ${softText}`}>
                {g.modalidad ? MODALIDAD[g.modalidad] ?? g.modalidad : '—'}
              </span>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>{rango(g.fechaInicio, g.fechaFin)}</span>
              <span className={`${mono} inline-flex items-center gap-1.5 text-[12px] font-semibold ${g.alumnos > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                <Users aria-hidden className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                {g.alumnos}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`px-5 py-3 text-[12px] ${softText}`}>Sin grupos en CORA todavía.</p>
      )}
    </article>
  );
}

export function ProgramasCora({ programas }: { programas: ProgramaCoraResumen[] }) {
  const [busca, setBusca] = useState('');
  const visibles = useMemo(
    () =>
      programas.filter(
        (p) =>
          !busca.trim() ||
          p.nombre.toLowerCase().includes(busca.trim().toLowerCase()) ||
          p.identificador.toLowerCase().includes(busca.trim().toLowerCase()),
      ),
    [programas, busca],
  );
  const totalGrupos = programas.reduce((s, p) => s + p.grupos.length, 0);
  const totalAlumnos = programas.reduce((s, p) => s + p.alumnos, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h2 className="text-[18px] font-extrabold leading-tight tracking-[-0.02em]">Programas de CORA</h2>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Todos los programas de CORA, con sus grupos ya vinculados. Construye contenido sobre el que elijas — no hay nada que vincular a mano.
          </p>
        </div>
        <span className={`${mono} text-[12px] text-muted-foreground`}>
          {programas.length} programas · {totalGrupos} grupos · {totalAlumnos.toLocaleString('es-MX')} alumnos
        </span>
      </div>

      <label className="flex h-10 w-[320px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
        <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="sr-only">Buscar programa de CORA</span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar programa de CORA…"
          className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      {visibles.length > 0 ? (
        <div className="flex flex-col gap-4">
          {visibles.map((p) => (
            <TarjetaPrograma key={p.coraProgramaId} p={p} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card px-6 py-14 text-center">
          <p className="text-[15px] font-bold">
            {programas.length === 0 ? 'No hay programas de CORA' : 'Ningún programa con esa búsqueda'}
          </p>
          <p className={`mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed ${softText}`}>
            {programas.length === 0
              ? 'Cuando CORA tenga programas activos, aparecerán aquí automáticamente.'
              : 'Prueba con otro término.'}
          </p>
        </div>
      )}
    </div>
  );
}
