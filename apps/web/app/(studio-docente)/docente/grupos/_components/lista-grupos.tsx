'use client';

/**
 * Listado de grupos del docente (seguimiento · §5B). Fiel al mock: cards con avance,
 * estado y RESUMEN DE INTERVENCIÓN (quién y por qué, o la declaración explícita del
 * grupo sano). Filtros Todos / Con riesgo / Al día. Banda + rail de Eco (placeholder).
 *
 * Datos REALES del roster de CORA (getGruposSeguimiento). Un solo color de atención:
 * ÁMBAR. El violeta es Eco (§5A).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Sparkles, TriangleAlert } from 'lucide-react';
import { mono, softText, focusRing } from '@/lib/studio/estilos';
import { fechaCorta } from '@/lib/format';
import type { EstadoGrupo, GrupoSeguimientoCard } from '../_lib/contrato';
import { PanelEco } from './panel-eco';

type FiltroGrupos = 'todos' | 'riesgo' | 'al-dia';

const ESTADO: Record<EstadoGrupo, { texto: string; atencion: boolean }> = {
  'al-dia': { texto: 'Al día', atencion: false },
  'con-rezago': { texto: 'Con rezago', atencion: true },
  'requiere-atencion': { texto: 'Requiere atención', atencion: true },
};

export function ListaGrupos({
  grupos,
  resumenEco,
}: {
  grupos: GrupoSeguimientoCard[];
  resumenEco: string;
}) {
  const [filtro, setFiltro] = useState<FiltroGrupos>('todos');

  const totalAlumnos = grupos.reduce((s, g) => s + g.alumnos, 0);
  const totalRiesgo = grupos.reduce((s, g) => s + g.enRiesgo, 0);
  // El grupo que más atención necesita (para el CTA de la banda de Eco).
  const masEnRiesgo = grupos.find((g) => g.enRiesgo > 0) ?? grupos[0];

  const visibles = useMemo(
    () =>
      grupos.filter((g) =>
        filtro === 'riesgo' ? g.enRiesgo > 0 : filtro === 'al-dia' ? g.enRiesgo === 0 : true,
      ),
    [grupos, filtro],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-8 pt-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Mis grupos</h1>
          <span className={`${mono} text-[12px] text-muted-foreground`}>
            {grupos.length} grupos · {totalAlumnos} alumnos ·{' '}
            <span className={totalRiesgo > 0 ? 'text-[color:var(--warning-foreground)]' : ''}>
              {totalRiesgo} requieren intervención
            </span>
          </span>
          <div className="ml-auto flex gap-1 rounded-full border border-border bg-card p-[3px]">
            {(
              [
                ['todos', 'Todos'],
                ['riesgo', 'Con riesgo'],
                ['al-dia', 'Al día'],
              ] as const
            ).map(([id, etiqueta]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                aria-pressed={filtro === id}
                className={`h-[34px] whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                  filtro === id
                    ? 'bg-sidebar text-sidebar-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Banda de Eco — PLACEHOLDER: cruza los grupos antes de que el docente entre */}
        {masEnRiesgo && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-[18px] py-3.5">
            <span
              aria-hidden
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-foreground)] text-white"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
              <span className="font-bold">Eco revisó sus grupos:</span> {resumenEco}
            </p>
            {masEnRiesgo.enRiesgo > 0 && (
              <Link
                href={`/docente/grupos/${masEnRiesgo.id}`}
                className={`h-[38px] shrink-0 whitespace-nowrap rounded-[9px] bg-[color:var(--info-foreground)] px-3.5 text-[12.5px] font-bold leading-[38px] text-white transition-colors hover:bg-sidebar ${focusRing}`}
              >
                Ver el {masEnRiesgo.nombre.split(' (')[0]}
              </Link>
            )}
          </div>
        )}

        {grupos.length === 0 ? (
          <div className="mt-4 rounded-[14px] border border-border bg-card px-6 py-12 text-center shadow-rest">
            <p className="text-[14px] font-bold">Aún no tiene grupos asignados</p>
            <p className={`mt-1.5 text-[12.5px] ${softText}`}>El admin le asigna grupos desde el Studio.</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visibles.map((g) => {
              const est = ESTADO[g.estado];
              return (
                <li key={g.id}>
                  <article
                    className={`flex h-full flex-col rounded-[14px] border bg-card p-5 shadow-rest transition-colors hover:border-primary ${
                      est.atencion ? 'border-[color:var(--warning-border)]' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15.5px] font-bold leading-tight">{g.nombre}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {g.programa} · {g.modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${
                          est.atencion
                            ? 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                            : 'bg-accent text-accent-foreground'
                        }`}
                      >
                        {est.atencion ? (
                          <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2.2} />
                        ) : (
                          <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                        )}
                        {est.texto}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <span className="flex items-baseline gap-1.5">
                        <span className={`${mono} text-[24px] font-extrabold tracking-[-0.02em]`}>{g.alumnos}</span>
                        <span className="text-[11.5px] text-muted-foreground">
                          {g.alumnos === 1 ? 'alumno' : 'alumnos'}
                        </span>
                      </span>
                      <span aria-hidden className="h-[26px] w-px bg-border" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5">
                          <span className={`${mono} text-[24px] font-extrabold tracking-[-0.02em]`}>{g.avance}%</span>
                          <span className="text-[11.5px] text-muted-foreground">avance del grupo</span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${g.avance}%` }} />
                        </span>
                      </span>
                    </div>

                    {/* A quién atender: el silencio también se declara */}
                    <div
                      className={`mt-4 flex-1 rounded-[11px] px-3.5 py-3 ${
                        g.enRiesgo
                          ? 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {g.enRiesgo ? (
                          <TriangleAlert
                            aria-hidden
                            className="mt-px h-[15px] w-[15px] shrink-0 text-[color:var(--warning-foreground)]"
                            strokeWidth={2}
                          />
                        ) : (
                          <Check aria-hidden className="mt-px h-[15px] w-[15px] shrink-0 text-secondary" strokeWidth={2.4} />
                        )}
                        <p
                          className={`min-w-0 flex-1 text-[12.5px] leading-relaxed ${
                            g.enRiesgo ? 'text-[color:var(--warning-foreground)]' : softText
                          }`}
                        >
                          {g.enRiesgo ? (
                            <>
                              <span className="font-bold">
                                {g.enRiesgo} {g.enRiesgo === 1 ? 'alumno necesita' : 'alumnos necesitan'} intervención
                              </span>
                              <br />
                              {g.resumenRiesgo}
                            </>
                          ) : (
                            g.resumenRiesgo
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2.5">
                      <span className={`${mono} min-w-0 flex-1 text-[11px] text-muted-foreground`}>
                        {g.fechaInicio ? `inició ${fechaCorta(g.fechaInicio)}` : 'sin fecha'}
                        {g.moduloEnCurso ? ` · cursando ${g.moduloEnCurso.split(' · ')[0]}` : ''}
                      </span>
                      <Link
                        href={`/docente/grupos/${g.id}`}
                        className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-4 text-[13.5px] font-bold transition-colors ${focusRing} ${
                          g.enRiesgo
                            ? 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
                            : 'bg-accent text-accent-foreground hover:bg-[color:var(--track)]'
                        }`}
                      >
                        Ver el grupo
                        <ChevronRight aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <PanelEco resumen={resumenEco} />
    </div>
  );
}
