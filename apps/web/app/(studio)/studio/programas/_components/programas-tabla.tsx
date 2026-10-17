'use client';

/**
 * Studio · Programas — UNA sola lista (§5B · PUENTE 1), sin tab de origen.
 * Mezcla programas NATIVOS del LXP y el ESPEJO de CORA; cada fila lleva un CHIP de origen.
 * NADA de grupos anidados (los grupos viven en su propia vista). Acción por fila:
 *   • LXP            → abrir el builder (editar).
 *   • CORA con shell → "Abrir contenido" (abre el builder ya provisionado).
 *   • CORA sin shell → "Construir contenido" → `abrirProgramaCora` (shell idempotente).
 * "Nuevo programa" crea un programa NATIVO del LXP.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Hammer, Pencil, Plus, Search } from 'lucide-react';
import { mono, softText, focusRing } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import type { EstadoContenido, OrigenPrograma, ProgramaListaItem } from '@/lib/studio/datos';
import { abrirProgramaCora, crearPrograma } from '@/lib/studio/acciones';

const ESTADO: Record<EstadoContenido, { texto: string; clase: string }> = {
  publicado: { texto: 'Publicado', clase: 'bg-accent text-accent-foreground' },
  borrador: {
    texto: 'Borrador',
    clase: 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  },
  'sin-contenido': { texto: 'Sin contenido aún', clase: 'border border-border bg-muted text-muted-foreground' },
};

function ChipOrigen({ origen }: { origen: OrigenPrograma }) {
  return origen === 'cora' ? (
    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11px] font-bold text-secondary">
      <GraduationCap aria-hidden className="h-3 w-3" strokeWidth={1.75} />
      CORA
    </span>
  ) : (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-bold text-muted-foreground">
      LXP
    </span>
  );
}

export function ProgramasTabla({ programas }: { programas: ProgramaListaItem[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [origen, setOrigen] = useState<'todos' | OrigenPrograma>('todos');
  const [creando, iniciarCreacion] = useTransition();
  const [abriendo, iniciarApertura] = useTransition();

  const conteos = useMemo(
    () => ({
      todos: programas.length,
      cora: programas.filter((p) => p.origen === 'cora').length,
      lxp: programas.filter((p) => p.origen === 'lxp').length,
    }),
    [programas],
  );

  const visibles = useMemo(
    () =>
      programas.filter(
        (p) =>
          (origen === 'todos' || p.origen === origen) &&
          (!busca.trim() ||
            p.nombre.toLowerCase().includes(busca.trim().toLowerCase()) ||
            (p.slug ?? '').toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [programas, origen, busca],
  );

  // Abre la fila: LXP/CORA-con-shell → builder; CORA-sin-shell → provisiona shell y entra.
  const abrir = (p: ProgramaListaItem) => {
    if (p.lxpProgramaId) {
      router.push(`/studio/programas/${p.lxpProgramaId}`);
    } else if (p.coraProgramaId) {
      iniciarApertura(() => abrirProgramaCora(p.coraProgramaId!));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Programas</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Una sola lista: los de CORA (espejo) y los nativos del LXP. Construye contenido sobre cualquiera.
            Los grupos viven en su propia vista.
          </p>
        </div>
        <button
          type="button"
          onClick={() => iniciarCreacion(() => crearPrograma())}
          disabled={creando}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          {creando ? 'Creando…' : 'Nuevo programa (LXP)'}
        </button>
      </div>

      {/* filtros (origen = FILTRO dentro de la lista única, no un tab que la parte) */}
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
              ['cora', 'CORA'],
              ['lxp', 'LXP'],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setOrigen(id)}
              aria-pressed={origen === id}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                origen === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${origen === id ? 'text-white/70' : 'text-muted-foreground'}`}>{conteos[id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* tabla */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {(
                [
                  ['Programa', 'left'],
                  ['Origen', 'left'],
                  ['Estado', 'left'],
                  ['Módulos', 'right'],
                  ['Horas', 'right'],
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
            {visibles.map((p) => (
              <tr key={p.clave} className="border-t border-border">
                <td className="p-0">
                  <button
                    type="button"
                    onClick={() => abrir(p)}
                    disabled={abriendo}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted disabled:opacity-60 ${focusRing}`}
                  >
                    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted text-muted-foreground">
                      <GraduationCap className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold leading-snug">{p.nombre}</span>
                      <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                        {p.slug ? p.slug : `${p.horas} h${p.version ? ` · v${p.version}` : ''}`}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <ChipOrigen origen={p.origen} />
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${ESTADO[p.estado].clase}`}>
                    {ESTADO[p.estado].texto}
                  </span>
                </td>
                <td className={`${mono} px-4 py-3.5 text-right text-[13px] font-semibold ${p.modulos > 0 ? '' : 'text-muted-foreground'}`}>
                  {p.modulos || '—'}
                </td>
                <td className={`${mono} px-4 py-3.5 text-right text-[13px] font-semibold ${p.horas > 0 ? '' : 'text-muted-foreground'}`}>
                  {p.horas ? `${p.horas} h` : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-muted-foreground">
                  {p.actualizado ? haceCuanto(p.actualizado) : '—'}
                </td>
                <td className="px-3 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => abrir(p)}
                    disabled={abriendo}
                    className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-bold transition-colors disabled:opacity-60 ${
                      p.lxpProgramaId
                        ? `border border-border bg-card ${softText} hover:bg-muted`
                        : 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
                    } ${focusRing}`}
                  >
                    {p.lxpProgramaId ? (
                      <>
                        <Pencil aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
                        {p.origen === 'cora' ? 'Abrir contenido' : 'Editar'}
                      </>
                    ) : (
                      <>
                        <Hammer aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
                        {abriendo ? 'Abriendo…' : 'Construir contenido'}
                      </>
                    )}
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
                ? 'Los programas de CORA aparecen solos; crea uno nativo con “Nuevo programa”.'
                : 'Quita el filtro o cambia la búsqueda.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
