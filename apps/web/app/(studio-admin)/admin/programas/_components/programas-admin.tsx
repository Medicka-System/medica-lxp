'use client';

/**
 * Studio · Programas (vista global del admin) — CONSULTA Y SEGUIMIENTO, solo lectura.
 * El admin ve todas las plantillas vivas (§6) y cuántos grupos corren sobre cada una.
 * La autoría (course builder, versionado) vive en el Studio del diseñador; esta vista
 * no crea ni edita. Datos reales vía RLS (`lxp.programas`).
 */
import { useMemo, useState } from 'react';
import { Layers, Lock, Search } from 'lucide-react';
import { mono, softText, focusRing } from '@/components/tokens';
import { haceCuanto } from '@/lib/format';
import type { ProgramaResumen, EstadoPrograma } from '@/lib/studio/datos';

const ESTADO: Record<EstadoPrograma, { etiqueta: string; clase: string }> = {
  publicado: { etiqueta: 'Publicado', clase: 'bg-accent text-accent-foreground' },
  borrador: {
    etiqueta: 'Borrador',
    clase: 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  },
};

export function ProgramasAdmin({ programas }: { programas: ProgramaResumen[] }) {
  const [busca, setBusca] = useState('');
  const [estado, setEstado] = useState<'todos' | EstadoPrograma>('todos');

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return programas.filter(
      (p) => (estado === 'todos' || p.estado === estado) && (!q || p.nombre.toLowerCase().includes(q)),
    );
  }, [programas, busca, estado]);

  const conteos = {
    total: programas.length,
    publicados: programas.filter((p) => p.estado === 'publicado').length,
    borradores: programas.filter((p) => p.estado === 'borrador').length,
    grupos: programas.reduce((s, p) => s + p.gruposActivos, 0),
  };

  const tabs: ['todos' | EstadoPrograma, string, number][] = [
    ['todos', 'Todos', conteos.total],
    ['publicado', 'Publicados', conteos.publicados],
    ['borrador', 'Borradores', conteos.borradores],
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Programas</h1>
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-muted-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Autoría y versionado: Studio de diseño
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Las plantillas vivas del temario y cuántos grupos corren sobre cada una. Vista de consulta; el course builder vive en el Studio del diseñador.
          </p>
        </div>
      </div>

      <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ['Programas', String(conteos.total), 'plantillas de temario'],
            ['Publicados', String(conteos.publicados), 'visibles a los grupos'],
            ['Borradores', String(conteos.borradores), 'sin publicar'],
            ['Grupos activos', String(conteos.grupos), 'instancias en total'],
          ] as const
        ).map(([t, v, s]) => (
          <li key={t} className="rounded-xl border border-border bg-card p-4 shadow-rest">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t}</p>
            <p className={`${mono} mt-2.5 text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>{v}</p>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{s}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[280px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
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
          {tabs.map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setEstado(id)}
              aria-pressed={estado === id}
              className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                estado === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${estado === id ? 'text-white/70' : 'text-muted-foreground'}`}>{n}</span>
            </button>
          ))}
        </div>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {visibles.length} de {programas.length}
        </span>
      </div>

      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
          {(
            [
              ['Programa', 'flex-[1.8]'],
              ['Módulos', 'shrink-0 w-[92px] text-center'],
              ['Horas', 'shrink-0 w-[92px] text-center'],
              ['Grupos', 'shrink-0 w-[92px] text-center'],
              ['Versión', 'shrink-0 w-[90px] text-center'],
              ['Estado', 'shrink-0 w-[120px]'],
              ['Actualizado', 'shrink-0 w-[120px]'],
            ] as const
          ).map(([t, cls]) => (
            <span key={t} className={`${cls} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}>
              {t}
            </span>
          ))}
        </div>

        {visibles.length === 0 ? (
          <p className="border-t border-border px-[18px] py-8 text-center text-[12.5px] text-muted-foreground">
            No hay programas que coincidan con el filtro.
          </p>
        ) : (
          visibles.map((p) => (
            <div key={p.id} className="flex items-center gap-3.5 border-t border-border px-[18px] py-3.5">
              <span className="flex min-w-0 flex-[1.8] items-center gap-2.5">
                <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
                  <Layers className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold leading-snug">{p.nombre}</span>
              </span>

              <span className={`${mono} w-[92px] shrink-0 text-center text-[12.5px] font-bold`}>{p.modulos}</span>
              <span className={`${mono} w-[92px] shrink-0 text-center text-[12.5px] font-bold`}>{p.horas} h</span>
              <span className={`${mono} w-[92px] shrink-0 text-center text-[12.5px] font-bold`}>{p.gruposActivos}</span>
              <span className={`${mono} w-[90px] shrink-0 text-center text-[12px] text-muted-foreground`}>v{p.version}</span>

              <span className="w-[120px] shrink-0">
                <span className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[p.estado].clase}`}>
                  {ESTADO[p.estado].etiqueta}
                </span>
              </span>

              <span className={`${mono} w-[120px] shrink-0 whitespace-nowrap text-[11px] text-muted-foreground`}>
                {haceCuanto(p.actualizado)}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
