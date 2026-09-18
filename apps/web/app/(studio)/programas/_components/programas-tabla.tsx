'use client';

/**
 * Studio · Programas — tabla del course builder (§5B). Un PROGRAMA es la plantilla
 * viva (temario, módulos, horas); los grupos son instancias y viven en su área.
 * Tabla, no galería: el diseñador compara por estado, módulos, horas y grupos que
 * derivan — se lee mejor en columnas, con las cifras en mono. Datos reales por RLS;
 * "Nuevo programa" es una server action que crea el borrador y abre su builder.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { mono, softText, focusRing } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import type { EstadoPrograma, ProgramaResumen } from '@/lib/studio/datos';
import { crearPrograma } from '@/lib/studio/acciones';

const ESTADO: Record<EstadoPrograma, { texto: string; clase: string }> = {
  publicado: { texto: 'Publicado', clase: 'bg-accent text-accent-foreground' },
  borrador: {
    texto: 'Borrador',
    clase:
      'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  },
};

function ChipEstado({ estado }: { estado: EstadoPrograma }) {
  const e = ESTADO[estado];
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${e.clase}`}
    >
      {e.texto}
    </span>
  );
}

export function ProgramasTabla({ programas }: { programas: ProgramaResumen[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | EstadoPrograma>('todos');
  const [creando, iniciarCreacion] = useTransition();

  const conteos = useMemo(
    () => ({
      todos: programas.length,
      publicado: programas.filter((p) => p.estado === 'publicado').length,
      borrador: programas.filter((p) => p.estado === 'borrador').length,
    }),
    [programas],
  );

  const visibles = useMemo(
    () =>
      programas.filter(
        (p) =>
          (filtro === 'todos' || p.estado === filtro) &&
          (!busca.trim() || p.nombre.toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [programas, filtro, busca],
  );

  const horasTotales = programas.reduce((s, p) => s + p.horas, 0);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Programas</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            La plantilla viva de cada temario. Los grupos derivan de aquí.
          </p>
        </div>
        <button
          type="button"
          onClick={() => iniciarCreacion(() => crearPrograma())}
          disabled={creando}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          {creando ? 'Creando…' : 'Nuevo programa'}
        </button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[320px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar programa</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar programa…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ['todos', 'Todos'],
              ['publicado', 'Publicados'],
              ['borrador', 'Borradores'],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                filtro === id
                  ? 'bg-sidebar text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span
                className={`${mono} font-bold ${filtro === id ? 'text-white/70' : 'text-muted-foreground'}`}
              >
                {conteos[id]}
              </span>
            </button>
          ))}
        </div>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {programas.length} programas · {horasTotales.toLocaleString('es-MX')} h en total
        </span>
      </div>

      {/* tabla */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {(
                [
                  ['Programa', 'left'],
                  ['Estado', 'left'],
                  ['Módulos', 'right'],
                  ['Horas', 'right'],
                  ['Grupos', 'right'],
                  ['Última edición', 'left'],
                  ['', 'right'],
                ] as const
              ).map(([t, a], i) => (
                <th
                  key={t || `col-${i}`}
                  style={{ textAlign: a }}
                  className="whitespace-nowrap px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((p, i) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-0">
                  <button
                    type="button"
                    onClick={() => router.push(`/programas/${p.id}`)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className={`${mono} grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted text-[11px] font-bold text-muted-foreground`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold leading-snug">{p.nombre}</span>
                      <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                        {p.horas} h · v{p.version}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <ChipEstado estado={p.estado} />
                </td>
                <td className={`${mono} px-4 py-3.5 text-right text-[13px] font-semibold`}>
                  {p.modulos}
                </td>
                <td className={`${mono} px-4 py-3.5 text-right text-[13px] font-semibold`}>
                  {p.horas} h
                </td>
                <td className="px-4 py-3.5 text-right">
                  {p.gruposActivos > 0 ? (
                    <span
                      className={`inline-flex h-[26px] items-center gap-1.5 rounded-full bg-muted px-2.5 text-[12px] font-semibold ${softText}`}
                    >
                      <span className={`${mono} font-bold`}>{p.gruposActivos}</span>
                      activos
                    </span>
                  ) : (
                    <span className={`${mono} text-[12px] text-muted-foreground`}>—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-muted-foreground">
                  {haceCuanto(p.actualizado)}
                </td>
                <td className="px-3 py-3.5 text-right">
                  <button
                    type="button"
                    aria-label={`Más acciones de ${p.nombre}`}
                    className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                  >
                    <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibles.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-[15px] font-bold">
              {programas.length === 0 ? 'Aún no hay programas' : 'Ningún programa con ese filtro'}
            </p>
            <p className={`mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed ${softText}`}>
              {programas.length === 0
                ? 'Crea el primer programa para empezar a construir su temario.'
                : 'Quita el filtro de estado o crea el programa que falta.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
